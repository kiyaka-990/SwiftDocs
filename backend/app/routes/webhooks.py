# backend/app/routes/webhooks.py
from fastapi import APIRouter, Request, HTTPException, Header
from sqlalchemy import select
import stripe
import uuid

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.models import User, Transaction

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid Stripe signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        meta = session.get("metadata", {})
        user_id = meta.get("user_id")
        credits = int(meta.get("credits", 0))
        amount  = session.get("amount_total", 0)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.id == uuid.UUID(user_id))
            )
            user = result.scalar_one_or_none()
            if user:
                user.credits += credits

                txn = Transaction(
                    user_id=user.id,
                    stripe_payment_id=session.get("payment_intent"),
                    amount_cents=amount,
                    credits_added=credits,
                    status="success",
                )
                db.add(txn)
                await db.commit()

    return {"ok": True}

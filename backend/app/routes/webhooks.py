# backend/app/routes/webhooks.py
from fastapi import APIRouter, Request, HTTPException, Header
from sqlalchemy import select, update
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
    except Exception as e:
        # If this fails, the secret in Railway is likely wrong
        raise HTTPException(400, f"Error: {str(e)}")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        meta = session.get("metadata", {})
        
        user_id_str = meta.get("user_id")
        credits_to_add = int(meta.get("credits", 0))

        if user_id_str and credits_to_add > 0:
            async with AsyncSessionLocal() as db:
                user_id = uuid.UUID(user_id_str)
                
                # 1. ATOMIC UPDATE (This is the most reliable way)
                await db.execute(
                    update(User)
                    .where(User.id == user_id)
                    .values(credits=User.credits + credits_to_add)
                )

                # 2. Record Transaction
                txn = Transaction(
                    user_id=user_id,
                    stripe_payment_id=session.get("payment_intent") or session.get("id"),
                    amount_cents=session.get("amount_total", 0),
                    credits_added=credits_to_add,
                    status="success",
                )
                db.add(txn)
                
                # 3. Force the write to DB
                await db.commit()
                print(f"💰 LOADED: {credits_to_add} credits to User {user_id_str}")

    return {"ok": True}
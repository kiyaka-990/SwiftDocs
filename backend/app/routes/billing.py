# backend/app/routes/billing.py
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import stripe
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, Transaction
from app.routes.auth import get_current_user

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY

# Credit packs (credits, price in cents, label)
CREDIT_PACKS = {
    "starter":     (10,  800,   "10 documents – $8"),
    "growth":      (50,  3500,  "50 documents – $35"),
    "pro":         (200, 12000, "200 documents – $120"),
    "team":        (999, 39900, "Unlimited month – $399"),
}

class TopupRequest(BaseModel):
    pack: str   # starter | growth | pro | unlimited
    success_url: str
    cancel_url: str


@router.get("/packs")
async def list_packs():
    return [
        {"id": k, "credits": v[0], "price_cents": v[1], "label": v[2]}
        for k, v in CREDIT_PACKS.items()
    ]


@router.post("/topup")
async def create_checkout(
    body: TopupRequest,
    user: User = Depends(get_current_user),
):
    if body.pack not in CREDIT_PACKS:
        raise HTTPException(400, f"Invalid pack. Choose: {list(CREDIT_PACKS)}")

    credits, price_cents, label = CREDIT_PACKS[body.pack]

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": price_cents,
                "product_data": {
                    "name": f"SwiftDocs — {label}",
                    "description": f"{credits} PDF document credits",
                },
            },
            "quantity": 1,
        }],
        metadata={
            "user_id":  str(user.id),
            "credits":  str(credits),
            "pack":     body.pack,
        },
        customer_email=user.email,
        success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=body.cancel_url,
    )

    # Create pending transaction
    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/credits")
async def get_credits(user: User = Depends(get_current_user)):
    return {
        "credits": user.credits,
        "user_id": str(user.id),
    }


@router.get("/history")
async def billing_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    txns = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "credits_added": t.credits_added,
            "amount_cents": t.amount_cents,
            "status": t.status,
            "created_at": t.created_at,
        }
        for t in txns
    ]

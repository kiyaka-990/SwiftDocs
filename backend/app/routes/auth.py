# backend/app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import secrets
import uuid

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_user_from_api_key,
)
from app.models.models import User, ApiKey

router = APIRouter()


def user_payload(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "name": u.name,
        "credits": u.credits,
        "credits_used": u.credits_used,
    }


def new_key() -> str:
    return f"sd_live_{secrets.token_hex(24)}"


def key_preview(key: str) -> str:
    return f"{key[:12]}...{key[-4:]}" if len(key) > 20 else key


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class ApiKeyCreate(BaseModel):
    name: str


@router.post("/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 1. Check if user exists
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create user with the NEW columns we added
    new_user = User(
        email=body.email,
        name=body.name,
        hashed_pw=hash_password(body.password),
        credits=3, # The 3 free docs
        credits_used=0 # Essential for the analytics bar
    )

    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database Error: Check if credits_used column exists")

    # 3. Create token and return nested user object for Zustand
    token = create_access_token({"sub": str(new_user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload(new_user),
    }


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_pw):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disabled")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload(user),
    }


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user_payload(user)


@router.get("/api-keys")
async def list_api_keys(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id).order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_preview": key_preview(k.key),
        }
        for k in keys
    ]


@router.post("/api-keys")
async def create_api_key(
    body: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    key = new_key()
    api_key = ApiKey(user_id=user.id, key=key, name=body.name or "Default key")
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return {
        "id": str(api_key.id),
        "name": api_key.name,
        "key": key,  # Full key shown only once, right after creation
        "key_preview": key_preview(key),
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(ApiKey).where(ApiKey.id == uuid.UUID(key_id), ApiKey.user_id == user.id)
    )
    await db.commit()
    return {"ok": True}

# backend/app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
import secrets
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, ApiKey

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── Schemas ───────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    credits: int

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    created_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise cred_exc
    except JWTError:
        raise cred_exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise cred_exc
    return user

async def get_user_from_api_key(
    api_key: str,
    db: AsyncSession,
) -> User | None:
    result = await db.execute(
        select(ApiKey).where(ApiKey.key == api_key, ApiKey.is_active == True)
    )
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        return None
    # BUG FIX 3: last_used update was never committed
    key_obj.last_used = datetime.utcnow()
    await db.commit()
    result2 = await db.execute(select(User).where(User.id == key_obj.user_id))
    return result2.scalar_one_or_none()


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=body.email,
        name=body.name,
        hashed_pw=hash_password(body.password),
        credits=settings.FREE_TIER_DOCS,
    )
    db.add(user)
    # BUG FIX 2: flush() assigns the ID but never wrote to DB — added commit()
    await db.flush()
    await db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        credits=user.credits,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_pw):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        credits=user.credits,
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "credits": user.credits,
        "created_at": user.created_at,
    }


@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    body: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_key = f"sd_live_{secrets.token_urlsafe(32)}"
    key_obj = ApiKey(
        user_id=user.id,
        key=raw_key,
        name=body.name,
    )
    db.add(key_obj)
    # BUG FIX 2 (same pattern): flush + commit so the key is actually persisted
    await db.flush()
    await db.commit()
    return ApiKeyResponse(
        id=str(key_obj.id),
        name=key_obj.name,
        key=raw_key,   # shown ONCE — not stored in plain text in prod
        created_at=key_obj.created_at,
    )


@router.get("/api-keys")
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.is_active == True)
    )
    keys = result.scalars().all()
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_preview": k.key[:12] + "••••••••",
            "last_used": k.last_used,
            "created_at": k.created_at,
        }
        for k in keys
    ]


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == uuid.UUID(key_id),
            ApiKey.user_id == user.id,
        )
    )
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(404, "API key not found")
    key_obj.is_active = False
    await db.commit()
    return {"ok": True}

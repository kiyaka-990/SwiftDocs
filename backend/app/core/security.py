# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, ApiKey

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


async def get_user_from_api_key(key: str, db: AsyncSession) -> User | None:
    """Look up the owner of an x-api-key header value."""
    result = await db.execute(
        select(User)
        .join(ApiKey, ApiKey.user_id == User.id)
        .where(ApiKey.key == key, ApiKey.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user and user.is_active:
        return user
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme != "Bearer":
        raise HTTPException(401, "Valid Bearer token required")
    try:
        payload = jwt.decode(
            credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        uid = payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
    result = await db.execute(select(User).where(User.id == uuid.UUID(uid)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found")
    return user

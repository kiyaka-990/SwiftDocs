from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.models.models import User
# Ensure these helpers are correctly imported from your utils or defined here
# from app.core.security import hash_password, create_access_token 

router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

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
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "name": new_user.name,
            "credits": new_user.credits,
            "credits_used": new_user.credits_used
        }
    }
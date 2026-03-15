# backend/app/models/models.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String, unique=True, nullable=False, index=True)
    name          = Column(String, nullable=False)
    hashed_pw     = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    credits       = Column(Integer, default=3)       # free tier: 3 docs
    stripe_id     = Column(String, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    api_keys      = relationship("ApiKey", back_populates="user")
    documents     = relationship("Document", back_populates="user")
    transactions  = relationship("Transaction", back_populates="user")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    key        = Column(String, unique=True, nullable=False, index=True)
    name       = Column(String, nullable=False)
    is_active  = Column(Boolean, default=True)
    last_used  = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="api_keys")


class Document(Base):
    __tablename__ = "documents"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    template     = Column(String, nullable=False)       # catalogue | invoice | letter ...
    file_url     = Column(String, nullable=True)        # S3 url after generation
    file_size    = Column(Integer, nullable=True)       # bytes
    status       = Column(String, default="pending")    # pending | processing | done | failed
    credits_used = Column(Integer, default=1)
    payload      = Column(Text, nullable=True)          # JSON snapshot of input
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="documents")


class Transaction(Base):
    __tablename__ = "transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    stripe_payment_id = Column(String, nullable=True)
    amount_cents     = Column(Integer, nullable=False)
    credits_added    = Column(Integer, nullable=False)
    status           = Column(String, default="pending")  # pending | success | failed
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")

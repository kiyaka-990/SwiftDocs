from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
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
    credits       = Column(Integer, default=3)
    credits_used  = Column(Integer, default=0) # Added for analytics
    stripe_id     = Column(String, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    api_keys      = relationship("ApiKey", back_populates="user")
    documents     = relationship("Document", back_populates="user")
    transactions  = relationship("Transaction", back_populates="user")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    key        = Column(String, unique=True, nullable=False, index=True)
    name       = Column(String, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="api_keys")


class Document(Base):
    __tablename__ = "documents"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    template     = Column(String, nullable=False)
    status       = Column(String, default="pending")
    payload      = Column(Text, nullable=True)
    credits_used = Column(Integer, default=1)
    file_url     = Column(String, nullable=True)
    file_size    = Column(Integer, nullable=True)
    s3_key       = Column(String, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="documents")


class Transaction(Base):
    __tablename__ = "transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    stripe_payment_id = Column(String, nullable=True)
    amount_cents     = Column(Integer, nullable=False)
    credits_added    = Column(Integer, nullable=False)
    status           = Column(String, default="success")
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")

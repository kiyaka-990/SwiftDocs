from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
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

# ... (ApiKey, Document, and Transaction models remain as you had them)
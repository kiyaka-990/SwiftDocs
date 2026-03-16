# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SwiftDocs"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost/swiftdocs"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Rust engine binary path
    ENGINE_BIN: str = "./engine/target/release/swiftdocs_engine"

    # S3 / file storage
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "swiftdocs-outputs"
    AWS_REGION: str = "us-east-1"

    # Pricing (in cents)
    PRICE_PER_DOCUMENT: int = 99        # $0.99 per doc
    FREE_TIER_DOCS: int = 3             # 3 free docs on signup

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        ]

    class Config:
        env_file = ".env"
@field_validator("ALLOWED_ORIGINS", mode="before")
@classmethod
def parse_origins(cls, v):
    if isinstance(v, str):
        import json
        return json.loads(v)
    return v


settings = Settings()

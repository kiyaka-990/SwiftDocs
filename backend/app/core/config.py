# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    APP_NAME: str = "SwiftDocs"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost/swiftdocs"
    REDIS_URL: str = "redis://localhost:6379"

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    ENGINE_BIN: str = "./engine/target/release/swiftdocs_engine"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "swiftdocs-outputs"
    AWS_REGION: str = "us-east-1"

    PRICE_PER_DOCUMENT: int = 99
    FREE_TIER_DOCS: int = 3

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://swiftdocs.up.railway.app",
        "https://swiftdocs-production.up.railway.app",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    class Config:
        env_file = ".env"


settings = Settings()

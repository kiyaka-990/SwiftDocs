# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.routes import auth, documents, billing, templates, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # shutdown
    await engine.dispose()


app = FastAPI(
    title="SwiftDocs API",
    description="Blazing-fast PDF generation powered by Rust",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/auth",      tags=["Auth"])
app.include_router(documents.router,  prefix="/api/documents", tags=["Documents"])
app.include_router(billing.router,    prefix="/api/billing",   tags=["Billing"])
app.include_router(templates.router,  prefix="/api/templates", tags=["Templates"])
app.include_router(webhooks.router,   prefix="/api/webhooks",  tags=["Webhooks"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}

# backend/app/routes/documents.py
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Any
import asyncio
import tempfile
import json
import os
import uuid
import shutil

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, Document
from app.routes.auth import get_current_user, get_user_from_api_key

router = APIRouter()

VALID_TEMPLATES = {"catalogue", "invoice", "letter", "price_schedule", "spec_sheet"}


class GenerateRequest(BaseModel):
    template: str
    payload: dict[str, Any]
    webhook_url: str | None = None


class GenerateResponse(BaseModel):
    document_id: str
    status: str
    download_url: str | None = None
    credits_remaining: int


async def get_user_flexible(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if x_api_key:
        user = await get_user_from_api_key(x_api_key, db)
        if user:
            return user
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        import uuid as _uuid
        from jose import jwt as _jwt, JWTError
        try:
            payload = _jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            uid = payload.get("sub")
            result = await db.execute(select(User).where(User.id == _uuid.UUID(uid)))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user
        except (JWTError, Exception):
            pass
    raise HTTPException(401, "Valid Bearer token or x-api-key required")


async def call_engine(template: str, payload: dict, output_path: str) -> dict:
    # Write payload to a temp file instead of passing it as a CLI string.
    # This avoids all shell quoting / BOM issues on every OS.
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as pf:
        json.dump(payload, pf, ensure_ascii=False)
        payload_file = pf.name

    try:
        cmd = [
            settings.ENGINE_BIN,
            "--template",     template,
            "--payload-file", payload_file,
            "--output",       output_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        if proc.returncode != 0:
            raise RuntimeError(f"Engine error: {stderr.decode()}")
        return json.loads(stdout.decode())
    finally:
        # Always clean up the temp payload file
        try:
            os.unlink(payload_file)
        except OSError:
            pass


async def generate_task(doc_id: str, template: str, payload: dict):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == uuid.UUID(doc_id)))
        doc = result.scalar_one_or_none()
        if not doc:
            return
        try:
            doc.status = "processing"
            await db.commit()
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp_path = tmp.name
            engine_result = await call_engine(template, payload, tmp_path)
            local_dir = "/app/outputs"
            os.makedirs(local_dir, exist_ok=True)
            local_file = f"{local_dir}/{doc_id}.pdf"
            shutil.copy(tmp_path, local_file)
            os.unlink(tmp_path)
            doc.status = "done"
            doc.file_url = f"/documents/{doc_id}/download"
            doc.file_size = engine_result.get("bytes", 0)
            await db.commit()
        except Exception as e:
            doc.status = "failed"
            await db.commit()
            print(f"[generate_task] failed doc {doc_id}: {e}", flush=True)


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    if body.template not in VALID_TEMPLATES:
        raise HTTPException(400, f"Unknown template. Valid: {VALID_TEMPLATES}")
    if user.credits < 1:
        raise HTTPException(402, "Insufficient credits")
    user.credits -= 1
    doc = Document(
        user_id=user.id,
        template=body.template,
        status="pending",
        payload=json.dumps(body.payload),
        credits_used=1,
    )
    db.add(doc)
    await db.flush()
    doc_id = str(doc.id)
    await db.commit()
    background_tasks.add_task(generate_task, doc_id, body.template, body.payload)
    return GenerateResponse(
        document_id=doc_id,
        status="pending",
        download_url=None,
        credits_remaining=user.credits,
    )


@router.get("/{doc_id}/download")
async def download(
    doc_id: str,
    user: User = Depends(get_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == uuid.UUID(doc_id),
            Document.user_id == user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    path = f"/app/outputs/{doc_id}.pdf"
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")
    return FileResponse(path, media_type="application/pdf", filename=f"{doc.template}-{doc_id[:8]}.pdf")


@router.get("/{doc_id}/status")
async def get_status(
    doc_id: str,
    user: User = Depends(get_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == uuid.UUID(doc_id),
            Document.user_id == user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    return {
        "document_id": doc_id,
        "status": doc.status,
        "download_url": doc.file_url,
        "file_size": doc.file_size,
        "created_at": doc.created_at,
    }


@router.get("/")
async def list_documents(
    user: User = Depends(get_user_flexible),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user.id)
        .order_by(desc(Document.created_at))
        .limit(limit)
        .offset(offset)
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "template": d.template,
            "status": d.status,
            "download_url": d.file_url,
            "file_size": d.file_size,
            "created_at": d.created_at,
        }
        for d in docs
    ]

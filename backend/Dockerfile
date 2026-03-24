# ── Stage 1: Build Rust engine ────────────────────────────────────────────────
FROM rust:slim-bookworm AS engine-builder
WORKDIR /engine
RUN apt-get update && apt-get install -y pkg-config libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
COPY engine/Cargo.toml engine/Cargo.lock* ./
COPY engine/src ./src
# Pre-fetch dependencies in a separate layer for caching
RUN mkdir src_tmp && echo 'fn main(){}' > src_tmp/main.rs && \
    cp -r src_tmp src_real && \
    cargo fetch && \
    rm -rf src_tmp src_real
RUN cargo build --release

# ── Stage 2: Python backend ───────────────────────────────────────────────────
FROM python:3.12-slim-bookworm
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=engine-builder /engine/target/release/swiftdocs_engine /app/engine/swiftdocs_engine
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

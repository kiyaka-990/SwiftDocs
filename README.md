# ⚡ SwiftDocs

> Blazing-fast PDF generation API powered by Rust.
> Pay-per-document SaaS — invoices, catalogues, letters, spec sheets.

---

## Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | Next.js 14 + Tailwind CSS   |
| Backend  | FastAPI + SQLAlchemy async  |
| Engine   | **Rust** (printpdf crate)   |
| Database | PostgreSQL 16               |
| Cache    | Redis 7                     |
| Payments | Stripe Checkout             |
| Storage  | AWS S3                      |

---

## Quick Start (local dev)

### 1. Build the Rust engine

```bash
cd engine
cargo build --release
# Binary at: engine/target/release/swiftdocs_engine
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in STRIPE keys and AWS creds
```

### 3. Run everything with Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- API:      http://localhost:8000
- API docs: http://localhost:8000/docs   ← Swagger UI

---

## API Usage

### Authenticate

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","name":"Jane","password":"secret123"}'

# Returns: { "access_token": "...", "credits": 3 }
```

### Generate a PDF

```bash
curl -X POST http://localhost:8000/api/documents/generate \
  -H "x-api-key: sd_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "invoice",
    "payload": {
      "invoice_number": "INV-001",
      "date": "14 March 2025",
      "due_date": "28 March 2025",
      "from_name": "Dulax Enterprises Ltd",
      "from_address": ["P.O. Box 53022", "Nairobi, Kenya"],
      "to_name": "Acme Corp",
      "to_address": ["P.O. Box 1234", "Nairobi, Kenya"],
      "currency": "KES",
      "tax_rate": 0.16,
      "items": [
        { "description": "MacBook Pro M4 Pro", "qty": 2, "unit_price": 419000 },
        { "description": "HP Laptop Core Ultra 7", "qty": 4, "unit_price": 314000 }
      ],
      "notes": "Payment within 14 days of LPO."
    }
  }'

# Returns: { "document_id": "...", "status": "pending", "credits_remaining": 2 }
```

### Poll for result

```bash
curl http://localhost:8000/api/documents/{document_id}/status \
  -H "x-api-key: sd_live_your_key_here"

# Returns: { "status": "done", "download_url": "https://s3.amazonaws.com/..." }
```

---

## Templates

| ID              | Description                    | Credits |
|-----------------|--------------------------------|---------|
| `catalogue`     | Product catalogue / spec sheet | 1       |
| `invoice`       | Invoice with VAT calculation   | 1       |
| `letter`        | Business letter                | 1       |
| `spec_sheet`    | Technical spec sheet           | 1       |
| `price_schedule`| Tender price schedule          | 1       |

---

## Pricing Model

| Pack       | Credits | Price  | $/doc  |
|------------|---------|--------|--------|
| Starter    | 10      | $8     | $0.80  |
| Growth     | 50      | $35    | $0.70  |
| Pro        | 200     | $120   | $0.60  |
| Unlimited  | ∞/month | $399   | —      |

Free tier: **3 documents** on signup, no card required.

---

## Deployment (production)

### Render.com (cheapest, easy)
1. Push to GitHub
2. Create Web Service → connect repo → set env vars
3. Rust engine: build command = `cargo build --release`
4. Backend: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Frontend: `npm run build && npm start`

### Railway.app (one-click)
Use the `docker-compose.yml` — Railway auto-detects it.

### VPS (DigitalOcean / Hetzner)
```bash
git clone your-repo
cd swiftdocs
cp .env.example .env  # fill in
docker-compose up -d
# Setup nginx reverse proxy + SSL with certbot
```

---

## Project Structure

```
swiftdocs/
├── engine/                  # Rust PDF engine (the speed moat)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs          # CLI entry point
│       ├── pdf.rs           # PDF primitives
│       ├── types.rs         # Shared types
│       └── templates/
│           ├── catalogue.rs
│           ├── invoice.rs
│           ├── letter.rs
│           └── ...
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/            # config, database
│   │   ├── models/          # SQLAlchemy models
│   │   └── routes/          # auth, documents, billing, webhooks
│   └── Dockerfile
├── frontend/                # Next.js 14
│   ├── src/app/             # App router pages
│   ├── src/lib/             # API client, Zustand store
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Monetisation checklist

- [x] Stripe Checkout (one-time credit packs)
- [x] Stripe Webhook (auto-credit on payment)
- [x] Free tier (3 docs → convert to paid)
- [x] API key auth (devs can integrate)
- [x] Credit deduction on each generate
- [ ] Stripe subscription (monthly unlimited) — add later
- [ ] Usage analytics dashboard — add later
- [ ] Team accounts / shared credits — add later

---

Built with ❤️ and Rust. Ship it. 🚀

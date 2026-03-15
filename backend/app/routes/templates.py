# backend/app/routes/templates.py
from fastapi import APIRouter

router = APIRouter()

TEMPLATES = {
    "catalogue": {
        "name": "Product Catalogue",
        "description": "Professional product spec sheet with hero section, pillars, and spec table",
        "credits": 1,
        "schema": {
            "brand":        "string",
            "brand_color":  {"r": "int", "g": "int", "b": "int"},
            "product":      "string",
            "subtitle":     "string",
            "tagline":      "string",
            "pillars":      [{"value": "string", "label": "string"}],
            "sections":     [{
                "title": "string",
                "rows":  [{"label": "string", "value": "string", "highlight": "bool"}],
            }],
            "footer_text":  "string",
            "website":      "string",
            "copyright":    "string",
        },
        "example": {
            "brand": "Apple",
            "brand_color": {"r": 0, "g": 113, "b": 227},
            "product": "MacBook Pro M4",
            "subtitle": "14-inch · 2025",
            "tagline": "The most powerful MacBook Pro ever.",
            "pillars": [
                {"value": "12-Core", "label": "CPU"},
                {"value": "20-Core", "label": "GPU"},
                {"value": "24 GB",   "label": "Memory"},
            ],
            "sections": [
                {
                    "title": "Processor",
                    "rows": [
                        {"label": "Chip",          "value": "Apple M4 Pro",    "highlight": True},
                        {"label": "CPU Cores",     "value": "12-core",         "highlight": False},
                        {"label": "GPU Cores",     "value": "20-core",         "highlight": True},
                        {"label": "Neural Engine", "value": "16-core",         "highlight": False},
                    ],
                },
            ],
            "footer_text": "MacBook Pro M4 Pro",
            "website":     "apple.com/macbook-pro",
            "copyright":   "© 2025 Apple Inc.",
        },
    },
    "invoice": {
        "name": "Invoice",
        "description": "Professional invoice with line items, VAT calculation and totals",
        "credits": 1,
        "schema": {
            "invoice_number": "string",
            "date":           "string",
            "due_date":       "string",
            "from_name":      "string",
            "from_address":   ["string"],
            "to_name":        "string",
            "to_address":     ["string"],
            "currency":       "string (e.g. KES, USD)",
            "tax_rate":       "float (e.g. 0.16 for 16%)",
            "items": [{"description": "string", "qty": "int", "unit_price": "float"}],
            "notes":          "string (optional)",
        },
        "example": {
            "invoice_number": "INV-0042",
            "date":           "14 March 2025",
            "due_date":       "28 March 2025",
            "from_name":      "Dulax Enterprises Ltd",
            "from_address":   ["P.O. Box 53022 – 00100", "Nairobi, Kenya"],
            "to_name":        "Nairobi City County Government",
            "to_address":     ["P.O. Box 30075 – 00100", "Nairobi, Kenya"],
            "currency":       "KES",
            "tax_rate":       0.16,
            "items": [
                {"description": "MacBook Pro M4 Pro",    "qty": 2, "unit_price": 419000},
                {"description": "HP Laptop Core Ultra 7","qty": 4, "unit_price": 314000},
            ],
            "notes": "Payment within 14 days of LPO issuance.",
        },
    },
    "letter": {
        "name": "Business Letter",
        "description": "Formal business letter on company letterhead",
        "credits": 1,
        "schema": {
            "date":         "string",
            "from_name":    "string",
            "from_address": ["string"],
            "to_name":      "string",
            "to_address":   ["string"],
            "subject":      "string",
            "body":         ["string (paragraphs)"],
            "signatory":    "string",
            "designation":  "string",
            "company":      "string",
        },
    },
    "spec_sheet": {
        "name": "Spec Sheet",
        "description": "Clean technical specification sheet (catalogue without hero image)",
        "credits": 1,
        "schema": "Same as catalogue",
    },
    "price_schedule": {
        "name": "Price Schedule",
        "description": "Tender price schedule table (Kenya PPIP format)",
        "credits": 1,
        "schema": "Coming soon",
    },
}


@router.get("/")
async def list_templates():
    return [
        {
            "id":          tid,
            "name":        t["name"],
            "description": t["description"],
            "credits":     t["credits"],
        }
        for tid, t in TEMPLATES.items()
    ]


@router.get("/{template_id}")
async def get_template(template_id: str):
    if template_id not in TEMPLATES:
        from fastapi import HTTPException
        raise HTTPException(404, "Template not found")
    return {"id": template_id, **TEMPLATES[template_id]}

// swiftdocs_engine/src/types.rs
#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Color {
    pub const BLACK: Self = Self {
        r: 29,
        g: 29,
        b: 31,
    };
    pub const WHITE: Self = Self {
        r: 255,
        g: 255,
        b: 255,
    };
    pub const BLUE: Self = Self {
        r: 0,
        g: 113,
        b: 227,
    };
    pub const GRAY: Self = Self {
        r: 110,
        g: 110,
        b: 115,
    };
    pub const SILVER: Self = Self {
        r: 245,
        g: 245,
        b: 247,
    };
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TextStyle {
    pub font_size: f32,
    pub bold: bool,
    pub color: Color,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpecRow {
    pub label: String,
    pub value: String,
    pub highlight: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Section {
    pub title: String,
    pub rows: Vec<SpecRow>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HeroPillar {
    pub value: String,
    pub label: String,
}

// ── Template payloads ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct CataloguePayload {
    pub brand: String,
    pub brand_color: Color,
    pub product: String,
    pub subtitle: String,
    pub tagline: String,
    pub pillars: Vec<HeroPillar>,
    pub sections: Vec<Section>,
    pub footer_text: String,
    pub website: String,
    pub copyright: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub description: String,
    pub qty: u32,
    pub unit_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoicePayload {
    pub invoice_number: String,
    pub date: String,
    pub due_date: String,
    pub from_name: String,
    pub from_address: Vec<String>,
    pub to_name: String,
    pub to_address: Vec<String>,
    pub items: Vec<InvoiceItem>,
    pub currency: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LetterPayload {
    pub date: String,
    pub from_name: String,
    pub from_address: Vec<String>,
    pub to_name: String,
    pub to_address: Vec<String>,
    pub subject: String,
    pub body: Vec<String>,
    pub signatory: String,
    pub designation: String,
    pub company: String,
}

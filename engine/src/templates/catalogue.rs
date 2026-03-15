// swiftdocs_engine/src/templates/catalogue.rs
use anyhow::Result;
use printpdf::*;
use serde_json::Value;
use crate::pdf::*;

pub fn render(payload: &Value) -> Result<Vec<u8>> {
    let brand       = payload["brand"].as_str().unwrap_or("Brand");
    let product     = payload["product"].as_str().unwrap_or("Product");
    let subtitle    = payload["subtitle"].as_str().unwrap_or("");
    let tagline     = payload["tagline"].as_str().unwrap_or("");
    let footer_text = payload["footer_text"].as_str().unwrap_or("");
    let website     = payload["website"].as_str().unwrap_or("");
    let copyright   = payload["copyright"].as_str().unwrap_or("");

    // Hero brand colour from payload or default blue
    let hr = payload["brand_color"]["r"].as_u64().unwrap_or(0)   as u8;
    let hg = payload["brand_color"]["g"].as_u64().unwrap_or(113) as u8;
    let hb = payload["brand_color"]["b"].as_u64().unwrap_or(227) as u8;

    let (doc, page1, layer1) = new_a4(&format!("{product} — SwiftDocs"));
    let layer = doc.get_page(page1).get_layer(layer1);

    let font_regular = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold    = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

    // ── Background ────────────────────────────────────────────────────────────
    fill_rect(&layer, 0.0, 0.0, A4_W, A4_H, 245, 245, 247);

    // ── Hero band ─────────────────────────────────────────────────────────────
    let hero_h = 85.0;
    fill_rect(&layer, 0.0, A4_H - hero_h, A4_W, hero_h, 29, 29, 31);

    // Brand colour accent bar at very top
    fill_rect(&layer, 0.0, A4_H - 3.0, A4_W, 3.0, hr, hg, hb);

    // Brand name
    draw_text(&layer, &font_bold, brand, 8.0, A4_H - 14.0, 10.0, 160, 160, 165);

    // Product title
    draw_text(&layer, &font_bold, product, 8.0, A4_H - 32.0, 24.0, 255, 255, 255);

    // Subtitle
    draw_text(&layer, &font_regular, subtitle, 8.0, A4_H - 42.0, 10.0, hr, hg, hb);

    // Tagline
    draw_text(&layer, &font_regular, tagline, 8.0, A4_H - 52.0, 8.0, 100, 100, 108);

    // ── 3-pillar specs in hero ────────────────────────────────────────────────
    let pillars_y_val = A4_H - hero_h + 12.0;
    let pillars_y_lbl = A4_H - hero_h + 5.0;
    let col_xs = [A4_W * 0.18, A4_W * 0.50, A4_W * 0.82];

    if let Some(pillars) = payload["pillars"].as_array() {
        for (i, pillar) in pillars.iter().enumerate().take(3) {
            let cx = col_xs[i];
            let val = pillar["value"].as_str().unwrap_or("");
            let lbl = pillar["label"].as_str().unwrap_or("");
            let val_x = cx - (val.len() as f64 * 2.8_f64);
            let lbl_x = cx - (lbl.len() as f64 * 1.5_f64);
            draw_text(&layer, &font_bold, val, val_x, pillars_y_val, 12.0, 255, 255, 255);
            draw_text(&layer, &font_regular, lbl, lbl_x, pillars_y_lbl, 6.0, 160, 168, 176);
        }
    }

    // Dividers between pillars
    h_rule(&layer, A4_W * 0.34, pillars_y_lbl, 0.0, 0.3, 42, 42, 48);
    h_rule(&layer, A4_W * 0.66, pillars_y_lbl, 0.0, 0.3, 42, 42, 48);

    // ── Spec sections ─────────────────────────────────────────────────────────
    let mut y = A4_H - hero_h - 8.0;
    let row_h = 6.5;

    if let Some(sections) = payload["sections"].as_array() {
        for section in sections {
            let title = section["title"].as_str().unwrap_or("Section");

            // Section header
            y -= 2.0;
            draw_text(&layer, &font_bold, title, 8.0, y, 8.0, 29, 29, 31);
            y -= 1.5;
            h_rule(&layer, 8.0, y, A4_W - 16.0, 0.5, hr, hg, hb);
            y -= row_h;

            if let Some(rows) = section["rows"].as_array() {
                for (ri, row) in rows.iter().enumerate() {
                    let label = row["label"].as_str().unwrap_or("");
                    let value = row["value"].as_str().unwrap_or("");
                    let hi    = row["highlight"].as_bool().unwrap_or(ri % 2 == 0);

                    if hi {
                        fill_rect(&layer, 7.0, y - 1.5, A4_W - 14.0, row_h, 234, 242, 252);
                    }

                    draw_text(&layer, &font_regular, label, 10.0, y + 1.5, 7.0, 110, 110, 115);

                    // Right-align value (approximate)
                    let vx = A4_W - 10.0 - (value.len() as f64 * 2.1);
                    draw_text(&layer, &font_bold, value, vx, y + 1.5, 7.0, 46, 46, 51);

                    // Row divider
                    h_rule(&layer, 8.0, y - 1.5, A4_W - 16.0, 0.2, 210, 210, 215);

                    y -= row_h;

                    if y < 18.0 { break; } // guard against overflow
                }
            }
            y -= 3.0;
            if y < 18.0 { break; }
        }
    }

    // ── Footer bar ────────────────────────────────────────────────────────────
    fill_rect(&layer, 0.0, 0.0, A4_W, 12.0, 29, 29, 31);
    // Accent top edge of footer
    fill_rect(&layer, 0.0, 11.5, A4_W, 0.8, hr, hg, hb);
    // Bottom stripe
    fill_rect(&layer, 0.0, 0.0, A4_W, 0.8, hr, hg, hb);

    draw_text(&layer, &font_bold, footer_text, 8.0, 4.0, 6.0, 255, 255, 255);
    let wlen = website.len() as f64 * 1.5;
    draw_text(&layer, &font_regular, website, A4_W / 2.0 - wlen, 4.0, 5.5, 128, 144, 176);
    let clen = copyright.len() as f64 * 1.3;
    draw_text(&layer, &font_regular, copyright, A4_W - 8.0 - clen, 4.0, 5.0, 80, 88, 104);

    // Serialise to bytes
    let mut buf = std::io::BufWriter::new(Vec::new());
    doc.save(&mut buf)?;
    Ok(buf.into_inner().unwrap())
}

// swiftdocs_engine/src/templates/invoice.rs
use anyhow::Result;
use printpdf::*;
use serde_json::Value;
use crate::pdf::*;

pub fn render(payload: &Value) -> Result<Vec<u8>> {
    let invoice_no  = payload["invoice_number"].as_str().unwrap_or("INV-001");
    let date        = payload["date"].as_str().unwrap_or("");
    let due_date    = payload["due_date"].as_str().unwrap_or("");
    let from_name   = payload["from_name"].as_str().unwrap_or("");
    let to_name     = payload["to_name"].as_str().unwrap_or("");
    let currency    = payload["currency"].as_str().unwrap_or("USD");

    let (doc, page1, layer1) = new_a4(&format!("Invoice {invoice_no} — SwiftDocs"));
    let layer = doc.get_page(page1).get_layer(layer1);

    let font_regular = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold    = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

    // White background
    fill_rect(&layer, 0.0, 0.0, A4_W, A4_H, 255, 255, 255);

    // Top accent bar
    fill_rect(&layer, 0.0, A4_H - 2.5, A4_W, 2.5, 0, 113, 227);

    // ── Header ────────────────────────────────────────────────────────────────
    draw_text(&layer, &font_bold, "INVOICE", 8.0, A4_H - 18.0, 20.0, 29, 29, 31);
    draw_text(&layer, &font_regular, &format!("#{invoice_no}"), 8.0, A4_H - 26.0, 9.0, 110, 110, 115);

    // Date / due date (right side)
    draw_text(&layer, &font_regular, "Date:",     A4_W - 55.0, A4_H - 16.0, 8.0, 110, 110, 115);
    draw_text(&layer, &font_bold,    date,         A4_W - 36.0, A4_H - 16.0, 8.0, 29, 29, 31);
    draw_text(&layer, &font_regular, "Due:",      A4_W - 55.0, A4_H - 23.0, 8.0, 110, 110, 115);
    draw_text(&layer, &font_bold,    due_date,     A4_W - 36.0, A4_H - 23.0, 8.0, 29, 29, 31);

    // Divider
    h_rule(&layer, 8.0, A4_H - 32.0, A4_W - 16.0, 0.5, 210, 210, 215);

    // ── From / To ─────────────────────────────────────────────────────────────
    draw_text(&layer, &font_bold, "FROM", 8.0, A4_H - 40.0, 7.0, 110, 110, 115);
    draw_text(&layer, &font_bold, from_name, 8.0, A4_H - 47.0, 9.0, 29, 29, 31);

    let mut fy = A4_H - 54.0;
    if let Some(addrs) = payload["from_address"].as_array() {
        for addr in addrs {
            draw_text(&layer, &font_regular, addr.as_str().unwrap_or(""), 8.0, fy, 8.0, 110, 110, 115);
            fy -= 6.0;
        }
    }

    draw_text(&layer, &font_bold, "BILL TO", A4_W / 2.0, A4_H - 40.0, 7.0, 110, 110, 115);
    draw_text(&layer, &font_bold, to_name, A4_W / 2.0, A4_H - 47.0, 9.0, 29, 29, 31);
    let mut ty = A4_H - 54.0;
    if let Some(addrs) = payload["to_address"].as_array() {
        for addr in addrs {
            draw_text(&layer, &font_regular, addr.as_str().unwrap_or(""), A4_W / 2.0, ty, 8.0, 110, 110, 115);
            ty -= 6.0;
        }
    }

    // ── Items table ───────────────────────────────────────────────────────────
    let table_y = A4_H - 85.0;

    // Table header background
    fill_rect(&layer, 8.0, table_y - 1.0, A4_W - 16.0, 8.0, 29, 29, 31);
    draw_text(&layer, &font_bold, "DESCRIPTION", 12.0, table_y + 1.5, 7.0, 255, 255, 255);
    draw_text(&layer, &font_bold, "QTY",    A4_W * 0.62, table_y + 1.5, 7.0, 255, 255, 255);
    draw_text(&layer, &font_bold, "UNIT PRICE", A4_W * 0.72, table_y + 1.5, 7.0, 255, 255, 255);
    draw_text(&layer, &font_bold, "TOTAL",  A4_W - 28.0, table_y + 1.5, 7.0, 255, 255, 255);

    let mut row_y = table_y - 8.0;
    let mut subtotal = 0.0f64;

    if let Some(items) = payload["items"].as_array() {
        for (i, item) in items.iter().enumerate() {
            let desc       = item["description"].as_str().unwrap_or("");
            let qty        = item["qty"].as_u64().unwrap_or(1);
            let unit_price = item["unit_price"].as_f64().unwrap_or(0.0);
            let line_total = qty as f64 * unit_price;
            subtotal += line_total;

            if i % 2 == 0 {
                fill_rect(&layer, 8.0, row_y - 1.5, A4_W - 16.0, 7.5, 248, 249, 252);
            }

            draw_text(&layer, &font_regular, desc, 12.0, row_y + 1.0, 8.0, 29, 29, 31);
            draw_text(&layer, &font_regular, &qty.to_string(), A4_W * 0.64, row_y + 1.0, 8.0, 29, 29, 31);
            draw_text(&layer, &font_regular,
                &format!("{currency} {unit_price:.2}"), A4_W * 0.72, row_y + 1.0, 8.0, 29, 29, 31);
            draw_text(&layer, &font_bold,
                &format!("{currency} {line_total:.2}"), A4_W - 40.0, row_y + 1.0, 8.0, 29, 29, 31);

            h_rule(&layer, 8.0, row_y - 1.5, A4_W - 16.0, 0.2, 210, 210, 215);
            row_y -= 8.0;

            if row_y < 60.0 { break; }
        }
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    let totals_x = A4_W * 0.60;
    let mut ty2 = row_y - 6.0;

    draw_text(&layer, &font_regular, "Subtotal:", totals_x, ty2, 8.0, 110, 110, 115);
    draw_text(&layer, &font_bold, &format!("{currency} {subtotal:.2}"), A4_W - 38.0, ty2, 8.0, 29, 29, 31);
    ty2 -= 7.0;

    let tax_rate = payload["tax_rate"].as_f64().unwrap_or(0.16);
    let tax = subtotal * tax_rate;
    draw_text(&layer, &font_regular, &format!("VAT ({:.0}%):", tax_rate * 100.0), totals_x, ty2, 8.0, 110, 110, 115);
    draw_text(&layer, &font_bold, &format!("{currency} {tax:.2}"), A4_W - 38.0, ty2, 8.0, 29, 29, 31);
    ty2 -= 2.0;

    h_rule(&layer, totals_x, ty2, A4_W - totals_x - 8.0, 0.5, 0, 113, 227);
    ty2 -= 6.0;

    let total = subtotal + tax;
    fill_rect(&layer, totals_x - 2.0, ty2 - 2.0, A4_W - totals_x - 4.0, 9.0, 0, 113, 227);
    draw_text(&layer, &font_bold, "TOTAL DUE:", totals_x, ty2 + 1.5, 8.0, 255, 255, 255);
    draw_text(&layer, &font_bold, &format!("{currency} {total:.2}"), A4_W - 42.0, ty2 + 1.5, 9.0, 255, 255, 255);

    // ── Notes ─────────────────────────────────────────────────────────────────
    if let Some(notes) = payload["notes"].as_str() {
        let note_y = ty2 - 20.0;
        draw_text(&layer, &font_bold, "Notes:", 8.0, note_y, 7.0, 110, 110, 115);
        draw_text(&layer, &font_regular, notes, 8.0, note_y - 6.0, 7.5, 80, 80, 85);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    fill_rect(&layer, 0.0, 0.0, A4_W, 10.0, 29, 29, 31);
    fill_rect(&layer, 0.0, 9.5, A4_W, 0.8, 0, 113, 227);
    draw_text(&layer, &font_regular, "Generated by SwiftDocs  ·  swiftdocs.io",
              8.0, 3.0, 6.0, 128, 128, 135);

    let mut buf = std::io::BufWriter::new(Vec::new());
    doc.save(&mut buf)?;
    Ok(buf.into_inner().unwrap())
}

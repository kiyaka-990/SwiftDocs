// swiftdocs_engine/src/pdf.rs
#![allow(dead_code)]

use printpdf::*;

pub const A4_W: f64 = 210.0;
pub const A4_H: f64 = 297.0;

pub fn new_a4(title: &str) -> (PdfDocumentReference, PdfPageIndex, PdfLayerIndex) {
    PdfDocument::new(title, Mm(A4_W), Mm(A4_H), "Layer 1")
}

fn rgb(r: u8, g: u8, b: u8) -> Color {
    Color::Rgb(Rgb::new(
        r as f64 / 255.0,
        g as f64 / 255.0,
        b as f64 / 255.0,
        None,
    ))
}

pub fn fill_rect(layer: &PdfLayerReference, x: f64, y: f64, w: f64, h: f64, r: u8, g: u8, b: u8) {
    layer.set_fill_color(rgb(r, g, b));
    layer.set_outline_color(rgb(r, g, b));
    layer.set_outline_thickness(0.0_f64);
    let line = Line {
        points: vec![
            (Point::new(Mm(x), Mm(y)), false),
            (Point::new(Mm(x + w), Mm(y)), false),
            (Point::new(Mm(x + w), Mm(y + h)), false),
            (Point::new(Mm(x), Mm(y + h)), false),
        ],
        is_closed: true,
        has_fill: true,
        has_stroke: false,
        is_clipping_path: false,
    };
    layer.add_shape(line);
}

pub fn draw_text(
    layer: &PdfLayerReference,
    font: &IndirectFontRef,
    text: &str,
    x: f64,
    y: f64,
    size: f64,
    r: u8,
    g: u8,
    b: u8,
) {
    layer.set_fill_color(rgb(r, g, b));
    layer.use_text(text, size, Mm(x), Mm(y), font);
}

pub fn h_rule(
    layer: &PdfLayerReference,
    x: f64,
    y: f64,
    w: f64,
    thickness: f64,
    r: u8,
    g: u8,
    b: u8,
) {
    layer.set_outline_color(rgb(r, g, b));
    layer.set_outline_thickness(thickness);
    let line = Line {
        points: vec![
            (Point::new(Mm(x), Mm(y)), false),
            (Point::new(Mm(x + w), Mm(y)), false),
        ],
        is_closed: false,
        has_fill: false,
        has_stroke: true,
        is_clipping_path: false,
    };
    layer.add_shape(line);
}

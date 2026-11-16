// swiftdocs_engine/src/main.rs
// SwiftDocs PDF engine — two modes:
//
// 1. CLI (subprocess) — FastAPI calls this locally / in Docker:
//      swiftdocs_engine --template catalogue --payload '{"..."}' --output /tmp/out.pdf
//    or via file (avoids shell quoting issues on Windows):
//      swiftdocs_engine --template catalogue --payload-file payload.json --output /tmp/out.pdf
//
// 2. HTTP server (service mode) — used when deployed as a Vercel container service:
//      swiftdocs_engine serve
//    Listens on $PORT (default 8080). Exposes:
//      GET  /health            -> {"ok":true}
//      POST /render            -> PDF bytes (application/pdf)
//         body: {"template": "invoice", "payload": {...}}
//         On success returns the PDF with an "X-Engine-Bytes" header.
//         On failure returns a JSON error with a 4xx/5xx status.

mod pdf;
mod templates;
mod types;

use anyhow::Result;
use axum::body::Bytes;
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use clap::Parser;
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::net::SocketAddr;

#[derive(Parser)]
#[command(name = "swiftdocs_engine", about = "SwiftDocs blazing-fast PDF engine")]
struct Cli {
    /// Template name: catalogue | invoice | letter | price_schedule | spec_sheet
    #[arg(short, long)]
    template: String,

    /// JSON payload string (use --payload-file on Windows to avoid quoting issues)
    #[arg(long)]
    payload: Option<String>,

    /// Path to a JSON file containing the payload (alternative to --payload)
    #[arg(long)]
    payload_file: Option<String>,

    /// Output file path
    #[arg(short, long)]
    output: String,
}

/// Render a template by name. Shared by the CLI and HTTP modes.
fn render_template(template: &str, payload: &Value) -> Result<Vec<u8>> {
    match template {
        "catalogue"      => templates::catalogue::render(payload),
        "invoice"        => templates::invoice::render(payload),
        "letter"         => templates::letter::render(payload),
        "price_schedule" => templates::price_schedule::render(payload),
        "spec_sheet"     => templates::spec_sheet::render(payload),
        other => anyhow::bail!("Unknown template: {other}"),
    }
}

fn cli_main() -> Result<()> {
    let cli = Cli::parse();

    let raw = match (&cli.payload, &cli.payload_file) {
        (Some(s), _) => s.clone(),
        (None, Some(path)) => fs::read_to_string(path)
            .map_err(|e| anyhow::anyhow!("Could not read payload file '{path}': {e}"))?,
        (None, None) => anyhow::bail!("Either --payload or --payload-file is required"),
    };

    let payload: Value = serde_json::from_str(&raw)
        .map_err(|e| anyhow::anyhow!("Invalid payload JSON: {e}"))?;

    let pdf_bytes = render_template(&cli.template, &payload)?;

    fs::write(&cli.output, &pdf_bytes)?;

    // Print JSON result to stdout for FastAPI to read
    println!("{}", serde_json::json!({
        "ok": true,
        "output": cli.output,
        "bytes": pdf_bytes.len(),
    }));

    Ok(())
}

#[derive(Deserialize)]
struct RenderRequest {
    template: String,
    payload: Value,
}

async fn health() -> Json<Value> {
    Json(json!({ "ok": true }))
}

async fn render(Json(body): Json<RenderRequest>) -> Response {
    match render_template(&body.template, &body.payload) {
        Ok(pdf_bytes) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "application/pdf"),
                (header::CACHE_CONTROL, "no-store"),
                (
                    header::HeaderName::from_static("x-engine-bytes"),
                    header::HeaderValue::from_str(&pdf_bytes.len().to_string())
                        .unwrap_or(header::HeaderValue::from_static("0")),
                ),
            ],
            Bytes::from(pdf_bytes),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn serve() -> Result<()> {
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let app = Router::new()
        .route("/health", get(health))
        .route("/render", post(render));

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("swiftdocs_engine serving on {addr}");
    axum::serve(listener, app).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    // `swiftdocs_engine serve` (or no arguments) starts the HTTP service.
    let args: Vec<String> = std::env::args().collect();
    if args.len() <= 1 || args[1] == "serve" {
        serve().await
    } else {
        cli_main()
    }
}

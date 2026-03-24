// swiftdocs_engine/src/main.rs
// CLI wrapper — FastAPI calls this as a subprocess:
//   swiftdocs_engine --template catalogue --payload '{"..."}' --output /tmp/out.pdf
// OR via file (avoids shell quoting issues on Windows):
//   swiftdocs_engine --template catalogue --payload-file payload.json --output /tmp/out.pdf

mod pdf;
mod templates;
mod types;

use anyhow::Result;
use clap::Parser;
use std::fs;

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

fn main() -> Result<()> {
    let cli = Cli::parse();

    let raw = match (&cli.payload, &cli.payload_file) {
        (Some(s), _) => s.clone(),
        (None, Some(path)) => fs::read_to_string(path)
            .map_err(|e| anyhow::anyhow!("Could not read payload file '{path}': {e}"))?,
        (None, None) => anyhow::bail!("Either --payload or --payload-file is required"),
    };

    let payload: serde_json::Value = serde_json::from_str(&raw)
        .map_err(|e| anyhow::anyhow!("Invalid payload JSON: {e}"))?;

    let pdf_bytes = match cli.template.as_str() {
        "catalogue"      => templates::catalogue::render(&payload)?,
        "invoice"        => templates::invoice::render(&payload)?,
        "letter"         => templates::letter::render(&payload)?,
        "price_schedule" => templates::price_schedule::render(&payload)?,
        "spec_sheet"     => templates::spec_sheet::render(&payload)?,
        other => anyhow::bail!("Unknown template: {other}"),
    };

    fs::write(&cli.output, &pdf_bytes)?;

    // Print JSON result to stdout for FastAPI to read
    println!("{}", serde_json::json!({
        "ok": true,
        "output": cli.output,
        "bytes": pdf_bytes.len(),
    }));

    Ok(())
}

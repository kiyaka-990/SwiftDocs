// swiftdocs_engine/src/templates/spec_sheet.rs
use anyhow::Result;
use serde_json::Value;
pub fn render(payload: &Value) -> Result<Vec<u8>> {
    // Spec sheet is catalogue without hero image — reuse catalogue renderer
    super::catalogue::render(payload)
}

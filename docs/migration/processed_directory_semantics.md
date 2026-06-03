# Processed Directory Semantics Policy

This document defines the semantics of the `processed/` directory and establishes guidelines for identifying misplaced outputs.

## Purpose and History

The `processed/` directory is a **legacy processed-marker archive** and **handled source archive**.

In the project's old workflow, when a primary input archive (like a ZIP file containing GPX files or an Excel workbook containing activity logs) was successfully extracted or ingested, the original source file was moved aside into the `processed/` directory. This served as a marker that the file had already been handled, preventing it from being accidentally re-processed.

Therefore, `processed/` contains **retained source snapshots** and **handled source archives**.

## Misleading Name and Future Generated Outputs

The name "processed" is misleading in the context of a modern data pipeline, as it implies "data that has been processed to create an output." However, in this repository, `processed/` was strictly meant to hold *already-handled source inputs*.

- **`processed/` must not be used as the destination for newly generated pipeline outputs.**
- Future generated outputs (such as resolved mountain JSON) belong under the generated-output path policy (e.g., `artifacts/generated/`), not under `processed/`.
- Existing generated-looking JSON files under `processed/` (e.g., `mountain_merged.json`, `mountain_link_mapping.json`, `mountain_summit_coordinates.json`) are legacy/misplaced artifacts that require audit. They may be preserved as historical evidence or schema references, but `processed/` remains forbidden as a destination for new generated outputs. For details, see [Legacy Resolved Mountain JSON Schema Audit](legacy_resolved_mountain_json_schema_audit.md).

## Physical Restructuring

Physical renaming, deletion, or migration of the `processed/` directory remains strictly blocked until the comprehensive source coverage and source-to-target mapping audits explicitly authorize it. All existing files under `processed/` must remain in place during the current inventory phase.

## Read-Only Classification Guidelines

During audits and inventories, files found in `processed/` (or related directories) should be classified using the following terms:

- **`retained_source_snapshot`**: An original source workbook, original ZIP export package, or other original input archive (e.g., `processed/GPXファイル.zip`, `processed/えひめの山.xlsx`).
- **`legacy_processed_marker`**: A file moved aside to mark it as already handled in the old workflow.
- **`misplaced_generated_output`**: A file that appears to be a data-processing result and does not belong conceptually under `processed/` (or another protected source-centric directory).
- **`needs_decision`**: A file whose producer, origin, or role is unclear.

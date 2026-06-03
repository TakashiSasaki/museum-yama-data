# Legacy Resolved Mountain JSON Schema Audit

## Purpose
This document provides a read-only audit of the existing legacy resolved-mountain JSON artifacts. It documents the reusable schema/record shape for the future resolved mountain JSON output while clarifying that the existing files are legacy artifacts and not valid canonical outputs.

## Files Inspected & Current Classifications
- `processed/mountain_merged.json`: `legacy_schema_reference` and `misplaced_generated_output`.
- `processed/mountain_link_mapping.json`: `legacy_mapping_evidence` / `legacy_generated_artifact`.
- `processed/mountain_summit_coordinates.json`: `legacy_coordinate_evidence` / `legacy_generated_artifact`.
- `museum-yama-web/mountains.json`: `legacy_web_cache` / `legacy_evidence`. It is not the authoritative semantic model.

## Record-Count Observations & Top-Level Structure
- **`processed/mountain_merged.json`**: JSON Array (531 items).
- **`processed/mountain_link_mapping.json`**: JSON Array (531 items).
- **`processed/mountain_summit_coordinates.json`**: JSON Array (531 items).

**Crucial Invariant**: 531 legacy JSON items does **not** mean 531 authoritative records.
- The current authoritative source set is exactly 501 records with a non-empty (integer) CSV `No`.
- In the inspected `processed/*.json` files, exactly 501 records have an integer `No` field, and 30 records have a `null` `No` field.
- The 30 blank/`null`-"No" records are explicitly excluded from the authoritative resolved mountain dataset. Any future output derived from these legacy JSON schemas must filter or exclude these blank-"No" records, unless a future explicit decision changes this rule.
- **`museum-yama-web/mountains.json`**: JSON Object (Mapping) keyed by mountain name (523 keys).

## Field Inventory (Legacy vs. Future)
The legacy JSON files use the field name `No` as the identifier (sourced from the CSV).
- **Equivalent to `mountain_no`?**: None of the files contain a field literally named `mountain_no`. They use `No`.
- **Primary Key Invariant**: The future resolved mountain JSON must use `mountain_no` as the authoritative primary key. `mountain_no` must be a unique non-null integer.
- The legacy `No` field provides the schema source for the future `mountain_no` field (for the 1..501 authoritative records). This is a field adaptation, not a new synthetic ID.
- Mountain name, municipality, coordinates, elevation, or row index must not become the primary key.
- `museum-yama-web/mountains.json` uses the mountain name as the key. Because of this, it is provisional legacy cache/evidence only and must not define the future primary key design.

## Schema Reuse Decision
- **Filename Status**: The legacy filename `mountains-merged.json` or `mountain_merged.json` is not canonical. The future filename remains undecided.
- **Schema Adaptability**: The future resolved mountain JSON may reuse the legacy record shape (e.g., from `processed/mountain_merged.json`). However, it **must** adapt the legacy `No` field to `mountain_no` and must satisfy the `mountain_no` primary-key invariant and the 501-record authoritative count. The target schema contract is documented in the [Resolved Mountain JSON Schema Contract](resolved_mountain_json_schema_contract.md), and current source status can be found in the [Mountain Source Validation Report](mountain_source_validation_report.md).
- **Path Policy**: The legacy data contents under `processed/` are read-only schema/evidence references. The `processed/` directory is strictly forbidden as a destination for new generated outputs.

## Known Blockers & Recommendations
- **Future Task Recommendation**: When implementing the future pipeline, ensure the output shape enforces `mountain_no` (derived from the authoritative non-empty `No` values) and strictly outputs the 501 validated records, omitting the 30 supplementary ones. Choose a deliberate, non-legacy filename and store it in an appropriate `artifacts/generated/` subdirectory (once explicitly authorized to create it).

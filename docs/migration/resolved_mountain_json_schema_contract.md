# Resolved Mountain JSON Schema Contract

This document is the canonical design document for the future resolved mountain JSON record shape. It outlines the schema, field expectations, constraints, and classification disciplines required before generating the final dataset.

## Target Output Shape and Semantics

*   **Output Path and Filename**: The future output path and filename are strictly **undecided**. The output may be referred to generically as the "future resolved mountain JSON". The legacy filename (`mountain_merged.json` or `mountains-merged.json`) is a reference only and is **not** canonical.
*   **Authoritative Primary Key**: The future output must use **`mountain_no`** as the unified effective primary key.
    *   For rows with a non-empty CSV `No` column, `mountain_no` is the integer value of `No` (`1..501`).
    *   For rows with a blank CSV `No`, `mountain_no` is derived by sequentially filling starting from `max_existing_no + 1` (expected `502..531`).
    *   `mountain_no` must be a unique, non-null integer.
    *   The expected key set is `1..531`.
    *   The expected target record count is 531 records.
*   **Provisional Rows and Coordinate Evidence**: The legacy CSV source (`csv/えひめの山_愛媛県の山.csv`) contains 531 rows. The 30 rows with a blank `No` value are now explicitly **included**. Their original coordinates from the `GPS` column must be preserved as coordinate evidence (`gps_raw`, `coordinate_source` = `csv_existing_gps`).
*   **Required Provenance Fields**: The schema must include `mountain_no_source`, `mountain_no_status`, `csv_no`, `source_row_no`, `coordinate_source`, and `coordinate_status`.
*   **Disambiguation Constraints**: Same-name mountain records **must not** be merged solely by name.
*   **Non-Primary-Key Fields**: Names, municipality labels, GPS coordinates, elevation, row index, and legacy web-cache keys are to be used only as evidence or labels. They must **not** be used as primary keys.

## Field Categories

Every field in the future resolved mountain JSON must be categorized into one of the following:

*   `required_authoritative_fields`: Fields required for identity and canonical structure (e.g., `mountain_no`).
*   `legacy_field_mappings`: Fields migrated directly from legacy source outputs (e.g., legacy mountain name mapping).
*   `evidence_fields`: Fields supporting the mountain's existence or location (e.g., coordinate evidence, elevation evidence).
*   `provenance_fields`: Fields recording the data's origin or lineage (e.g., source row index).
*   `excluded_or_non_authoritative_fields`: Fields or records explicitly omitted from the final set.
*   `needs_decision_fields`: Fields whose role, preservation, or migration strategy is not yet resolved.

## Field Mapping Table

| Legacy Source Field / Concept | Future Target Field | Category | Notes |
| :--- | :--- | :--- | :--- |
| `No` (integer/derived) | `mountain_no` | `required_authoritative_fields` | Unique integer, expected `1..531`. |
| `山名` / name-like | `mountain_name` or `legacy_name` | `legacy_field_mappings` | Must not be used as key. |
| `市町村・島` / municipality-like | `municipality_label` or `location_label` | `evidence_fields` | Must not be used as key. |
| `GPS` / coordinate-like | `gps_raw`, `csv_lat`, `csv_lon` | `evidence_fields` | Migrated as raw CSV coordinate evidence. Future parsing. Not key. |
| `標高` / elevation-like | elevation evidence field | `evidence_fields` | e.g. `elevation`. Not key. |
| source row index | `source_row_no` | `provenance_fields` | Sourced from CSV physical row number. Preserved strictly as provenance. |
| blank/null `No` record | Included as provisional records | `required_authoritative_fields` | 30 legacy records included, mapped sequentially to `mountain_no` `502..531`. |

## Source Coverage & Field Classification Discipline

Before any final conversion or migration is implemented, **every legacy JSON field and CSV source field** used by the conversion must be classified into one of the following terms:

*   `migrated`
*   `partially_migrated`
*   `derived_only`
*   `preserved_as_legacy_reference`
*   `preserved_as_raw_snapshot`
*   `intentionally_discarded`
*   `unmigrated_gap`
*   `needs_decision`
*   `excluded_from_authoritative_source`

**Strict Condition**: If any field needed for conversion remains `needs_decision`, `unmigrated_gap`, or unclassified, the future conversion task **must not** produce the canonical output. The repository must not silently drop fields from the legacy JSON or source CSV during conversion.

## Current Implementation Status

**The final schema is not fully implemented.** This document represents the contractual requirements and invariants for the eventual migration, but the generated canonical output (`artifacts/generated/mountains/*.json` or similar) has not yet been produced.

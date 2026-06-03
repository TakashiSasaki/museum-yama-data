# Resolved Mountain JSON Schema Contract

This document is the canonical design document for the future resolved mountain JSON record shape. It outlines the schema, field expectations, constraints, and classification disciplines required before generating the final dataset.

## Target Output Shape and Semantics

*   **Output Path and Filename**: The future output path and filename are strictly **undecided**. The output may be referred to generically as the "future resolved mountain JSON". The legacy filename (`mountain_merged.json` or `mountains-merged.json`) is a reference only and is **not** canonical.
*   **Authoritative Primary Key**: The future output must use **`mountain_no`** as the authoritative primary key.
    *   `mountain_no` is adapted from the legacy `No` field (sourced from the CSV `No` column).
    *   `mountain_no` must be a unique, non-null integer.
    *   The expected key set is currently `1..501`.
    *   The expected authoritative record count is currently exactly 501 records.
*   **Excluded Records**: The legacy CSV source (`csv/えひめの山_愛媛県の山.csv`) contains 531 rows. The 30 rows with a blank, null, or empty `No` value are explicitly **excluded** from the authoritative output.
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
| `No` (integer) | `mountain_no` | `required_authoritative_fields` | Unique integer, `1..501`. |
| `山名` / name-like | `mountain_name` or `legacy_name` | `legacy_field_mappings` | Must not be used as key. |
| `市町村・島` / municipality-like | `municipality_label` or `location_label` | `evidence_fields` | Must not be used as key. |
| `GPS` / coordinate-like | coordinate evidence field | `evidence_fields` | e.g. `lat`, `lon`. Not key. |
| `標高` / elevation-like | elevation evidence field | `evidence_fields` | e.g. `elevation`. Not key. |
| source row index | provenance only | `provenance_fields` | Sourced from CSV row number. |
| blank/null `No` record | N/A | `excluded_or_non_authoritative_fields` | 30 legacy records excluded. |

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

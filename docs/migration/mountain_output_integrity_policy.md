# Mountain Output Integrity Policy

This document records the user-confirmed data-integrity invariants for the final resolved mountain JSON outputs and establishes discrepancy categories to guide validation.

## Primary Key and Target Output Cardinality

The unified effective primary key for resolved mountain records is **`mountain_no`**.
- For rows with a non-empty CSV `No` column, `mountain_no` is the integer value of `No` (must form a contiguous sequence from 1).
- For rows with a blank CSV `No` column, `mountain_no` is determined by sequential fill starting from `max_existing_no + 1`.
- Each mountain record must have a unique non-null integer `mountain_no`.
- The expected effective key set is `1..531`. (The historical physical CSV row number logic and 502 absence rule are superseded).
- The fields `mountain_no_source` and `mountain_no_status` are required.
- Name, municipality, GPS coordinates, elevation, or arbitrary zero-based row indices must not be used as the primary key. (These fields may be used as evidence, labels, matching hints, or provenance).

The current user-confirmed invariant for the final resolved mountain dataset is:
**The future final resolved mountain JSON is expected to contain exactly 531 top-level mountain records.**

This expected cardinality is derived from the full CSV reference set. Any difference from this count in a generated output must be explicitly reported and explained.

- Unresolved summit candidates are not the same thing as resolved mountains.
- The `museum-yama-web/mountains.json` file is a provisional legacy cache, not the final semantic model, and should not be treated as authoritative.

## Legacy Filename Clarification

The legacy/manual filename `mountains-merged.json` is not canonical. It was a working filename used in an earlier manual workflow where split files were merged. Future outputs may use a different filename; the reusable part is the record schema/shape. The formal future filename remains undecided. For the official target shape, see the [Resolved Mountain JSON Schema Contract](resolved_mountain_json_schema_contract.md). For current validation state, see the [Mountain Source Validation Report](mountain_source_validation_report.md).

## Provisional Records and Coordinate Evidence Inclusion
The original `csv/えひめの山_愛媛県の山.csv` file contains 531 data rows. The 30 records with a blank `No` value are now explicitly **included** in the authoritative source set as provisional rows.
- They are classified with `mountain_no_status` = `provisional_sequence_filled_no`.
- Their original coordinate data from the CSV `GPS` column must be rigorously preserved as source coordinate evidence (e.g., `coordinate_source` = `csv_existing_gps`, `coordinate_status` = `csv_provided_unverified`).
- Unresolved summit coordinates must be represented explicitly rather than dropping the rows.

## Same-Name Mountain Disambiguation

**Same-name mountains must not be merged solely by name.** Identity resolution must preserve distinct mountain entities based on spatial, topological, or activity-linked evidence. If a same-name mountain is mistakenly merged into a single record, it will lead to an unacceptably reduced mountain count and loss of precision. Identity resolution logic must be constructed to preserve the underlying physical identities and their evidence.

## Future Path Placement

The future resolved mountain JSON is a generated semantic/reporting output, not a retained source snapshot.
- **It must not be placed under `processed/`.**
- A recommended short-term conceptual output path is `artifacts/generated/mountains/<future-resolved-mountain-json>.json` (using the legacy `mountains-merged` schema).
- The final path remains subject to a formal data layout decision, likely under a reporting/web-data layer such as `data/08_reporting/web_data/<future-resolved-mountain-json>.json`.

## Discrepancy Categories

If a future pipeline output differs from the expected 531 records, the pipeline's validation report should categorize the discrepancies using the following labels:

- **`missing_source_row`**: A record that was present in the source but failed to be emitted in the output.
- **`duplicate_or_merged_record`**: A record that was erroneously duplicated or inappropriately combined (such as same-name merging).
- **`same_name_disambiguation_error`**: A specific case where identically named but physically distinct mountains were improperly linked.
- **`intentionally_excluded_record`**: A record omitted based on explicit policy or criteria (e.g., failed elevation confidence thresholds).
- **`unresolved_identity_record`**: A detected summit candidate that could not be mapped to an authoritative mountain identity.
- **`schema_or_normalization_difference`**: An apparent count difference caused by how a nested or unstructured field was normalized or modeled.
- **`needs_human_decision`**: A discrepancy that cannot be automatically resolved and requires explicit user review.

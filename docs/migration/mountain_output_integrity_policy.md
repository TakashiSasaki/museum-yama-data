# Mountain Output Integrity Policy

This document records the user-confirmed data-integrity invariants for the final resolved mountain JSON outputs and establishes discrepancy categories to guide validation.

## Target Output Cardinality

The current user-confirmed invariant for the final resolved mountain dataset is:
**The future final resolved mountain JSON, conceptually `mountains-merged.json`, should eventually contain exactly 501 top-level mountain records.**

This expected cardinality is derived from the CSV reference set. Any difference from this count in a generated output must be explicitly reported and explained.

- Unresolved summit candidates are not the same thing as resolved mountains.
- The `museum-yama-web/mountains.json` file is a provisional legacy cache, not the final semantic model, and should not be treated as authoritative.

## Source Exclusion Rule
The original `csv/えひめの山_愛媛県の山.csv` file contains 531 data rows. However, 30 of these records have a blank `No` value. The user has decided that **records with a blank `No` value must not be used as authoritative mountain source records**.
- These 30 blank-"No" records must not be silently used to increase the final output count to 531.
- They are classified as `excluded_from_authoritative_source` (or `non_authoritative_blank_no_record`).
- They must not be used as identity evidence, summit identity evidence, or source rows for `mountains-merged.json`.
- They must not be deleted, moved, or modified, and are preserved as out of scope for the authoritative set.
- Validation should report their count separately.

## Same-Name Mountain Disambiguation

**Same-name mountains must not be merged solely by name.** Identity resolution must preserve distinct mountain entities based on spatial, topological, or activity-linked evidence. If a same-name mountain is mistakenly merged into a single record, it will lead to an unacceptably reduced mountain count and loss of precision. Identity resolution logic must be constructed to preserve the underlying physical identities and their evidence.

## Future Path Placement

The future `mountains-merged.json` is a generated semantic/reporting output, not a retained source snapshot.
- **It must not be placed under `processed/`.**
- A recommended short-term conceptual output path is `artifacts/generated/mountains/mountains-merged.json`.
- The final path remains subject to a formal data layout decision, likely under a reporting/web-data layer such as `data/08_reporting/web_data/mountains-merged.json`.

## Discrepancy Categories

If a future pipeline output differs from the expected 501 records, the pipeline's validation report should categorize the discrepancies using the following labels:

- **`missing_source_row`**: A record that was present in the source but failed to be emitted in the output.
- **`duplicate_or_merged_record`**: A record that was erroneously duplicated or inappropriately combined (such as same-name merging).
- **`same_name_disambiguation_error`**: A specific case where identically named but physically distinct mountains were improperly linked.
- **`intentionally_excluded_record`**: A record omitted based on explicit policy or criteria (e.g., failed elevation confidence thresholds).
- **`unresolved_identity_record`**: A detected summit candidate that could not be mapped to an authoritative mountain identity.
- **`schema_or_normalization_difference`**: An apparent count difference caused by how a nested or unstructured field was normalized or modeled.
- **`needs_human_decision`**: A discrepancy that cannot be automatically resolved and requires explicit user review.

- **`excluded_from_authoritative_source`**: A record present in the source file but explicitly ignored by policy (e.g., blank `No` value in the CSV).

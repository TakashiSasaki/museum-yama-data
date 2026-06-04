# Mountain Source Full Rows Validation Plan

## Purpose
This document defines the new invariants that must be checked by future validation commands concerning the mountain source rows derived from the CSV `愛媛県の山.csv`. This plan aligns with the updated policy documented in `mountain_numbering_and_coordinate_policy.md`.

## Required Invariants

Future validation processes must enforce the following checks on the normalized mountain source dataset:

*   **`total_mountain_source_rows`**: `531`
    *   *Validation:* Ensure that the total number of rows processed from the CSV is exactly 531.
*   **`csv_no_count`**: `501`
    *   *Validation:* Ensure that exactly 501 rows possess a non-empty, integer value in their original CSV `No` column.
*   **`blank_csv_no_count`**: `30`
    *   *Validation:* Ensure that exactly 30 rows have a blank/null value in their original CSV `No` column.
*   **`effective_mountain_no_count`**: `531`
    *   *Validation:* Ensure that every one of the 531 rows has been assigned an effective `mountain_no`.
*   **`effective_mountain_no_unique`**: `true`
    *   *Validation:* Ensure that all assigned `mountain_no` values are unique across the entire dataset.
*   **`effective_mountain_no_expected_set`**: `1..501` plus `503..532`
    *   *Validation:* Verify that the assigned `mountain_no` values perfectly match this combined range. It should flag if `502` is present, or if any values fall outside these boundaries.
*   **`provisional_mountain_no_count`**: `30`
    *   *Validation:* Ensure that exactly 30 rows have a `mountain_no_status` of `provisional_csv_row_no`.
*   **`provisional_mountain_no_source`**: `csv_physical_row_number`
    *   *Validation:* Verify that for all provisional rows, the `mountain_no_source` is explicitly tagged as `csv_physical_row_number`.
*   **`csv_coordinate_fields_for_provisional_rows`**: `preserved`
    *   *Validation:* Ensure that the original `GPS` column data is retained and mapped to the appropriate coordinate evidence fields (e.g., `gps_raw`, `coordinate_source` = `csv_existing_gps`).

## Note on Current Implementation

Current validation code (e.g., in `.agents/skills/yama-data-pipeline/test/test_validate_mountain_sources.js` and `lib/mountain_source_validation.js`) may still enforce the superseded 501-only invariant. Updating the validation code to enforce the new invariants defined in this document is a future implementation task, not part of the current documentation-only change.

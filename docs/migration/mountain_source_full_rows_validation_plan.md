# Mountain Source Full Rows Validation Plan

## Purpose
This document defines the new invariants that must be checked by future validation commands concerning the mountain source rows derived from the CSV `愛媛県の山.csv`. This plan aligns with the updated policy documented in `mountain_numbering_and_coordinate_policy.md`.

## Acceptance Validation Invariants

Future validation processes must enforce the following checks on the normalized mountain source dataset during the acceptance stage:

*   **`extracted_csv_may_have_blank_no`**: `true`
    *   *Validation:* Recognize that the extracted intermediate CSV will have blank `No` values and this is expected.
*   **`accepted_dataset_blank_mountain_no_count`**: `0`
    *   *Validation:* Ensure that after filling, no rows have a blank or missing effective `mountain_no`.
*   **`filled_blank_no_rule`**: `csv_physical_row_number`
    *   *Validation:* For blank `No` values, the effective `mountain_no` is filled using the physical CSV row number.
*   **`filled_no_uniqueness_required`**: `true`
    *   *Validation:* Ensure that all assigned `mountain_no` values are unique across the entire dataset.
*   **`duplicate_effective_no_is_fatal`**: `true`
    *   *Validation:* Any duplicate `mountain_no` after filling is a fatal acceptance error.
*   **`source_row_no_definition`**: `1-based physical CSV line number, header counted as row 1`
    *   *Validation:* Physical row logic is strictly based on the physical text lines of the CSV.
*   **`gps_raw_preserved`**: `true`
    *   *Validation:* Original GPS values must be preserved as `gps_raw`.

## Required Validation Sequence

The acceptance step must perform validation *after* the fill operation, not before. The required sequence is:

1. Read extracted CSV.
2. Compute `source_row_no` for each data row.
3. If `No` is blank, fill effective `mountain_no` from `source_row_no`.
4. If `No` is non-empty, parse integer `No` as effective `mountain_no`.
5. Check every effective `mountain_no` is integer and non-null.
6. Check uniqueness of effective `mountain_no`.
7. Check expected key set (`1..501` plus `503..532`).
8. Preserve `GPS` as `gps_raw`.
9. Fail with a fatal error on duplicate effective `mountain_no`.

## Previous Required Invariants

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

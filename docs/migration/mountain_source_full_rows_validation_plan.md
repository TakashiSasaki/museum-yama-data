# Mountain Source Full Rows Validation Plan

## Purpose
This document defines the new invariants that must be checked by future validation commands concerning the mountain source rows derived from the CSV `愛媛県の山.csv`. This plan aligns with the updated policy documented in `mountain_numbering_and_coordinate_policy.md`.

## Acceptance Validation Invariants

Future validation processes must enforce the following checks on the normalized mountain source dataset during the acceptance stage:

*   **`total_mountain_source_rows`**: `531`
    *   *Validation:* Ensure that the total number of rows processed from the CSV is exactly 531.
*   **`source_csv_no_count`**: `501`
    *   *Validation:* Ensure that exactly 501 rows possess a non-empty, integer value in their original CSV `No` column.
*   **`blank_source_no_count`**: `30`
    *   *Validation:* Ensure that exactly 30 rows have a blank/null value in their original CSV `No` column.
*   **`source_non_empty_no_values`**: `1..501`
    *   *Validation:* Verify existing non-empty `No` values form this range.
*   **`source_non_empty_no_unique`**: `true`
    *   *Validation:* Ensure non-empty source `No` values are unique.
*   **`source_non_empty_no_contiguous_from_1`**: `true`
    *   *Validation:* Ensure non-empty source `No` values are a contiguous sequence from `1` to `max_existing_no`.
*   **`max_existing_no`**: `501`
    *   *Validation:* Expected maximum value of existing non-empty source `No`.
*   **`blank_no_fill_rule`**: `sequence_fill_after_max_existing_no`
    *   *Validation:* For blank source `No` values, the effective `mountain_no` is filled sequentially starting from `max_existing_no + 1`.
*   **`blank_no_fill_values`**: `502..531`
    *   *Validation:* Verify the sequentially filled values match this range.
*   **`accepted_mountain_no_count`**: `531`
    *   *Validation:* Every accepted row must have a non-null integer effective `mountain_no`.
*   **`accepted_mountain_no_unique`**: `true`
    *   *Validation:* Ensure that all assigned `mountain_no` values are unique across the entire dataset.
*   **`accepted_mountain_no_expected_set`**: `1..531`
    *   *Validation:* Verify that the assigned `mountain_no` values perfectly match this continuous range.
*   **`accepted_dataset_blank_mountain_no_count`**: `0`
    *   *Validation:* Ensure that after filling, no rows have a blank or missing effective `mountain_no`.
*   **`source_row_no_preserved`**: `true`
    *   *Validation:* Original physical CSV row number logic is preserved strictly as provenance, not as fill value.
*   **`gps_raw_preserved`**: `true`
    *   *Validation:* Original GPS values must be preserved as `gps_raw`.
*   **`duplicate_existing_no_is_fatal`**: `true`
    *   *Validation:* Any duplicate in the existing non-empty `No` sequence is a fatal error.
*   **`non_contiguous_existing_no_is_fatal`**: `true`
    *   *Validation:* If the existing non-empty `No` sequence is not exactly `1..max_existing_no`, it is a fatal error.
*   **`duplicate_effective_mountain_no_is_fatal`**: `true`
    *   *Validation:* Any duplicate `mountain_no` after filling is a fatal acceptance error.

## Required Validation Sequence

1. Read extracted CSV.
2. Preserve `source_row_no` for each data row.
3. Split rows into non-empty source `No` rows and blank source `No` rows.
4. Validate non-empty source `No` values are integers.
5. Validate non-empty source `No` values are unique.
6. Validate non-empty source `No` values are exactly `1..max_existing_no`.
7. If validation fails, stop with fatal error.
8. Fill blank source `No` rows in `source_row_no` order with `max_existing_no + 1`, `max_existing_no + 2`, ...
9. Validate every accepted row has non-null integer `mountain_no`.
10. Validate accepted `mountain_no` values are unique.
11. Validate current expected final key set is `1..531`.
12. Preserve `GPS` as `gps_raw`.

## Previous Superseded Invariants

The previous required invariants involving `provisional_csv_row_no`, `csv_physical_row_number` as fill logic, and an expected key set of `1..501 plus 503..532` are fully superseded by the sequence-fill rules defined above.

## Note on Current Implementation

Current validation code (e.g., in `.agents/skills/yama-data-pipeline/test/test_validate_mountain_sources.js` and `lib/mountain_source_validation.js`) may still enforce the superseded 501-only invariant. Updating the validation code to enforce the new invariants defined in this document is a future implementation task, not part of the current documentation-only change.

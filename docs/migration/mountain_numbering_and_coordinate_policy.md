# Mountain Numbering and Coordinate Policy

## Purpose
This document establishes the authoritative policy for mountain numbering and coordinate source preservation for the museum-yama-data project. It supersedes previous decisions and invariants regarding mountain counts and data scope.

## Supersession Note
The previous policy, which stated that only the 501 rows with non-empty `No` values were in the authoritative source set and that the 30 blank-`No` rows were excluded, is completely superseded.

## Data Scope and Pipeline Stages
The pipeline explicitly separates the mechanical extraction of source data from the semantic acceptance of mountain entities.

### Stage A: Excel Sheet Extraction
The mechanical extraction from `えひめの山.xlsx` produces an extracted intermediate CSV (`愛媛県の山.csv`). The extracted CSV remains unchanged and represents the source data exactly as provided. Blank `No` values remain as-is in this intermediate output.

### Stage B: Mountain Source Acceptance and Normalization
This stage consumes the extracted CSV and produces an accepted/normalized dataset. The extracted CSV may contain blank `No` values. The accepted mountain-source dataset must not. During mountain source acceptance, blank `No` values are filled using the 1-based physical CSV row number, counting the header row as row 1. After this fill operation, every accepted row must have a non-null integer `mountain_no`. The complete `mountain_no` set must be unique. Any duplicate `mountain_no` after filling is a fatal acceptance error.

All 531 rows in the primary source file `愛媛県の山.csv` are formally in scope for this mountain-source acceptance and subsequent downstream summit-coordinate resolution. Downstream processing MUST use the accepted/normalized dataset, not raw extracted CSV rows with blank effective IDs.

## Field Definitions and Effective Keys

Every mountain row must be assigned an effective `mountain_no`. The logic for determining the `mountain_no` depends on the original CSV record.

### Definitions
*   **`csv_no`**: The original value found in the `No` column of the CSV.
*   **`source_row_no`**: The 1-based physical line number in the CSV file, counting the header row as row 1.
*   **`mountain_no`**: The unified, effective primary key for the mountain record.
*   **`mountain_no_source`**: The origin of the `mountain_no` value (e.g., `csv_no`, `csv_physical_row_number`).
*   **`mountain_no_status`**: The classification status of the `mountain_no` value (e.g., `authoritative_csv_no`, `provisional_csv_row_no`).

### Numbering Rules

**For rows with a non-empty CSV `No` (501 rows):**
*   `mountain_no`: Integer value of the CSV `No`.
*   `mountain_no_source`: `csv_no`
*   `mountain_no_status`: `authoritative_csv_no`

**For rows with a blank CSV `No` (30 rows):**
*   `mountain_no`: The physical CSV row number (`source_row_no`).
*   `mountain_no_source`: `csv_physical_row_number`
*   `mountain_no_status`: `provisional_csv_row_no`
*   `csv_no`: null

### Expected Key Set
The expected set of effective `mountain_no` keys is:
**`1..501` plus `503..532`**

*Note: The physical CSV row numbers for the blank-`No` data rows are 503 through 532. Therefore, `502` is absent/reserved. The numbering must not be compactly renumbered to fill this gap.*

## Coordinate Evidence Preservation

The blank-`No` / provisional-number rows contain existing coordinate data in the `GPS` column of the CSV. These coordinates must be rigorously preserved as source coordinate evidence and must not be discarded or arbitrarily overwritten by later GPX-derived summit candidates.

### Required Coordinate Provenance Fields
Future schema design for summit coordinates must support the following fields to capture provenance:
*   `gps_raw`: The unparsed, original value from the CSV `GPS` column.
*   `csv_lat`: The latitude parsed from the raw GPS data.
*   `csv_lon`: The longitude parsed from the raw GPS data.
*   `csv_coordinate_parse_status`: Status of the parsing operation (e.g., success, error, empty).
*   `coordinate_source`: Origin of the coordinates.
*   `coordinate_status`: Validation status of the coordinates.

### Recommended Values for CSV Coordinates
When migrating the existing CSV `GPS` coordinates, the target fields should be populated as follows:
*   `coordinate_source` = `csv_existing_gps`
*   `coordinate_status` = `csv_provided_unverified`

## Relationship to Downstream Processing

*   **GPX-derived Summit Candidates:** Future GPX-derived candidates are separate entities and serve as evidence. They may be used to validate, corroborate, or challenge the CSV coordinates, but the CSV coordinates remain the initial source evidence for these provisional rows.
*   **Human Review:** Conflicts between CSV coordinates and GPX-derived candidates, or unparsed GPS data, will be subject to future human review processes.
*   **Non-Goals:** This policy defines the numbering and coordinate preservation strategy. It does not actively generate coordinates or finalize mountain identity resolutions. Update to the codebase validation logic to support this new policy is a future implementation task.

# Mountain Count Reference Audit

## Purpose
This read-only audit verifies the user-stated expected cardinality of 531 top-level mountain records against the current CSV source (`csv/えひめの山_愛媛県の山.csv`).

## Counting Method
A simple Python script using the standard `csv` library was used to iterate over the rows in `csv/えひめの山_愛媛県の山.csv`, extracting the header and counting the remaining data rows.

## Observation
*   **File Inspected:** `csv/えひめの山_愛媛県の山.csv`
*   **Headers Excluded:** Yes
*   **Data-Row Count:** 531

## Conclusion / Status
*   **Status:** `confirmed_531`
*   **Notes:** The data-row count (excluding the header) in `csv/えひめの山_愛媛県の山.csv` is exactly 531. This confirms the user-stated expected cardinality. The future `mountains-merged.json` must therefore preserve these 531 top-level mountain records, and same-name mountains must not be inappropriately merged to artificially reduce this count.

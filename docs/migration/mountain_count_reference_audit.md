# Mountain Count Reference Audit

## Purpose
This read-only audit verifies the user-stated expected cardinality of 501 top-level mountain records against the current CSV source (`csv/えひめの山_愛媛県の山.csv`).

## Counting Method
A simple Python script using the standard `csv` library was used to iterate over the rows in `csv/えひめの山_愛媛県の山.csv`, extracting the header and counting the remaining data rows. We then separated the count based on whether the `No` column was blank.

## Observation
*   **File Inspected:** `csv/えひめの山_愛媛県の山.csv`
*   **Headers Excluded:** Yes
*   **Total Data-Row Count:** 531
*   **Records with non-empty "No" (Authoritative):** 501
*   **Records with blank "No" (Excluded from authoritative set):** 30

## Conclusion / Status
*   **Status:** `confirmed_501`
*   **Notes:** The total data-row count (excluding the header) is 531. However, exactly 30 records have a blank `No` value. According to historical policy, these 30 blank-"No" records were excluded. However, under the new mountain output integrity policy, all 531 rows are considered in scope. (The intermediate policy of using physical CSV row numbers for fill is also superseded. Blank values are now filled sequentially starting from max_existing_no + 1, resulting in an expected set of 1..531).
*   **Invariant:** The final `mountains-merged.json` should conceptually contain the 501 top-level mountain records. Same-name mountains must not be inappropriately merged to artificially reduce this count.

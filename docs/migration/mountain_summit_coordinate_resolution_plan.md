# Mountain Summit Coordinate Resolution Plan

## Purpose
This document outlines the staged future workflow for resolving summit coordinates for the entire set of 531 mountain records, including both authoritative CSV rows and provisional-number rows.

## Guiding Principles
*   **Coordinate Provenance is Mandatory:** No final summit coordinate should be accepted without explicit coordinate provenance.
*   **CSV Evidence Preservation:** CSV-provided coordinates (e.g., from the `GPS` column) may serve as initial accepted evidence for provisional-number rows but must carry a status like `csv_provided_unverified` until validated against other sources.
*   **GPX Summit Candidates are Evidence:** GPX-derived summit candidates are considered evidence, not automatically final truth. They must be validated and explicitly chosen.
*   **Explicit Human Decisions:** Human review decisions regarding coordinate selection or conflict resolution must be recorded explicitly.
*   **Representation of Unresolved Entities:** Unresolved mountains must not be dropped. They must remain represented in the dataset as rows with `coordinate_status = unresolved`.

## Staged Workflow

### Stage 1: Excel sheet extraction
*   **Description:** The mechanical extraction from `えひめの山.xlsx` produces an extracted intermediate CSV (`愛媛県の山.csv`). The extracted CSV retains original values, including blank `No` values.
*   **Expected Output:** `data/02_intermediate/activity_logs/csv_extracted/.../愛媛県の山.csv`

### Stage 2: Mountain source acceptance and normalization
*   **Description:** Process the full set of 531 extracted mountain rows from the intermediate CSV. This step validates that existing non-empty `No` values are contiguous from 1. It then fills blank `No` values sequentially starting from `max_existing_no + 1` to ensure every row has a non-null, unique effective `mountain_no`. It validates final `mountain_no` uniqueness, preserves `source_row_no`, and preserves the CSV `GPS` column as raw coordinate evidence.
*   **Expected Output:** `data/03_primary/mountains/ehime_mountain_source_rows.json`

### Stage 3: Preserve CSV-provided coordinates
*   **Description:** Extract and preserve the raw coordinate evidence from the CSV `GPS` column (mapped during acceptance) to prepare for candidate validation.
*   **Expected Output:** `data/03_primary/mountain_summit_coordinates/mountain_summit_coordinates_initial_from_csv.jsonl` (or equivalent future path)

### Stage 4: Prepare GPX-derived summit candidates
*   **Description:** Run peak detection algorithms on GPX tracks to generate summit-candidate GPX files, and then perform summit candidate feature extraction to produce a structured unresolved feature dataset. This feature extraction step is strictly separate from reverse-geocoding enrichment and mountain identity resolution.
*   **Input:** `data/01_raw/gpx/...`
*   **Expected Output:** Summit candidate GPX files, and the unresolved feature dataset `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`

### Stage 4b: Extract reverse-geocoding point index
*   **Description:** Process the raw Nominatim JSON cache responses stored in `data/01_raw/reverse_geocoding/raw/nominatim` and extract them into a point index JSONL file. This prepares administrative boundary and island evidence for nearest-neighbor lookups. Note that reverse geocoding provides supplementary location evidence only, and does not serve as final identity proof.
*   **Expected Output:** `data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl`



### Stage 5: Link GPX/YAMAP/activity evidence
*   **Description:** Establish canonical links between GPX tracks and YAMAP activity records based on contextual evidence.
*   **Input:** GPX-to-YAMAP activity candidate links / canonical links

### Stage 6: Generate mountain-to-summit-candidate candidate links
*   **Description:** Cross-reference mountain source records with detected summit candidates, utilizing activity links and other metadata to propose candidate matches.
*   **Expected Output:** `data/04_feature/mountain_summit_candidate_links/.../candidate_links.jsonl`

### Stage 7: Compare CSV coordinates against GPX summit candidates
*   **Description:** Validate the initial CSV-provided coordinates against the geometry of matched GPX summit candidates to assess accuracy and consistency.
*   **Expected Output:** `data/04_feature/mountain_coordinate_validation/.../csv_vs_gpx_candidate_distances.jsonl`

### Stage 8: Human review
*   **Description:** Present validation results and low-confidence candidate links for explicit human review and resolution.
*   **Expected Output:** `data/08_reporting/mountain_summit_coordinate_review/.../review_queue.csv`

### Stage 9: Produce accepted summit coordinate table
*   **Description:** Compile the final, resolved summit coordinates based on validated CSV data, confirmed GPX candidates, and explicit human decisions.
*   **Expected Output:** `data/03_primary/mountain_summit_coordinates/mountain_summit_coordinates.jsonl`

### Stage 10: Reporting/export
*   **Description:** Generate final reporting artifacts, such as waypoints for maps or datasets for web applications.
*   **Expected Output:** `data/08_reporting/gpx/mountain_waypoints/...`

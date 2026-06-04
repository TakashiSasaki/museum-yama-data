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

### Stage 1: Normalize all CSV mountain source rows
*   **Description:** Process the full set of 531 mountain rows from the CSV, assigning effective `mountain_no` values based on the numbering policy.
*   **Expected Output:** `data/03_primary/mountains/ehime_mountain_source_rows.jsonl`

### Stage 2: Preserve CSV-provided coordinates
*   **Description:** Extract and preserve the raw coordinate evidence from the CSV `GPS` column, mapping it to the newly assigned effective `mountain_no`.
*   **Expected Output:** `data/03_primary/mountain_summit_coordinates/mountain_summit_coordinates_initial_from_csv.jsonl` (or equivalent future path)

### Stage 3: Prepare GPX-derived summit candidates
*   **Description:** Run peak detection algorithms on GPX tracks to generate summit candidates.
*   **Input:** `data/01_raw/gpx/...`
*   **Expected Output:** Summit candidate GPX / summit candidate feature dataset

### Stage 4: Link GPX/YAMAP/activity evidence
*   **Description:** Establish canonical links between GPX tracks and YAMAP activity records based on contextual evidence.
*   **Input:** GPX-to-YAMAP activity candidate links / canonical links

### Stage 5: Generate mountain-to-summit-candidate candidate links
*   **Description:** Cross-reference mountain source records with detected summit candidates, utilizing activity links and other metadata to propose candidate matches.
*   **Expected Output:** `data/04_feature/mountain_summit_candidate_links/.../candidate_links.jsonl`

### Stage 6: Compare CSV coordinates against GPX summit candidates
*   **Description:** Validate the initial CSV-provided coordinates against the geometry of matched GPX summit candidates to assess accuracy and consistency.
*   **Expected Output:** `data/04_feature/mountain_coordinate_validation/.../csv_vs_gpx_candidate_distances.jsonl`

### Stage 7: Human review
*   **Description:** Present validation results and low-confidence candidate links for explicit human review and resolution.
*   **Expected Output:** `data/08_reporting/mountain_summit_coordinate_review/.../review_queue.csv`

### Stage 8: Produce accepted summit coordinate table
*   **Description:** Compile the final, resolved summit coordinates based on validated CSV data, confirmed GPX candidates, and explicit human decisions.
*   **Expected Output:** `data/03_primary/mountain_summit_coordinates/mountain_summit_coordinates.jsonl`

### Stage 9: Reporting/export
*   **Description:** Generate final reporting artifacts, such as waypoints for maps or datasets for web applications.
*   **Expected Output:** `data/08_reporting/gpx/mountain_waypoints/...`

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

### Stage 4c: Enrich summit candidates with reverse-geocoding location evidence
*   **Description:** Join the unresolved summit candidates with the reverse-geocoding point index by nearest-neighbor lookup within a search radius (e.g. 1000m). This stage derives municipality/county/city/town/village/island/local candidates for each summit.
*   **Notes:**
    - Reverse-geocoding location evidence is a loose hint and not final identity proof.
    - Island evidence and municipality/county/city evidence are kept separately.
    - Administrative borders are ambiguous near summits; this stage preserves all candidates for later linking logic.
*   **Expected Output:** `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl`

### Stage 5: Link GPX/YAMAP/activity evidence
*   **Description:** Establish candidate links between GPX tracks and YAMAP activity records based on dates, times, and Japanese-safe title similarity features (exact match, token Jaccard overlap, and token containment). Propose the best match and flag ambiguities for manual review.
*   **Expected Output:** Enriched candidate links `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl` and review queue files.

### Stage 6: Generate mountain-to-summit-candidate candidate links (Executed)
*   **Description:** Cross-reference mountain source records with detected summit candidates, utilizing activity links and other metadata to propose candidate matches.
*   **Expected Output:** `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl`, `manifest.json`, and review files.

### Stage 6b: Refine mountain-to-summit-candidate candidate links by location (Executed)
*   **Description:** Use detailed municipality and island reverse-geocoding information to refine, re-rank, and prioritize candidate links. This step assigns review priorities and filters the links into a reduced review queue.
*   **Expected Output:** `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl`, `location_refined_manifest.json`, and review files.

### Stage 6c: Compress mountain-to-summit candidate review queues (Historical/Superseded)
*   **Description:** Group and compress location-refined candidate links into compact Top-1, Top-3, and Conflict-focused review queues. Generate GPX-group and summit-conflict reports to facilitate ridge traverse and candidate overlap review.
*   **Expected Output:** `data/08_reporting/mountain_summit_candidate_review/2026-05-12/` containing `compact_review_queue_top1.csv`, `compact_review_queue_top3.csv`, `compact_review_queue_conflicts.csv`, `conflict_groups_by_gpx.csv`, `conflict_groups_by_summit_candidate.csv`, `compact_review_summary.md`, and `compact_review_manifest.json`.
*   **Note:** These old artifacts were deleted as obsolete. Newer location-stability and grounding-assisted review artifacts exist.

### Stage 7: Compare CSV coordinates against GPX summit candidates
*   **Description:** Validate the initial CSV-provided coordinates against the geometry of matched GPX summit candidates to assess accuracy and consistency.
*   **Expected Output:** `data/04_feature/mountain_coordinate_validation/.../csv_vs_gpx_candidate_distances.jsonl`

### Stage 8: Human review (Historical/Superseded)
*   **Description:** Generate conflict-group review packets (GPX traverse groups and summit conflicts) and a human decision template to prepare for manual validation.
*   **Expected Output:** `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/` and `review_decisions_template.csv`.
*   **Note:** These old artifacts were deleted as obsolete. Newer location-stability and grounding-assisted review artifacts exist.

### Stage 9: Produce accepted summit coordinate table
*   **Description:** Compile the final, resolved summit coordinates based on validated CSV data, confirmed GPX candidates, and explicit human decisions.
*   **Expected Output:** `data/03_primary/mountain_summit_coordinates/mountain_summit_coordinates.jsonl`
*   **Note:** Final accepted summit coordinates have not yet been created.

### Stage 10: Reporting/export
*   **Description:** Generate final reporting artifacts, such as waypoints for maps or datasets for web applications.
*   **Expected Output:** `data/08_reporting/gpx/mountain_waypoints/...`

## Current Implemented Candidate-Link and Review-Reduction Stages

The following stages reflect the current pipeline alignment beyond the conceptual stages outlined above. They replace the older Nominatim-based review logic (Stages 6c and 8) with more robust structural evidence and external geographic grounding.

### Stage 17 / 18 / 19: Location-Stability Refinement and Review Packets
*   **Description:** Refines candidate links against topological municipality boundaries (KSJ N03) to filter out spurious nearby candidates. Regenerates compact review queues and structured markdown packets. This provides the retained baseline/reference point for location-based structural validity.
*   **Key Output:** `location_stability_refined_candidate_links.jsonl`, `location_stability_review_packets/`

### Stage 20: Geographic Grounding Request Preparation
*   **Description:** Identifies mountains requiring external geographic grounding support based on location stability queues. Compiles machine-readable and human-readable request packets.
*   **Key Output:** Request packet JSONL/Markdown under `data/04_feature/mountain_geographic_grounding/`.

### Stage 21: Grounding-Based Refinement of Candidate Links
*   **Description:** Projects raw Gemini-derived geographic grounding coordinates as auxiliary distance-based evidence onto the existing full candidate links universe.
*   **Review Reduction Baseline:** Stage 21 produced stronger review-burden reduction on the full 11,372-link universe, reducing review-required mountains to 280.

### Stage 22-24: Grounding-Assisted Reprocessing
*   **Description:** Normalizes raw grounding responses (Stage 22), prunes completely spurious candidate links using a strict location threshold (Stage 23), and regenerates new review queues on this pruned universe (Stage 24).
*   **Note:** This is the current generated pipeline branch. While Stage 24 successfully reduced overall candidate-link volume to 6,079, it did not substantially reduce the review-required mountain count, leaving 530 mountains review-required.

### Stage 25: Grounding-Assisted Review Reduction v2 (Planned)
*   **Description:** The next intended improvement. It aims to combine the candidate-link volume reduction of Stage 23 with the priority/review-burden reduction logic of Stage 21, resolving the remaining 530 review-required mountains.

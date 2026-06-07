# Mountain Summit Assignment (Gemini-Grounded) Plan

This document details the plan for redoing the mountain summit coordinate assignment using a Gemini-grounded approach.

## 1. Branch and HEAD Commit Inspected
* **Branch**: `museum-yama-data`
* **Audited base HEAD**: `bdfcdb2 docs: add mountain-summit candidate linking v3 audits (#92)`
* **Documentation commit**: `006c57f docs: add documentation for gemini-grounded mountain summit assignment strategy`
* **Latest HEAD rechecked for this documentation consistency update**: `006c57fc423c48b5dc65c67266b9b3079cbdd2fe`

## 2. Problem Statement
The Ehime mountaineering database contains 531 CSV-derived mountain records that need to be associated with authoritative geographic coordinates. While we have collected GPX activity tracks containing peak locations (summit candidates), mapping mountains directly to these tracks using text matching or simple proximity leads to high ambiguity (same-name mountains, missing names, etc.), causing a heavy human review burden. 

## 3. Why Previous Candidate-Linking Approaches are not Continued Directly
1. **Many-to-Many Linking vs. One-to-One Assignment**: Prior attempts (v2/v3/Stage 26) focused on generating mountain-to-candidate link sets, where multiple candidates could match a mountain, or visa versa. This target stage focuses on assigning **exactly one proposed summit coordinate** for each mountain record.
2. **Ambiguity and Review Burden**: Previous versions relied on GPX-first matching with weak geographic constraints, leading to thousands of candidate links requiring manual human validation.
3. **Underutilization of Grounding Data**: Previous methods treated Gemini-derived coordinates as secondary filters rather than primary search anchors. By utilizing Gemini grounding coordinates as the main search anchor, we can leverage external consensus to resolve location ambiguities and significantly reduce manual review.

## 4. Method Identity
* **Stage**: `mountain_summit_coordinate_assignment`
* **Method ID**: `gemini_grounded_summit_assignment`
* **Run ID**: `2026-06-07_gemini_grounded_summit_assignment`

## 5. Input Datasets
* **Mountains Source**: `data/03_primary/mountains/ehime_mountain_source_rows.json` (Record count: 531)
* **Summit Candidates**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (Record count: 496)
* **Geographic Grounding Reference**: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (Record count: 531)
* **Municipality Point Lookup**: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (Record count: 496)
* **Municipality Lookup Stability**: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (Record count: 496)
* **Municipality Adjacency Reference**: `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json`

## 6. Output Namespace
All generated outputs will reside in:
* **Feature Outputs**: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/`
* **Review Outputs**: `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_summit_assignment/`

## 7. Non-Overwrite Policy
To prevent confusion and maintain auditable lineage, the following namespaces will **not** be modified, overwritten, or reused:
* `data/04_feature/mountain_summit_candidate_links/2026-05-12/`
* `data/04_feature/mountain_summit_candidate_links/2026-06-06/`
* `data/08_reporting/mountain_summit_candidate_review/2026-05-12/`
* `data/08_reporting/mountain_summit_candidate_review/2026-06-06/`
* Any other prior `v3_candidate_links` or Stage 26 output path.

## 8. Source Immutability Policy
The raw and primary inputs are strictly immutable. Under no circumstances will the following files be modified:
* Raw GPX files under `data/01_raw/gpx/`
* YAMAP Markdown files under `data/01_raw/yamap_markdown/`
* Gemini raw response files
* Mountain source JSON (`ehime_mountain_source_rows.json`)
* Summit candidate JSONL (`summit_candidates.jsonl`)
* Municipality lookup and stability datasets

## 9. Gemini-Heavy Assignment Strategy
Gemini grounding coordinates represent strong external evidence derived from historical documents, YAMAP activity indexes, and maps. This method uses Gemini coordinates as the **primary search anchor** (center point) to search for matching GPX summit candidates.
* **If a GPX candidate is found close to the Gemini coordinate**: The GPX candidate's coordinate is proposed as the summit coordinate (providing GPX-backed precision), and the Gemini grounding support is documented.
* **If no GPX candidate is found close to the Gemini coordinate**: The Gemini grounding coordinate is proposed directly, but marked as needing review.

## 10. Handling of Gemini-Only Coordinates
If a mountain has a usable Gemini coordinate but no GPX summit candidate is found within 1000 meters:
* The proposed coordinate will be the Gemini coordinate itself.
* The `proposed_coordinate_source` will be set to `gemini_only`.
* The `review_category` will be set to `gemini_only_coordinate_review`.
* The record will be flagged as `needs_human_review: true`.

## 11. Handling of Gemini Conflict Clusters
If the Gemini grounding reference for a mountain has `coordinate_conflict: true` (e.g. multiple distinct coordinate clusters returned across sessions):
* The record will **never** be auto-supported.
* The `review_category` will be set to `conflict_case`.
* The record will be flagged as `needs_human_review: true`.
* The `review_reason_codes` will include `gemini_coordinate_conflict`.

## 12. Handling of GPX Summit Candidate Support
When looking up GPX summit candidates around a Gemini anchor, we classify support using the following distance tiers:
* `strict_gpx_support`: 0–50 m
* `strong_gpx_support`: 50–150 m
* `medium_gpx_support`: 150–300 m
* `weak_gpx_support`: 300–500 m
* `distant_gpx_support`: 500–1000 m
* `no_gpx_support`: >1000 m

If a candidate is within 1000m, the proposed coordinate is set to the GPX candidate's coordinate, `proposed_coordinate_source` is set to `gpx_summit_candidate`, and `proposed_summit_candidate_id` is filled.

## 13. Handling of CSV Coordinates
CSV coordinates (`coordinates.lat`, `coordinates.lon`) from the original Excel sheet are historical coordinates with variable precision.
* The distance from the CSV coordinate to the proposed coordinate is calculated and stored as `distance_csv_to_proposed_m`.
* If a CSV coordinate exists and is more than 2000m away from the proposed coordinate, `needs_human_review` is set to `true`, and `csv_coordinate_mismatch` is added to `review_reason_codes`.

## 14. Handling of Municipality Evidence
Municipality compatibility check:
* The expected municipality is obtained from `mountains` (`location.municipality`).
* The candidate's municipality is obtained from `municipality_lookup` (`primary_municipality_name`).
* If they match, municipality is compatible.
* If they do not match, we check `municipality_adjacency` to see if the expected municipality is adjacent to the candidate's municipality. If they are adjacent, the compatibility is marked as `adjacent`.
* If they do not match and are not adjacent, it is marked as `incompatible`. This forces `needs_human_review: true` and adds `municipality_mismatch` to `review_reason_codes`.

## 15. Handling of Old Stage 9–25 / Previous v3 Outputs
Old outputs are left untouched in their legacy paths. They may later be archived or deleted in a separate cleanup PR after:
1. The new method is fully validated and outputs are generated in the new namespace.
2. Required comparison metrics between old and new methods are preserved.
3. The codebase demonstrates that raw/source data can regenerate all needed outputs.
4. The user explicitly approves the deletion.

## 16. Expected Target Schema
The output file `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/proposed_summit_assignments.jsonl` will contain records with the following fields:
* `mountain_no`: `number` (primary key)
* `mountain_name`: `string`
* `mountain_source_row_no`: `number`
* `assignment_status`: `string` (`assigned` or `unassigned`)
* `review_category`: `string` (one of the 6 review categories)
* `proposed_lat`: `number | null`
* `proposed_lon`: `number | null`
* `proposed_ele_m`: `number | null`
* `proposed_coordinate_source`: `string | null` (`gpx_summit_candidate`, `gemini_only`, or `null`)
* `proposed_summit_candidate_id`: `string | null`
* `source_gpx_basename`: `string | null`
* `source_gpx_path`: `string | null`
* `distance_gemini_to_gpx_candidate_m`: `number | null`
* `distance_csv_to_proposed_m`: `number | null`
* `elevation_diff_csv_to_proposed_m`: `number | null`
* `confidence`: `number` (between 0.0 and 1.0)
* `needs_human_review`: `boolean`
* `review_reason_codes`: `array of strings`
* `evidence`: `object`
  * `evidence.gemini_grounding`: `object`
  * `evidence.gpx_summit_candidate`: `object`
  * `evidence.csv_coordinate`: `object`
  * `evidence.elevation`: `object`
  * `evidence.name`: `object`
  * `evidence.municipality`: `object`
  * `evidence.legacy_candidate_links`: `object`
* `notes`: `string | null`

## 17. Expected Review Categories
Every record is classified into exactly one of:
* `auto_supported_not_canonical`: Usable, non-conflicting Gemini coordinate matches a GPX candidate within 150m (`strict` or `strong`), name/municipality compatible, no other flags. Does not require manual review.
* `quick_review_recommended`: Usable Gemini coordinate matches a GPX candidate between 150m and 500m, or minor name/elevation discrepancies.
* `manual_review_required`: Usable Gemini coordinate matches GPX candidate weakly (500-1000m), or has significant municipality/name incompatibilities.
* `conflict_case`: Gemini grounding reports coordinate conflict, or multiple GPX candidates compete for the same Gemini anchor within similar distances.
* `gemini_only_coordinate_review`: Usable Gemini coordinate proposed directly because no GPX candidate exists within 1000m.
* `no_assignment`: No usable Gemini coordinates and no strong fallback GPX candidate.

## 18. Expected Manifest Fields
The run manifest `proposed_summit_assignments_manifest.json` will contain:
* `run_id`: `2026-06-07_gemini_grounded_summit_assignment`
* `method_id`: `gemini_grounded_summit_assignment`
* `stage`: `mountain_summit_coordinate_assignment`
* `timestamp`: `string (ISO format)`
* `inputs`: `array of objects` containing paths and SHA-256 hashes of input files.
* `outputs`: `array of objects` containing paths and SHA-256 hashes of output files.
* `summary`: `object` containing:
  * `total_mountains` (531)
  * `assigned_count`
  * `unassigned_count`
  * `by_review_category` (counts for each of the 6 categories)
  * `needs_human_review_count`

## 19. Validation Requirements
The implementation script will validate that:
* The generated output has exactly 531 records (matching `ehime_mountain_source_rows.json`).
* Every mountain has a record containing a valid `mountain_no`.
* Proposed coordinates are within bounds of Ehime Prefecture (lat: [32.0, 34.5], lon: [132.0, 133.8]).
* If `needs_human_review` is `false`, the category must be `auto_supported_not_canonical`.
* All JSON files are well-formed.

## 20. Stop Conditions / Blockers
Processing must stop and alert the user if:
* The input file counts do not match (e.g. `ehime_mountain_source_rows.json` record count != 531).
* Required schema fields are missing.
* The output path collisions would occur (enforced by non-overwrite policy).

## 21. Implementation Tasks for a Later PR
1. Create assignment command logic under `.agents/skills/yama-data-pipeline/commands/assign-mountain-summits-gemini-grounded.js`.
2. Write unit tests for scoring and assignment logic.
3. Integrate command into `cli.js`.
4. Run the assignment tool to generate the outputs.
5. Create review-queue spreadsheets (CSV) and review summary files in `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_summit_assignment/`.

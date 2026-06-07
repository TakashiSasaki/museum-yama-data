# Mountain Summit Assignment (Gemini-Grounded Balanced) Source Coverage Audit

This document records the source coverage audit for the new `gemini_grounded_balanced_summit_assignment` method.

## 1. Branch and HEAD Commit Inspected
* **Branch**: `museum-yama-data`
* **Latest HEAD**: `85eb913 docs: reconcile gemini-grounded assignment post-implementation status`

## 2. Input Files Inspected & Record Counts
The following input files were inspected for this audit:
* `data/03_primary/mountains/ehime_mountain_source_rows.json` (Record count: 531)
* `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (Record count: 496)
* `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (Record count: 531)
* `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (Record count: 496)
* `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (Record count: 496)
* `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` (20 municipalities)
* `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl` (Record count: 294)

## 3. Field Inventory and Paths Observed
The following field paths and data types were observed across the inspected inputs (matching the baseline audit plus the title-enriched candidate links):

### mountains (`data/03_primary/mountains/ehime_mountain_source_rows.json`)
* `mountain_no`: `number`
* `csv_no`: `number`
* `source_row_no`: `number`
* `mountain_no_source`: `string`
* `mountain_no_status`: `string`
* `name`: `string`
* `location`: `object`
  * `location.municipality_or_island`: `string`
  * `location.municipality`: `null`, `string`
  * `location.island`: `null`, `string`
* `coordinates`: `object`
  * `coordinates.lat`: `null`, `number`
  * `coordinates.lon`: `null`, `number`
  * `coordinates.source`: `string`
  * `coordinates.raw`: `string`
* `elevation_m`: `number`
* `difficulty_rank`: `number`
* `entry_course_recommended`: `boolean`
* `yamap_url`: `null`, `string`

### summit_candidates (`data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`)
* `candidate_index_in_gpx`: `number`
* `candidate_status`: `string`
* `detection_parameters`: `object`
* `ele_m`: `number`
* `lat`: `number`
* `lon`: `number`
* `source_gpx_basename`: `string`
* `source_gpx_path`: `string`
* `summit_candidate_id`: `string`
* `track_name`: `string`
* `waypoint_name`: `string`
* `waypoint_desc`: `string`

### grounding_reference (`data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`)
* `mountain_no`: `number`
* `mountain_name`: `string`
* `has_usable_coordinate`: `boolean`
* `coordinate_conflict`: `boolean`
* `selected_grounding_lat`: `null`, `number`
* `selected_grounding_lon`: `null`, `number`
* `selected_grounding_elevation_m`: `null`, `number`
* `selected_grounding_municipality`: `null`, `string`
* `selected_grounding_confidence_score`: `null`, `number`
* `evidence_links`: `array of strings`
* `raw_response_refs`: `array of objects`

### municipality_lookup (`data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`)
* `source_record_id`: `string`
* `primary_municipality_name`: `null`, `string`
* `primary_municipality_code`: `null`, `string`
* `lookup_status`: `string`
* `municipality_matches`: `array of objects`
  * `municipality_matches[].name`: `string`
  * `municipality_matches[].code`: `string`

### municipality_stability (`data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`)
* `summit_candidate_id`: `string`
* `municipality_stability`: `string`
* `municipality_stability_reason_codes`: `array of strings`
* `center_distance_to_boundary_m`: `null`, `number`

### title_enriched_candidate_links (`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`)
* `gpx_basename`: `string`
* `gpx_track_name`: `string`
* `title_enriched_candidate_activities`: `array of objects`
  * `title_enriched_candidate_activities[].title`: `string`
  * `title_enriched_candidate_activities[].normalized_yamap_title`: `string`
* `best_candidate`: `object`
  * `best_candidate.title`: `string`

## 4. Missing Expected Files
* None. All 7 expected input datasets were successfully located and parsed.

## 5. Parse Errors
* None. All datasets are syntactically valid JSON or JSONL.

## 6. Audit Completeness and Blockers
* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Blockers**: None.

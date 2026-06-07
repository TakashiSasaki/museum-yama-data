# Mountain Summit Assignment (Gemini-Grounded) Source Coverage Audit

This document records the source coverage audit for the new `gemini_grounded_summit_assignment` method.

## 1. Branch and HEAD Commit Inspected
* **Branch**: `museum-yama-data`
* **Audited base HEAD**: `bdfcdb2 docs: add mountain-summit candidate linking v3 audits (#92)`
* **Documentation commit**: `006c57f docs: add documentation for gemini-grounded mountain summit assignment strategy`
* **Latest HEAD rechecked for this documentation consistency update**: `006c57fc423c48b5dc65c67266b9b3079cbdd2fe`

## 2. Input Files Inspected & Record Counts
The following input files were inspected for this audit:
* `data/03_primary/mountains/ehime_mountain_source_rows.json` (Record count: 531)
* `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (Record count: 496)
* `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (Record count: 531)
* `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (Record count: 496)
* `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (Record count: 496)
* `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json`

## 3. Field Inventory and Paths Observed
The following field paths and data types were observed across the inspected inputs:

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
  * `detection_parameters.merge_distance`: `number`
  * `detection_parameters.min_prominence`: `number`
  * `detection_parameters.peak_radius`: `number`
  * `detection_parameters.smooth_window`: `number`
* `detection_stage`: `string`
* `ele_m`: `number`
* `lat`: `number`
* `lon`: `number`
* `manifest_bounds`: `object`
  * `manifest_bounds.maxlat`: `number`
  * `manifest_bounds.maxlon`: `number`
  * `manifest_bounds.minlat`: `number`
  * `manifest_bounds.minlon`: `number`
* `manifest_trackpoint_count`: `number`
* `source_gpx_basename`: `string`
* `source_gpx_path`: `string`
* `source_gpx_sha256`: `string`
* `source_manifest_record_index`: `number`
* `summit_candidate_gpx_basename`: `string`
* `summit_candidate_gpx_path`: `string`
* `summit_candidate_gpx_sha256`: `string`
* `summit_candidate_id`: `string`
* `track_name`: `string`
* `waypoint_desc`: `string`
* `waypoint_name`: `string`

### grounding_reference (`data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`)
* `mountain_no`: `number`
* `mountain_name`: `string`
* `source_mountain_name`: `string`
* `source_municipality`: `string`
* `grounding_record_count`: `number`
* `grounding_statuses`: `array of strings`
* `has_usable_coordinate`: `boolean`
* `usable_coordinate_record_count`: `number`
* `coordinate_cluster_count`: `number`
* `coordinate_conflict`: `boolean`
* `selected_grounding_lat`: `null`, `number`
* `selected_grounding_lon`: `null`, `number`
* `selected_grounding_elevation_m`: `null`, `number`
* `selected_grounding_municipality`: `null`, `string`
* `selected_grounding_confidence_score`: `null`, `number`
* `name_match_status`: `string`
* `municipality_match_status`: `string`
* `raw_response_refs`: `array of objects`
  * `raw_response_refs[].source_document`: `string`
  * `raw_response_refs[].json_block_index`: `number`
  * `raw_response_refs[].lat_lon_status`: `string`
  * `raw_response_refs[].grounding_status`: `string`
* `evidence_links`: `array of strings`
* `grounding_reference_status`: `string`
* `review_reason_codes`: `array of strings`
* `notes`: `string`

### municipality_lookup (`data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`)
* `source_record_id`: `string`
* `source_dataset`: `string`
* `data_reference_date`: `string`
* `prefecture`: `string`
* `prefecture_code`: `string`
* `primary_municipality_code`: `null`, `string`
* `primary_municipality_name`: `null`, `string`
* `lat`: `number`
* `lon`: `number`
* `lookup_status`: `string`
* `boundary_tolerance_m`: `number`
* `municipality_matches`: `array of objects`
  * `municipality_matches[].code`: `string`
  * `municipality_matches[].name`: `string`
  * `municipality_matches[].distance_to_boundary_m`: `number`
  * `municipality_matches[].relationship`: `string`
* `boundary_matches`: `array of objects`
  * `boundary_matches[].code`: `string`
  * `boundary_matches[].name`: `string`
* `notes`: `null`, `string`

### municipality_stability (`data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`)
* `summit_candidate_id`: `string`
* `source_dataset`: `string`
* `data_reference_date`: `string`
* `prefecture`: `string`
* `prefecture_code`: `string`
* `lat`: `number`
* `lon`: `number`
* `offset_m`: `number`
* `boundary_tolerance_m`: `number`
* `stable_interior_threshold_m`: `number`
* `center_lookup_status`: `string`
* `center_municipality_code`: `null`, `string`
* `center_municipality_name`: `null`, `string`
* `center_distance_to_boundary_m`: `null`, `number`
* `all_cardinal_1km_same`: `boolean`
* `distance_stable_interior`: `boolean`
* `municipality_stability`: `string`
* `municipality_stability_reason_codes`: `array of strings`
* `north_lookup`: `null`, `object`
  * `north_lookup.lat`: `number`
  * `north_lookup.lon`: `number`
  * `north_lookup.lookup_status`: `string`
  * `north_lookup.municipality_code`: `null`, `string`
  * `north_lookup.municipality_name`: `null`, `string`
  * `north_lookup.municipality_matches`: `array of objects`
    * `north_lookup.municipality_matches[].code`: `string`
    * `north_lookup.municipality_matches[].name`: `string`
    * `north_lookup.municipality_matches[].distance_to_boundary_m`: `number`
    * `north_lookup.municipality_matches[].relationship`: `string`
* `east_lookup`: `null`, `object` (schema same as `north_lookup`)
* `south_lookup`: `null`, `object` (schema same as `north_lookup`)
* `west_lookup`: `null`, `object` (schema same as `north_lookup`)
* `notes`: `null`

## 4. Missing Expected Files
* None. All 6 expected input datasets were successfully located and parsed.

## 5. Parse Errors
* None. All datasets are syntactically valid JSON or JSONL.

## 6. Audit Completeness and Blockers
* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Blockers**: None. Every observed field in the inputs has been classified and documented in the source-to-target mapping.

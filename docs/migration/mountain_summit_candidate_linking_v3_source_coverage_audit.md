# Mountain-Summit Candidate Linking v3 Source Coverage Audit

## 1. Branch and HEAD Commit Inspected
* **Branch**: `museum-yama-data`
* **HEAD Commit**: `356fe55 feat: parse Stage 21 inputs for grounding-assisted review queues (#90)`

## 2. Input Files Inspected & 3. Record Counts
* `data/03_primary/mountains/ehime_mountain_source_rows.json` (Record count: 531)
* `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (Record count: 1819)
* `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl` (Record count: 1845)
* `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (Record count: 531)
* `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (Record count: 496)
* `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (Record count: 496)

## 4 & 5. Field Inventory and Paths Observed
The following field paths and data types were observed across the inspected inputs:

### mountains (`data/03_primary/mountains/ehime_mountain_source_rows.json`)
* `No`: `int`, `str`
* `area`: `str`
* `book_page`: `str`
* `coordinates`: `dict`
  * `coordinates.lat`: `float`
  * `coordinates.lon`: `float`
* `elevation_m`: `float`, `int`
* `gps_raw`: `str`
* `mountain_no`: `int`
* `mountain_no_source`: `str`
* `mountain_no_status`: `str`
* `name`: `str`
* `notes`: `str`
* `source_row_no`: `int`
* `yomi`: `str`

### summit_candidates (`data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`)
* `ele_m`: `float`
* `lat`: `float`
* `lon`: `float`
* `source_gpx_basename`: `str`
* `source_gpx_path`: `str`
* `summit_candidate_gpx_path`: `str`
* `summit_candidate_id`: `str`
* `track_name`: `str`

### activity_links (`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`)
* `best_candidate`: `dict`
  * `best_candidate.confidence`: `str`
  * `best_candidate.mountain_name`: `str`
  * `best_candidate.reason`: `str`
  * `best_candidate.title`: `str`
  * `best_candidate.yamap_activity_id`: `str`
* `source_gpx_basename`: `str`
* `source_gpx_path`: `str`
* `title_enriched_candidate_activities`: `array`
  * `title_enriched_candidate_activities[].confidence`: `str`
  * `title_enriched_candidate_activities[].matched_dates`: `array`
    * `title_enriched_candidate_activities[].matched_dates[]`: `str`
  * `title_enriched_candidate_activities[].mountain_names`: `array`
    * `title_enriched_candidate_activities[].mountain_names[]`: `str`
  * `title_enriched_candidate_activities[].reason`: `str`
  * `title_enriched_candidate_activities[].title`: `str`
  * `title_enriched_candidate_activities[].yamap_activity_id`: `str`

### grounding_reference (`data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`)
* `grounding_evidence`: `array`
  * `grounding_evidence[].confidence_score`: `str`
  * `grounding_evidence[].grounded_elevation_m`: `float`
  * `grounding_evidence[].grounded_lat`: `float`
  * `grounding_evidence[].grounded_lon`: `float`
  * `grounding_evidence[].grounded_municipality`: `str`
  * `grounding_evidence[].grounding_type`: `str`
  * `grounding_evidence[].index`: `int`
  * `grounding_evidence[].mountain_name`: `str`
  * `grounding_evidence[].source`: `str`
* `grounding_status`: `str`
* `has_conflicting_clusters`: `bool`
* `mountain_no`: `int`
* `reason`: `str`
* `reference_generation_date`: `str`
* `selected_grounding_elevation_m`: `NoneType`, `float`
* `selected_grounding_lat`: `NoneType`, `float`
* `selected_grounding_lon`: `NoneType`, `float`
* `selected_grounding_municipality`: `NoneType`, `str`
* `source_mountain_name`: `str`
* `source_municipality`: `str`
* `usable_coordinate_record_count`: `int`

### municipality_lookup (`data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`)
* `boundary_matches`: `array`
  * `boundary_matches[].code`: `str`
  * `boundary_matches[].name`: `str`
* `boundary_tolerance_m`: `int`
* `data_reference_date`: `str`
* `lat`: `float`
* `lon`: `float`
* `lookup_status`: `str`
* `municipality_matches`: `array`
  * `municipality_matches[].code`: `str`
  * `municipality_matches[].distance_to_boundary_m`: `float`
  * `municipality_matches[].name`: `str`
  * `municipality_matches[].relationship`: `str`
* `notes`: `NoneType`, `str`
* `prefecture`: `str`
* `prefecture_code`: `str`
* `primary_municipality_code`: `NoneType`, `str`
* `primary_municipality_name`: `NoneType`, `str`
* `source_dataset`: `str`
* `source_record_id`: `str`

### municipality_stability (`data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`)
* `all_cardinal_1km_same`: `bool`
* `boundary_tolerance_m`: `int`
* `center_distance_to_boundary_m`: `NoneType`, `float`
* `center_lookup_status`: `str`
* `center_municipality_code`: `NoneType`, `str`
* `center_municipality_name`: `NoneType`, `str`
* `data_reference_date`: `str`
* `distance_stable_interior`: `bool`
* `east_lookup`: `NoneType`, `dict`
  * `east_lookup.lat`: `float`
  * `east_lookup.lon`: `float`
  * `east_lookup.lookup_status`: `str`
  * `east_lookup.municipality_code`: `NoneType`, `str`
  * `east_lookup.municipality_matches`: `array`
    * `east_lookup.municipality_matches[].code`: `str`
    * `east_lookup.municipality_matches[].distance_to_boundary_m`: `float`, `int`
    * `east_lookup.municipality_matches[].name`: `str`
    * `east_lookup.municipality_matches[].relationship`: `str`
  * `east_lookup.municipality_name`: `NoneType`, `str`
* `lat`: `float`
* `lon`: `float`
* `municipality_stability`: `str`
* `municipality_stability_reason_codes`: `array`
  * `municipality_stability_reason_codes[]`: `str`
* `north_lookup`: `NoneType`, `dict`
  * `north_lookup.lat`: `float`
  * `north_lookup.lon`: `float`
  * `north_lookup.lookup_status`: `str`
  * `north_lookup.municipality_code`: `NoneType`, `str`
  * `north_lookup.municipality_matches`: `array`
    * `north_lookup.municipality_matches[].code`: `str`
    * `north_lookup.municipality_matches[].distance_to_boundary_m`: `float`
    * `north_lookup.municipality_matches[].name`: `str`
    * `north_lookup.municipality_matches[].relationship`: `str`
  * `north_lookup.municipality_name`: `NoneType`, `str`
* `notes`: `NoneType`
* `offset_m`: `int`
* `prefecture`: `str`
* `prefecture_code`: `str`
* `source_dataset`: `str`
* `south_lookup`: `NoneType`, `dict`
  * `south_lookup.lat`: `float`
  * `south_lookup.lon`: `float`
  * `south_lookup.lookup_status`: `str`
  * `south_lookup.municipality_code`: `NoneType`, `str`
  * `south_lookup.municipality_matches`: `array`
    * `south_lookup.municipality_matches[].code`: `str`
    * `south_lookup.municipality_matches[].distance_to_boundary_m`: `float`, `int`
    * `south_lookup.municipality_matches[].name`: `str`
    * `south_lookup.municipality_matches[].relationship`: `str`
  * `south_lookup.municipality_name`: `NoneType`, `str`
* `stable_interior_threshold_m`: `int`
* `summit_candidate_id`: `str`
* `west_lookup`: `NoneType`, `dict`
  * `west_lookup.lat`: `float`
  * `west_lookup.lon`: `float`
  * `west_lookup.lookup_status`: `str`
  * `west_lookup.municipality_code`: `NoneType`, `str`
  * `west_lookup.municipality_matches`: `array`
    * `west_lookup.municipality_matches[].code`: `str`
    * `west_lookup.municipality_matches[].distance_to_boundary_m`: `float`, `int`
    * `west_lookup.municipality_matches[].name`: `str`
    * `west_lookup.municipality_matches[].relationship`: `str`
  * `west_lookup.municipality_name`: `NoneType`, `str`

## 6. Missing Expected Files
* None. All expected inputs were found and successfully accessed.

## 7. Parse Errors
* None. All valid lines/objects parsed successfully as valid JSON/JSONL.

## 8. Existing Legacy Stages
* Existing legacy processing stages (Stages 9–25) and their artifacts are explicitly preserved as legacy/baseline representations.
* The v3 generation is intentionally isolated into a new namespace structure and represents an audit before future implementation begins. These existing files are not overwritten.

## 9. Confirmation of Source Data
* **No Source Modified**: No source data, configurations, or legacy outputs were altered during this audit or mapping process. The codebase retains its complete state as inspected.

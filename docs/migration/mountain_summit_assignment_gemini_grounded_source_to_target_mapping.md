# Mountain Summit Assignment (Gemini-Grounded) Source-to-Target Mapping

## 1. Classification Legend

Every observed field is assigned exactly one of the following classifications:

* **migrated**: The source field value is directly preserved in the output assignment record, review artifact, or manifest with the same meaning, possibly under a cleaner target field name. "migrated" does not mean that the value is canonical truth. It only means the value is carried forward as a value.
* **partially migrated**: The source field value is carried forward only under defined conditions, or only in a subset of output records, or only inside a specific evidence object.
* **derived only**: The source field is used to compute scores, distances, tiers, review reason codes, assignment status, ranking, or review category, but the original field value is not carried forward as a primary value with the same meaning.
* **preserved as legacy reference**: The field belongs to historical or provenance context and remains available in existing source or legacy artifacts, but it is not actively carried into the new output as a primary field.
* **preserved as raw snapshot**: The field remains preserved in immutable raw or source files and may be referenced for traceability, but the new method does not parse or semantically rely on it.
* **intentionally discarded**: The field is explicitly not used in the new method, with a reason. Do not use this label to hide uncertainty.
* **unmigrated gap**: A field appears to be relevant but has no target treatment yet. This is a blocker.
* **needs decision**: The correct treatment is unclear. This is a blocker.

---

## 2. Source-to-Target Mapping

### `mountains` (`data/03_primary/mountains/ehime_mountain_source_rows.json`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `mountain_no` | `mountain_no` | migrated | Primary join key and unique identifier. |
| `csv_no` | `evidence.csv_coordinate` | preserved as legacy reference | ID from the legacy CSV source spreadsheet, retained as reference context. |
| `source_row_no` | `mountain_source_row_no` | migrated | Lineage/provenance mapping back to source row. |
| `mountain_no_source` | `evidence.legacy_context` | preserved as legacy reference | Context about the derivation of `mountain_no`. |
| `mountain_no_status` | `evidence.legacy_context` | preserved as legacy reference | Context about the status of `mountain_no`. |
| `name` | `mountain_name`, `evidence.name` | migrated | Core identifying name for the mountain. |
| `location.municipality_or_island` | `evidence.municipality.expected_municipality_or_island` | derived only | Used to match with the candidate's municipality and verify location consistency. |
| `location.municipality` | `evidence.municipality.expected_municipality` | derived only | Primary field used to verify municipality bounds and adjacency compatibility. |
| `location.island` | `evidence.municipality.expected_island` | derived only | Used in island-based candidate matching. |
| `coordinates.lat` | `evidence.csv_coordinate.lat` | partially migrated | Coordinates from source CSV (if present), preserved as evidence. |
| `coordinates.lon` | `evidence.csv_coordinate.lon` | partially migrated | Coordinates from source CSV (if present), preserved as evidence. |
| `coordinates.source` | `evidence.csv_coordinate.source` | preserved as legacy reference | Metadata describing where the CSV coordinates came from. |
| `coordinates.raw` | `evidence.csv_coordinate.raw` | preserved as legacy reference | Original coordinate text, preserved for provenance. |
| `elevation_m` | `evidence.elevation.csv_elevation_m` | partially migrated | Mountain elevation from CSV source, used to compute elevation difference. |
| `difficulty_rank` | `evidence.legacy_context` | preserved as legacy reference | Legacy rank field from CSV. Not used operationally. |
| `entry_course_recommended` | `evidence.legacy_context` | preserved as legacy reference | Legacy boolean field from CSV. Not used operationally. |
| `yamap_url` | `evidence.legacy_context` | preserved as legacy reference | Reference YAMAP URL from CSV. Not used operationally. |

---

### `summit_candidates` (`data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `candidate_index_in_gpx` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Track index of candidate in source GPX file. |
| `candidate_status` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Historical status from candidate generation stage. |
| `detection_parameters.merge_distance` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Tuning parameters for summit candidate generation. |
| `detection_parameters.min_prominence` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Tuning parameters for summit candidate generation. |
| `detection_parameters.peak_radius` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Tuning parameters for summit candidate generation. |
| `detection_parameters.smooth_window` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Tuning parameters for summit candidate generation. |
| `detection_stage` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Generation step metadata. |
| `ele_m` | `proposed_ele_m`, `evidence.gpx_summit_candidate.ele_m` | partially migrated | Elevation of summit candidate; proposed as the target elevation if assigned. |
| `lat` | `proposed_lat`, `evidence.gpx_summit_candidate.lat` | partially migrated | Latitude of candidate; proposed as the target latitude if assigned. |
| `lon` | `proposed_lon`, `evidence.gpx_summit_candidate.lon` | partially migrated | Longitude of candidate; proposed as the target longitude if assigned. |
| `manifest_bounds.maxlat` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Bounding box of the source track file. |
| `manifest_bounds.maxlon` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Bounding box of the source track file. |
| `manifest_bounds.minlat` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Bounding box of the source track file. |
| `manifest_bounds.minlon` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Bounding box of the source track file. |
| `manifest_trackpoint_count` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Number of points in source GPX track. |
| `source_gpx_basename` | `source_gpx_basename`, `evidence.gpx_summit_candidate.gpx_basename` | partially migrated | Name of the source GPX file, migrated if candidate is assigned. |
| `source_gpx_path` | `source_gpx_path`, `evidence.gpx_summit_candidate.gpx_path` | partially migrated | Path to the source GPX file, migrated if candidate is assigned. |
| `source_gpx_sha256` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Hash of the source GPX file. |
| `source_manifest_record_index` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Index of track file in raw ZIP manifest. |
| `summit_candidate_gpx_basename` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Basename of candidate GPX track. |
| `summit_candidate_gpx_path` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Path to candidate GPX track. |
| `summit_candidate_gpx_sha256` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Hash of candidate GPX track. |
| `summit_candidate_id` | `proposed_summit_candidate_id`, `evidence.gpx_summit_candidate.id` | partially migrated | Unique ID of candidate; proposed as target candidate ID if assigned. |
| `track_name` | `evidence.name.gpx_track_name` | partially migrated | Name of track, matched against mountain name for name compatibility. |
| `waypoint_desc` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Description tag in candidate GPX. |
| `waypoint_name` | `evidence.gpx_summit_candidate` | preserved as legacy reference | Name tag in candidate GPX. |

---

### `grounding_reference` (`data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `mountain_no` | (N/A) | derived only | Primary join key; already migrated from mountain source. |
| `mountain_name` | `evidence.name.grounding_mountain_name` | preserved as legacy reference | Lookup mountain name. |
| `source_mountain_name` | `evidence.name.grounding_source_mountain_name` | preserved as legacy reference | Legacy query name from Excel. |
| `source_municipality` | `evidence.municipality.grounding_source_municipality` | preserved as legacy reference | Legacy query municipality from Excel. |
| `grounding_record_count` | `evidence.gemini_grounding` | preserved as legacy reference | Response count. |
| `grounding_statuses` | `evidence.gemini_grounding` | preserved as legacy reference | Status array for the grounding. |
| `has_usable_coordinate` | (N/A) | derived only | Determines search strategy (search GPX or skip fallback). |
| `usable_coordinate_record_count` | `evidence.gemini_grounding` | preserved as legacy reference | Number of usable coordinates in grounding. |
| `coordinate_cluster_count` | `evidence.gemini_grounding` | derived only | Used to identify coordinate clusters and detect conflicts. |
| `coordinate_conflict` | `evidence.gemini_grounding` | derived only | Flag triggering conflict review category. |
| `selected_grounding_lat` | `evidence.gemini_grounding.lat` | partially migrated | Latitude proposed if gemini-only assigned, and used as search anchor. |
| `selected_grounding_lon` | `evidence.gemini_grounding.lon` | partially migrated | Longitude proposed if gemini-only assigned, and used as search anchor. |
| `selected_grounding_elevation_m` | `evidence.gemini_grounding.elevation_m` | partially migrated | Elevation proposed if gemini-only assigned. |
| `selected_grounding_municipality` | `evidence.gemini_grounding.municipality` | partially migrated | Municipality context of the selected grounding coordinate. |
| `selected_grounding_confidence_score` | `evidence.gemini_grounding.confidence` | partially migrated | Grounding confidence score, used in combining assignment score. |
| `name_match_status` | `evidence.gemini_grounding.name_match` | derived only | Match quality, parsed to verify naming consistency. |
| `municipality_match_status` | `evidence.gemini_grounding.municipality_match` | derived only | Match quality, parsed to verify municipality consistency. |
| `raw_response_refs` | `evidence.gemini_grounding.raw_response_refs` | partially migrated | Source response document mappings for traceability. |
| `evidence_links` | `evidence.gemini_grounding.links` | partially migrated | Links to online maps and evidence (YAMAP, small mountains). |
| `grounding_reference_status` | (N/A) | derived only | Grounding status used to determine assignment status. |
| `review_reason_codes` | `review_reason_codes` | derived only | Transferred/mapped to output review reason codes. |
| `notes` | `evidence.gemini_grounding.notes` | preserved as legacy reference | Text notes from grounding normalization. |

---

### `municipality_lookup` (`data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `source_record_id` | (N/A) | derived only | Join key matching `summit_candidate_id`. |
| `source_dataset` | `evidence.municipality` | preserved as legacy reference | Reference dataset name. |
| `data_reference_date` | `evidence.municipality` | preserved as legacy reference | Reference dataset date. |
| `prefecture` | `evidence.municipality` | preserved as legacy reference | Administrative context (always Ehime). |
| `prefecture_code` | `evidence.municipality` | preserved as legacy reference | Administrative code (always 38). |
| `primary_municipality_code` | `evidence.municipality.candidate_lookup.primary_code` | partially migrated | Municipality code of proposed GPX candidate, if assigned. |
| `primary_municipality_name` | `evidence.municipality.candidate_lookup.primary_name` | partially migrated | Municipality name of proposed GPX candidate, if assigned. |
| `lat` | (N/A) | derived only | Lookup latitude (duplicate of candidate lat). |
| `lon` | (N/A) | derived only | Lookup longitude (duplicate of candidate lon). |
| `lookup_status` | `evidence.municipality.candidate_lookup` | derived only | Status of point polygon lookup. |
| `boundary_tolerance_m` | `evidence.municipality.candidate_lookup` | preserved as legacy reference | Tolerance configuration. |
| `municipality_matches` | `evidence.municipality.candidate_lookup.matches` | partially migrated | Detailed matches for proposed GPX candidate, if assigned. |
| `boundary_matches` | `evidence.municipality.candidate_lookup.boundary_matches` | preserved as legacy reference | Bounding area overlaps. |
| `notes` | `evidence.municipality.candidate_lookup.notes` | preserved as legacy reference | Boundary overlap notes. |

---

### `municipality_stability` (`data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | (N/A) | derived only | Join key matching `summit_candidate_id`. |
| `source_dataset` | `evidence.municipality` | preserved as legacy reference | Reference dataset name. |
| `data_reference_date` | `evidence.municipality` | preserved as legacy reference | Reference dataset date. |
| `prefecture` | `evidence.municipality` | preserved as legacy reference | Administrative context. |
| `prefecture_code` | `evidence.municipality` | preserved as legacy reference | Administrative code. |
| `lat` | (N/A) | derived only | Duplicate coordinate. |
| `lon` | (N/A) | derived only | Duplicate coordinate. |
| `offset_m` | `evidence.municipality` | preserved as legacy reference | Static configuration distance. |
| `boundary_tolerance_m` | `evidence.municipality` | preserved as legacy reference | Static configuration tolerance. |
| `stable_interior_threshold_m` | `evidence.municipality` | preserved as legacy reference | Static configuration threshold. |
| `center_lookup_status` | (N/A) | derived only | Duplicate of lookup primary status. |
| `center_municipality_code` | (N/A) | derived only | Duplicate of lookup primary code. |
| `center_municipality_name` | (N/A) | derived only | Duplicate of lookup primary name. |
| `center_distance_to_boundary_m` | `evidence.municipality.candidate_stability.boundary_distance_m` | partially migrated | Boundary distance of proposed GPX candidate, if assigned. |
| `all_cardinal_1km_same` | `evidence.municipality.candidate_stability` | derived only | Mapped to determine location stability. |
| `distance_stable_interior` | `evidence.municipality.candidate_stability` | derived only | Mapped to determine location stability. |
| `municipality_stability` | `evidence.municipality.candidate_stability.stability` | partially migrated | Stability classification of proposed GPX candidate, if assigned. |
| `municipality_stability_reason_codes` | `evidence.municipality.candidate_stability.reason_codes` | partially migrated | Stability reasons of proposed GPX candidate, if assigned. |
| `north_lookup` | `evidence.municipality.candidate_stability.offset_lookups` | preserved as legacy reference | Detailed cardinal lookups. |
| `east_lookup` | `evidence.municipality.candidate_stability.offset_lookups` | preserved as legacy reference | Detailed cardinal lookups. |
| `south_lookup` | `evidence.municipality.candidate_stability.offset_lookups` | preserved as legacy reference | Detailed cardinal lookups. |
| `west_lookup` | `evidence.municipality.candidate_stability.offset_lookups` | preserved as legacy reference | Detailed cardinal lookups. |
| `notes` | `evidence.municipality.candidate_stability` | preserved as legacy reference | Stability notes. |

---

## 3. Derived / Target Fields

The following fields in the target schema represent computed outputs, combinations, or classifications generated by this assignment process:

| Target Field | Classification | Derivation Source |
| :--- | :--- | :--- |
| `assignment_status` | derived only | Set to `assigned` if proposed coordinates are generated, or `unassigned` if no coordinates can be proposed. |
| `review_category` | derived only | Assigned to one of the 6 review categories based on grounding status, GPX support distance, name/municipality compatibility, and conflicts. |
| `proposed_lat` | derived only | Calculated as the latitude of the closest GPX candidate if supported, or the Gemini latitude if gemini-only, or `null`. |
| `proposed_lon` | derived only | Calculated as the longitude of the closest GPX candidate if supported, or the Gemini longitude if gemini-only, or `null`. |
| `proposed_ele_m` | derived only | The elevation of the GPX candidate if supported, or the Gemini elevation if gemini-only, or `null`. |
| `proposed_coordinate_source` | derived only | Set to `gpx_summit_candidate` if candidate within 1000m is used, `gemini_only` if no candidate is found but Gemini is used, or `null`. |
| `proposed_summit_candidate_id` | derived only | Set to the assigned GPX candidate's ID, or `null`. |
| `distance_gemini_to_gpx_candidate_m` | derived only | Geodesic distance in meters between the Gemini coordinate and the assigned GPX candidate coordinate. |
| `distance_csv_to_proposed_m` | derived only | Geodesic distance in meters between the historical CSV coordinate (if present) and the proposed coordinate. |
| `elevation_diff_csv_to_proposed_m` | derived only | Elevation difference in meters between the CSV elevation and the proposed elevation. |
| `confidence` | derived only | Combined score combining Gemini grounding quality, GPX spatial support, naming, municipality, and elevation compatibility. |
| `needs_human_review` | derived only | Flagged as `true` if review reason codes exist or review category is not `auto_supported_not_canonical`. |
| `review_reason_codes` | derived only | List of warnings (e.g. `gemini_coordinate_conflict`, `gemini_only_coordinate`, `gpx_distant_support`, `municipality_mismatch`, `csv_coordinate_mismatch`). |

---

## 4. Resolution Status

* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Blockers**: None.
* **Confirmation Statement**: Every source field identified in the input data has been assigned exactly one classification. No field remains "needs decision" or "unmigrated gap".

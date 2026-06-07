# Gemini-Near GPX Supplemental Candidate Expansion Source-to-Target Mapping

This document details the source-to-target field mapping classifications and the target schema for the proposed `gemini_near_gpx_supplemental_candidate_expansion` method.

---

## 1. Proposed Target Namespace and Paths

Supplemental candidates are not canonical summit candidates and must be kept separate. They will live in a new namespace:
* **Target Output JSONL**:
  `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates.jsonl`
* **Target Output Manifest**:
  `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates_manifest.json`

---

## 2. Design Constraints and Policy Invariants

1. **Non-Overwriting**: Supplemental candidates must never overwrite or replace `summit_candidates.jsonl`.
2. **Supplemental Type**: Each record must carry `supplemental_candidate_type = supplemental_gemini_near_gpx_point`.
3. **Immutability**: Raw GPX files are raw snapshots and must remain fully immutable.
4. **Evidence-Only Migration**: Raw GPX trackpoint coordinates and elevation are migrated only as evidence/proposal data, not as canonical truth.
5. **Auxiliary Grounding**: Gemini grounding coordinates guide nearest-trackpoint search, but Gemini is treated as auxiliary evidence, not canonical truth.
6. **All-or-Nothing Writes**: Any candidate extraction generation must use atomic, all-or-nothing writes to prevent corrupted outputs on failure.

---

## 3. Target Schema Definition

Each row in `supplemental_summit_candidates.jsonl` represents a supplemental candidate point mapped from a raw GPX trackpoint that lies closest to a consensus Gemini grounding coordinate.

### Field Definitions:

* `supplemental_candidate_id`: `string` (unique ID, e.g. `supplemental-candidate:<sha256-hash>`)
* `supplemental_candidate_status`: `string` (`unresolved`, `accepted`, `rejected`)
* `supplemental_candidate_type`: `string` (fixed to `supplemental_gemini_near_gpx_point`)
* `source_method_id`: `string` (fixed to `gemini_near_gpx_supplemental_candidate_expansion`)
* `source_run_id`: `string` (run timestamp identifier)
* `mountain_no`: `integer` (ID of the target mountain)
* `mountain_name`: `string` (name of the target mountain)
* `source_gpx_basename`: `string` (basename of raw GPX)
* `source_gpx_path`: `string` (path to raw GPX)
* `source_gpx_sha256`: `string` (hash of raw GPX)
* `nearest_trackpoint_index`: `integer` (0-based index of closest trackpoint)
* `nearest_trackpoint_segment_index`: `integer` (index of the track segment)
* `nearest_trackpoint_lat`: `float` (latitude of the closest trackpoint)
* `nearest_trackpoint_lon`: `float` (longitude of the closest trackpoint)
* `nearest_trackpoint_ele_m`: `float` (elevation of the trackpoint in meters)
* `nearest_trackpoint_time`: `string` (timestamp of the trackpoint)
* `distance_gemini_to_trackpoint_m`: `float` (distance in meters between grounding and trackpoint)
* `gemini_grounding_lat`: `float` (latitude of Gemini grounding coordinate)
* `gemini_grounding_lon`: `float` (longitude of Gemini grounding coordinate)
* `gemini_grounding_elevation_m`: `float` (elevation of Gemini grounding)
* `gemini_grounding_confidence`: `float` (confidence of Gemini grounding)
* `existing_nearest_summit_candidate_id`: `string | null` (ID of nearest canonical summit candidate)
* `distance_to_existing_nearest_candidate_m`: `float | null` (distance to nearest canonical candidate)
* `local_window_trackpoint_count`: `integer` (count of trackpoints in local temporal/spatial window)
* `local_window_max_ele_m`: `float` (max elevation in the local window)
* `local_window_min_ele_m`: `float` (min elevation in the local window)
* `local_window_ele_range_m`: `float` (elevation range in the local window)
* `local_window_distance_radius_m`: `float` (radius of trackpoints evaluated in local window)
* `local_peak_like_score`: `float` (score estimating if the point is a local maxima)
* `candidate_generation_reason_codes`: `array of strings` (e.g. `["gemini_anchor_search", "traverse_unresolved_gap"]`)
* `needs_human_review`: `boolean` (default `true`)
* `review_reason_codes`: `array of strings` (e.g. `["supplemental_unverified"]`)
* `evidence`: `object` (structured context container)
  * `evidence.gemini_grounding`: `object` (copy of grounding reference fields)
  * `evidence.raw_gpx_trackpoint`: `object` (copy of GPX trackpoint fields)
  * `evidence.local_trackpoint_window`: `object` (copy of local window details)
  * `evidence.existing_summit_candidate_context`: `object` (copy of closest existing candidate metadata)
  * `evidence.balanced_assignment_context`: `object` (copy of balanced proposed assignment)
  * `evidence.activity_title_context`: `object` (copy of matching activity title link data)
  * `evidence.source_file_provenance`: `object` (provenance metadata)
* `notes`: `string | null`

---

## 4. Source Field Classifications

Every observed source field is classified into exactly one of the target treatments.

### Group 1: Raw GPX Fields (`data/01_raw/gpx/2026-05-12/`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `trkpt/@lat` | `nearest_trackpoint_lat` | `migrated` | Preserved as WGS84 latitude. |
| `trkpt/@lon` | `nearest_trackpoint_lon` | `migrated` | Preserved as WGS84 longitude. |
| `trkpt/ele` | `nearest_trackpoint_ele_m` | `migrated` | Elevation converted to float. |
| `trkpt/time` | `nearest_trackpoint_time` | `migrated` | Timestamp preserved. |
| `trkpt` index | `nearest_trackpoint_index` | `migrated` | Captured for traceability. |
| `trk/name` | `evidence.raw_gpx_trackpoint.track_name`| `partially migrated`| Saved in evidence for debug. |

### Group 2: Existing Summit Candidate Fields (`data/03_primary/summit_candidates/2026-05-12/`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | `existing_nearest_summit_candidate_id` | `partially migrated` | Used to link the closest existing candidate. |
| `lat`, `lon` | `evidence.existing_summit_candidate_context.lat/lon`| `partially migrated`| Used to calculate `distance_to_existing_nearest_candidate_m`. |
| `ele_m` | `evidence.existing_summit_candidate_context.ele` | `partially migrated` | Saved in evidence for height comparison. |
| `track_name` | (N/A) | `preserved as legacy reference` | Checked from raw GPX directly. |

### Group 3: Gemini Grounding Reference Fields (`data/04_feature/mountain_geographic_grounding/2026-06-06/`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `selected_grounding_lat`| `gemini_grounding_lat` | `migrated` | Lat coordinates used as anchor coordinate. |
| `selected_grounding_lon`| `gemini_grounding_lon` | `migrated` | Lon coordinates used as anchor coordinate. |
| `selected_grounding_elevation_m`| `gemini_grounding_elevation_m`| `migrated` | Saved for elevation comparison. |
| `selected_grounding_confidence_score`| `gemini_grounding_confidence` | `migrated` | Kept to flag high-confidence anchors. |
| `evidence_links` | `evidence.gemini_grounding.links` | `partially migrated` | Kept inside grounding evidence. |

### Group 4: Balanced Proposed Assignment Fields (`data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `mountain_no` | `mountain_no` | `migrated` | Standard integer primary key. |
| `mountain_name` | `mountain_name` | `migrated` | Standard name matching key. |
| `source_gpx_basename` | `source_gpx_basename` | `migrated` | Used to read raw GPX files. |
| `source_gpx_path` | `source_gpx_path` | `migrated` | Used to resolve GPX filesystem paths. |
| `review_category` | `evidence.balanced_assignment_context.category` | `partially migrated` | Copied to confirm traverse context. |

### Group 5: Activity Title Link Fields (`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `gpx_basename` | (N/A) | `derived only` | Stated in assignment. |
| `best_title.title` | `evidence.activity_title_context.best_title` | `partially migrated` | Saved to evidence to preserve title-matching logic. |

### Group 6: Mountain Source Fields (`data/03_primary/mountains/ehime_mountain_source_rows.json`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `elevation_m` | `evidence.balanced_assignment_context.csv_elevation_m` | `partially migrated` | Copied to compare GPX elevation to CSV. |
| `location.municipality`| `evidence.balanced_assignment_context.expected_municipality` | `partially migrated` | Used to evaluate stability compatibility. |
| `difficulty_rank` | (N/A) | `preserved as legacy reference` | Not needed for geographic candidate search. |

### Group 7: Manifest / Provenance Fields (`data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json`)

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `git_commit` | `evidence.source_file_provenance.git_commit` | `partially migrated` | Track commit of original run. |
| `parameters.merge_distance`| `evidence.source_file_provenance.merge_distance`| `partially migrated`| Parameter tracking. |
| `source_gpx_sha256` | `source_gpx_sha256` | `migrated` | Stored directly for verification. |

---

## 5. Verification Status

* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Implementation Status**: **Ready**. All fields are mapped, design constraints are defined, and no blockers exist.

# Summit Candidate Location Evidence Mapping

This document details the source-to-target field mapping classifications for joining summit candidates with nearby reverse geocoding point indexes.

## Field Classifications

Every source field from the input datasets is classified here to ensure full traceability and accountability during this processing stage.

### From `summit_candidates.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | `summit_candidate_id` | `migrated` | Primary key identifying the summit candidate. |
| `candidate_status` | `candidate_status` | `migrated` | Status of the candidate (e.g. `unresolved`). |
| `source_gpx_path` | `source_gpx_path` | `migrated` | Path to the original raw GPX file. |
| `source_gpx_sha256` | N/A | `intentionally discarded` | SHA256 of the source GPX is not needed in the enriched location evidence record. |
| `source_gpx_basename` | `source_gpx_basename` | `migrated` | Basename of the original raw GPX file. |
| `summit_candidate_gpx_path` | `summit_candidate_gpx_path` | `migrated` | Path to the generated summit-candidate GPX file. |
| `summit_candidate_gpx_sha256` | N/A | `intentionally discarded` | SHA256 of the candidate GPX is not needed in the enriched location evidence record. |
| `summit_candidate_gpx_basename` | `summit_candidate_gpx_basename` | `migrated` | Basename of the candidate GPX. |
| `track_name` | `track_name` | `migrated` | Track name extracted from the GPX. |
| `candidate_index_in_gpx` | N/A | `intentionally discarded` | Internal index of waypoint in GPX; not required for location evidence. |
| `lat` | `lat` | `migrated` | Latitude coordinate of the summit candidate. |
| `lon` | `lon` | `migrated` | Longitude coordinate of the summit candidate. |
| `ele_m` | `ele_m` | `migrated` | Elevation of the candidate in meters. |
| `waypoint_name` | N/A | `intentionally discarded` | Waypoint name is legacy GPX element info, not needed for this feature stage. |
| `waypoint_desc` | N/A | `intentionally discarded` | Waypoint description is legacy GPX element info, not needed for this feature stage. |
| `detection_stage` | N/A | `intentionally discarded` | Parameter used for detection, not needed for location evidence. |
| `detection_parameters` | N/A | `intentionally discarded` | Parameters used for detection, not needed for location evidence. |
| `manifest_trackpoint_count` | N/A | `intentionally discarded` | Manifest trackpoint count; not needed for location evidence. |
| `manifest_bounds` | N/A | `intentionally discarded` | Manifest bounding box; not needed for location evidence. |
| `source_manifest_record_index` | N/A | `intentionally discarded` | Internal record index; not needed for location evidence. |

### From `geocoded_points_index.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `geocoded_point_id` | `nearest_geocoded_point_id` / `nearby_reverse_geocoded_points[].geocoded_point_id` | `migrated` | Identifies the matched geocoded points. |
| `provider` | `nearby_reverse_geocoded_points[].provider` | `migrated` | Geocoding service provider. |
| `raw_file_path` | `nearby_reverse_geocoded_points[].raw_file_path` | `migrated` | Path to raw JSON geocoding response. |
| `raw_file_sha256` | N/A | `intentionally discarded` | SHA256 of raw cache file is not needed in final features. |
| `raw_record_index` | N/A | `intentionally discarded` | Index within the raw geocoding file; not needed. |
| `source_file` | N/A | `intentionally discarded` | Original source file string; not needed. |
| `source_point` | N/A | `intentionally discarded` | Source coordinate node; not needed. |
| `lat` | N/A | `derived only` | Used to compute Haversine distance. |
| `lon` | N/A | `derived only` | Used to compute Haversine distance. |
| `display_name` | `nearest_display_name` / `nearby_reverse_geocoded_points[].display_name` | `migrated` | Full display name of the location. |
| `address` | `nearest_address` / `nearby_reverse_geocoded_points[].address` | `migrated` | Structured address block from Nominatim. |
| `prefecture` | `prefecture_candidates` / `nearby_reverse_geocoded_points[].prefecture` | `migrated` | Prefecture name (e.g. "愛媛県"). |
| `county` | `county_candidates` / `nearby_reverse_geocoded_points[].county` | `migrated` | County name (e.g. "越智郡"). |
| `city` | `city_candidates` / `nearby_reverse_geocoded_points[].city` | `migrated` | City name (e.g. "西条市"). |
| `town` | `town_candidates` / `nearby_reverse_geocoded_points[].town` | `migrated` | Town name (e.g. "上島町"). |
| `village` | `village_candidates` / `nearby_reverse_geocoded_points[].village` | `migrated` | Village name. |
| `island` | `island_candidates` / `nearby_reverse_geocoded_points[].island` | `migrated` | Island name (e.g. "弓削島"). |
| `local` | `local_candidates` / `nearby_reverse_geocoded_points[].local` | `migrated` | Local landmark/section name. |
| `metadata` | N/A | `intentionally discarded` | Original geocoding request metadata. |
| `raw_snapshot_preserved` | N/A | `intentionally discarded` | Flag indicating raw snapshot state; not needed. |
| `coordinate_parse_status` | N/A | `intentionally discarded` | Coordinate validity status from index; not needed. |
| `address_extract_status` | N/A | `intentionally discarded` | Address extraction status from index; not needed. |
| `notes` | N/A | `intentionally discarded` | Notes from geocoded point index; not needed. |

### Derived Fields

| Derived Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `distance_m` | `nearby_reverse_geocoded_points[].distance_m` | `derived only` | Computed Haversine distance between summit candidate and geocoded point. |
| `nearest_distance_m` | `nearest_distance_m` | `derived only` | Computed Haversine distance to the closest geocoded point. |
| `search_radius_m` | `search_radius_m` | `derived only` | The radius parameter used for search (e.g. `1000`). |
| `nearby_reverse_geocoded_points` | `nearby_reverse_geocoded_points` | `derived only` | Array of geocoded points within search radius, sorted by distance ascending. |
| `location_candidates` | `location_candidates` | `derived only` | Array of summarized unique location candidate objects with support counts. |
| `municipality_candidates` | N/A | `intentionally discarded` | Combined municipality field is discarded in favor of granular candidates (`city_candidates`, `town_candidates`, etc.). |
| `county_candidates` | `county_candidates` | `derived only` | Deduped list of county names from nearby points. |
| `city_candidates` | `city_candidates` | `derived only` | Deduped list of city names from nearby points. |
| `town_candidates` | `town_candidates` | `derived only` | Deduped list of town names from nearby points. |
| `village_candidates` | `village_candidates` | `derived only` | Deduped list of village names from nearby points. |
| `island_candidates` | `island_candidates` | `derived only` | Deduped list of island names from nearby points. |
| `local_candidates` | `local_candidates` | `derived only` | Deduped list of local landmark/section names from nearby points. |
| `prefecture_candidates` | `prefecture_candidates` | `derived only` | Deduped list of prefecture names from nearby points. |
| `location_evidence_status` | `location_evidence_status` | `derived only` | Outcome status (`nearby_reverse_geocode_found`, `no_nearby_reverse_geocode_point`, `invalid_candidate_coordinates`). |
| `location_evidence_level` | `location_evidence_level` | `derived only` | Confidence level based on distance (`very_strong`, `strong`, `weak_but_usable`, `none`). |
| `border_tolerance_applied` | `border_tolerance_applied` | `derived only` | Constant set to `true` to ensure boundary tolerance is active. |
| `needs_review` | `needs_review` | `derived only` | Boolean flag indicating if this record requires human validation. |
| `notes` | `notes` | `derived only` | Explanatory note for the review status. |

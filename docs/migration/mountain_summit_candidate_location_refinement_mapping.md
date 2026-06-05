# Mountain Summit Candidate Location Refinement Mapping

This document details the source-to-target field mapping and classifications for the municipality/island-based refinement stage of the mountain-to-summit candidate links.

## Source field classifications

The tables below classify every relevant field from the three input datasets and the newly derived refinement fields.

### 1. Primary Mountains Input (`data/03_primary/mountains/ehime_mountain_source_rows.json`)

| Source Field | Classification | Target Field | Target Role / Rationale |
| :--- | :--- | :--- | :--- |
| `mountain_no` | migrated | `mountain_no` | Unique mountain identifier key. |
| `name` | migrated | `mountain_name` | Original mountain name from Excel source. |
| `source_row_no` | derived only | `mountain_source_row_no` | Original spreadsheet row number. Used for review tracking. |
| `location` | partially migrated | `location_refinement.csv_location_raw` | Complex location metadata structure. Raw fields extracted. |
| `location.municipality_or_island` | derived only | `location_refinement.csv_location_normalized` | Cleaned raw administrative location description text. |
| `location.municipality` | derived only | `location_refinement.csv_municipality_normalized` | Cleaned municipality name used for exact/nearby matches. |
| `location.island` | derived only | `location_refinement.csv_island_normalized` | Cleaned island name used for island text containment matches. |
| `coordinates` | preserved as legacy reference | N/A | Coordinates object; not used in location refinement logic. |
| `coordinates.lat` | preserved as legacy reference | `mountain_csv_lat` | CSV latitude; not used in location refinement logic. |
| `coordinates.lon` | preserved as legacy reference | `mountain_csv_lon` | CSV longitude; not used in location refinement logic. |
| `elevation_m` | migrated | `mountain_elevation_m` | Elevation in meters used for reports/CSV output. |
| `yamap_url` | preserved as legacy reference | N/A | YAMAP reference URL; not used in location refinement. |

### 2. Candidate Links Input (`data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl`)

| Source Field | Classification | Target Field | Target Role / Rationale |
| :--- | :--- | :--- | :--- |
| `mountain_no` | migrated | `mountain_no` | Matches input candidate links. |
| `mountain_name` | migrated | `mountain_name` | Matches input candidate links. |
| `summit_candidate_id` | migrated | `summit_candidate_id` | Matches input candidate links. |
| `source_gpx_path` | migrated | `source_gpx_path` | Matches input candidate links. |
| `source_gpx_basename` | migrated | `source_gpx_basename` | Matches input candidate links. |
| `track_name` | migrated | `track_name` | Matches input candidate links. |
| `candidate_lat` | migrated | `candidate_lat` | Matches input candidate links. |
| `candidate_lon` | migrated | `candidate_lon` | Matches input candidate links. |
| `candidate_ele_m` | migrated | `candidate_ele_m` | Matches input candidate links. |
| `mountain_csv_lat` | migrated | `mountain_csv_lat` | Matches input candidate links. |
| `mountain_csv_lon` | migrated | `mountain_csv_lon` | Matches input candidate links. |
| `mountain_elevation_m` | migrated | `mountain_elevation_m` | Matches input candidate links. |
| `evidence` | partially migrated | `evidence` | Copied to output to preserve original evidence. |
| `evidence.location` | preserved as legacy reference | N/A | Legacy simple location evidence; preserved inside `evidence`. |
| `combined_candidate_score` | migrated | `combined_candidate_score` | Original score; preserved unchanged. |
| `candidate_rank_for_mountain` | preserved as legacy reference | N/A | Preserved inside original link structure only; re-ranked. |
| `candidate_rank_for_summit_candidate` | preserved as legacy reference | N/A | Preserved inside original link structure only; re-ranked. |
| `match_status` | preserved as legacy reference | N/A | Preserved inside original link structure; refined status is written. |
| `confidence` | preserved as legacy reference | N/A | Preserved inside original link structure. |
| `needs_human_review` | partially migrated | `needs_human_review` | Propagated and refined. |
| `review_reason_codes` | partially migrated | `review_reason_codes` | Propagated. |
| `notes` | partially migrated | `notes` | Propagated with updated refinement summary. |

### 3. Location Evidence Input (`data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl`)

| Source Field | Classification | Target Field | Target Role / Rationale |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | migrated | `summit_candidate_id` | Used to join location evidence with candidate links. |
| `nearest_distance_m` | derived only | N/A | Reference geocoding distance. |
| `nearest_geocoded_point_id` | derived only | N/A | Reference geocoding point ID. |
| `nearest_display_name` | migrated | `location_refinement.nearest_display_name` | Closest Nominatim display name. |
| `nearest_address` | migrated | `location_refinement.nearest_address` | Closest Nominatim address object. |
| `nearby_reverse_geocoded_points` | migrated | N/A | Consumed to derive nearby municipality/island text strings. |
| `location_candidates` | derived only | N/A | Consumed to verify simple location candidates list. |
| `prefecture_candidates` | derived only | N/A | Consumed to verify prefecture matches. |
| `county_candidates` | derived only | N/A | Consumed to verify county matches. |
| `city_candidates` | derived only | N/A | Consumed to verify city matches. |
| `town_candidates` | derived only | N/A | Consumed to verify town matches. |
| `village_candidates` | derived only | N/A | Consumed to verify village matches. |
| `island_candidates` | derived only | N/A | Consumed to verify island matches. |
| `local_candidates` | derived only | N/A | Consumed to verify local neighborhood matches. |
| `location_evidence_status` | derived only | N/A | Checked to verify if location data is available. |
| `location_evidence_level` | derived only | N/A | Checked to verify location data quality level. |
| `border_tolerance_applied` | derived only | N/A | Processed in boundary checks. |
| `needs_review` | derived only | N/A | Reference review flag. |
| `notes` | derived only | N/A | Reference geocoding processing notes. |

### 4. Derived & Refinement Fields

| Derived Field | Classification | Target Field / Output Path | Role / Rationale |
| :--- | :--- | :--- | :--- |
| `csv_location_normalized` | derived only | `location_refinement.csv_location_normalized` | NFKC-normalized cleaned `municipality_or_island` text. |
| `csv_municipality_normalized` | derived only | `location_refinement.csv_municipality_normalized` | NFKC-normalized cleaned `municipality` text. |
| `csv_island_normalized` | derived only | `location_refinement.csv_island_normalized` | NFKC-normalized cleaned `island` text. |
| `reverse_geocoding_location_texts` | derived only | `location_refinement.reverse_geocoding_location_texts` | Collection of display name and address text candidates. |
| `reverse_geocoding_municipality_candidates` | derived only | `location_refinement.reverse_geocoding_municipality_candidates` | All municipality candidate terms extracted from geocoding. |
| `reverse_geocoding_island_text_candidates` | derived only | `location_refinement.reverse_geocoding_island_text_candidates` | All island candidate terms extracted from geocoding. |
| `exact_municipality_match` | derived only | `location_refinement.exact_municipality_match` | Boolean flag indicating exact municipality overlap. |
| `nearby_municipality_match` | derived only | `location_refinement.nearby_municipality_match` | Boolean flag indicating nearby point municipality match. |
| `island_text_match` | derived only | `location_refinement.island_text_match` | Boolean flag indicating island text match. |
| `local_text_match` | derived only | `location_refinement.local_text_match` | Boolean flag indicating local text match. |
| `county_town_village_weak_match` | derived only | `location_refinement.weak_admin_match` | Boolean flag indicating weak county/town/village match. |
| `municipality_mismatch_warning` | derived only | `location_refinement.location_refinement_reason_codes` | Review code flag for boundary mismatch. |
| `boundary_tolerated_mismatch` | derived only | `location_refinement.boundary_tolerated_mismatch` | Boolean flag indicating mismatch that is tolerated. |
| `location_refinement_score` | derived only | `location_refinement.location_refinement_score` | Refinement score from 0.00 to 1.00 based on matching rules. |
| `location_refinement_level` | derived only | `location_refinement.location_refinement_level` | Classification level string representing location matching quality. |
| `location_refinement_reason_codes` | derived only | `location_refinement.location_refinement_reason_codes` | Reason codes explaining location matching decisions. |
| `location_refined_candidate_score` | derived only | `location_refined_candidate_score` | Re-weighted score: 0.85 * original_score + 0.15 * refinement_score. |
| `location_refined_rank_for_mountain` | derived only | `location_refined_rank_for_mountain` | Link rank within the same mountain after score refinement. |
| `location_refined_rank_for_summit_candidate` | derived only | `location_refined_rank_for_summit_candidate` | Link rank within the same summit candidate after score refinement. |
| `review_priority` | derived only | `review_priority` | Review priority classification: `high`, `medium`, `low`, or `deprioritized`. |
| `review_priority_reason_codes` | derived only | `review_priority_reason_codes` | Explanations for the assigned review priority level. |

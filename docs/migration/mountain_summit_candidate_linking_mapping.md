# Mountain Summit Candidate Linking Mapping

This document details the source-to-target field mapping classifications for the mountain-to-summit-candidate linking stage.

## Field Classifications

Every source field from the input datasets is classified here to ensure full traceability and accountability during this processing stage.

### From `data/03_primary/mountains/ehime_mountain_source_rows.json`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `mountain_no` | `mountain_no` | `migrated` | Unified effective mountain ID. |
| `csv_no` | N/A | `intentionally discarded` | Mapped via mountain_no, not needed in candidate links. |
| `source_row_no` | `mountain_source_row_no` | `migrated` | Index of row in raw source CSV. |
| `mountain_no_source` | N/A | `intentionally discarded` | Internal normalization metadata. |
| `mountain_no_status` | N/A | `intentionally discarded` | Internal normalization metadata. |
| `name` | `mountain_name` | `migrated` | Canonical mountain name. |
| `location` | N/A | `derived only` | Container object; sub-fields used in location evidence overlap checks. |
| `location.municipality_or_island` | N/A | `derived only` | Used in location evidence overlap check against geocoded candidates. |
| `location.municipality` | N/A | `derived only` | Used in location evidence overlap check against geocoded candidates. |
| `location.island` | N/A | `derived only` | Used in location evidence overlap check against geocoded candidates. |
| `coordinates` | N/A | `derived only` | Container object; sub-fields used for CSV-coordinate distance evidence. |
| `coordinates.lat` | `mountain_csv_lat` | `migrated` | Latitude from CSV source (may be null). |
| `coordinates.lon` | `mountain_csv_lon` | `migrated` | Longitude from CSV source (may be null). |
| `coordinates.raw` | N/A | `intentionally discarded` | Unparsed coordinate string. |
| `coordinates.source` | N/A | `intentionally discarded` | Coordinate source metadata. |
| `elevation_m` | `mountain_elevation_m` | `migrated` | Elevation in meters from CSV source. |
| `difficulty_rank` | N/A | `intentionally discarded` | Mountain difficulty rank (out of scope for candidate linking). |
| `entry_course_recommended` | N/A | `intentionally discarded` | Entry course metadata (out of scope for candidate linking). |
| `yamap_url` | N/A | `intentionally discarded` | YAMAP url reference (out of scope for candidate linking). |

### From `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | `summit_candidate_id` | `migrated` | Unique identifier for detected summit. |
| `candidate_status` | N/A | `preserved as raw snapshot` | Status remains unresolved in candidate list. |
| `source_gpx_path` | `source_gpx_path` | `migrated` | Path to raw GPX track. |
| `source_gpx_basename` | `source_gpx_basename` | `migrated` | Basename of raw GPX track. |
| `summit_candidate_gpx_path` | `summit_candidate_gpx_path` | `migrated` | Path to summit-candidate waypoint GPX file. |
| `summit_candidate_gpx_basename` | N/A | `intentionally discarded` | Redundant with summit_candidate_gpx_path. |
| `track_name` | `track_name` | `migrated` | Extracted GPX track name (often traverse peaks). |
| `candidate_index_in_gpx` | N/A | `intentionally discarded` | GPX segment index. |
| `lat` | `candidate_lat` | `migrated` | Latitude of candidate. |
| `lon` | `candidate_lon` | `migrated` | Longitude of candidate. |
| `ele_m` | `candidate_ele_m` | `migrated` | Elevation of candidate from GPX. |
| `waypoint_name` | N/A | `intentionally discarded` | Redundant with summit_candidate_id. |
| `waypoint_desc` | N/A | `intentionally discarded` | Generated waypoint description text. |
| `detection_stage` | N/A | `intentionally discarded` | Summit detection pipeline metadata. |
| `detection_parameters` | N/A | `intentionally discarded` | Summit detection parameters. |
| `manifest_trackpoint_count` | N/A | `intentionally discarded` | Track stats metadata. |
| `manifest_bounds` | N/A | `intentionally discarded` | Track stats metadata. |

### From `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | N/A | `preserved as raw snapshot` | Mapped via join key. |
| `nearest_distance_m` | N/A | `intentionally discarded` | Redundant. |
| `nearest_geocoded_point_id` | N/A | `intentionally discarded` | Redundant. |
| `nearest_display_name` | N/A | `intentionally discarded` | Redundant. |
| `nearest_address` | N/A | `intentionally discarded` | Redundant. |
| `nearby_reverse_geocoded_points` | N/A | `intentionally discarded` | Redundant list of all close points. |
| `location_candidates` | N/A | `derived only` | Used to evaluate municipality overlap. |
| `prefecture_candidates` | N/A | `derived only` | Used to evaluate prefecture overlap. |
| `county_candidates` | N/A | `derived only` | Used to evaluate county overlap. |
| `city_candidates` | N/A | `derived only` | Used to evaluate city overlap. |
| `town_candidates` | N/A | `derived only` | Used to evaluate town overlap. |
| `village_candidates` | N/A | `derived only` | Used to evaluate village overlap. |
| `island_candidates` | N/A | `derived only` | Used to evaluate island overlap. |
| `local_candidates` | N/A | `derived only` | Used to evaluate local subdivision overlap. |
| `location_evidence_status` | N/A | `intentionally discarded` | Geocoding lookup status code. |
| `location_evidence_level` | N/A | `intentionally discarded` | Geocoding lookup level code. |
| `border_tolerance_applied` | N/A | `intentionally discarded` | Boundary tolerance metadata. |
| `needs_review` | N/A | `intentionally discarded` | Boundary-specific review flag. |
| `notes` | N/A | `intentionally discarded` | Boundary-specific notes. |

### From `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `gpx_path` | N/A | `preserved as raw snapshot` | Mapped via join key. |
| `gpx_basename` | N/A | `preserved as raw snapshot` | Mapped via join key. |
| `gpx_sha256` | N/A | `intentionally discarded` | Checksum not needed in candidate links. |
| `gpx_track_name` | N/A | `preserved as raw snapshot` | Track name mapped via summit candidate records. |
| `candidate_dates_jst` | N/A | `intentionally discarded` | Inferred calendar dates. |
| `timezone_ambiguity` | N/A | `derived only` | Used to derive evidence.activity_link.timezone_ambiguity and review_reason_codes. |
| `timezone_sensitive` | N/A | `derived only` | Used to derive evidence.activity_link.timezone_sensitive and review reason timezone_sensitive_activity_link. |
| `date_match_status` | N/A | `intentionally discarded` | Date match code; superseded by enriched_match_status at this stage. |
| `date_candidate_count` | N/A | `derived only` | Used to derive activity-link ambiguity evidence and review flags. |
| `title_enriched_candidate_activities` | `yamap_activity_candidates` | `derived only` | Summarized list of candidate YAMAP activities. |
| `best_candidate` | `best_yamap_activity_candidate` | `derived only` | The proposed highest confidence YAMAP activity (may be null). |
| `enriched_match_status` | N/A | `derived only` | Used to derive evidence.activity_link.match_status. |
| `enriched_confidence` | N/A | `derived only` | Used to derive evidence.activity_link.confidence and the activity_link_score tier. |
| `combined_activity_link_score` | N/A | `derived only` | Used to derive evidence.activity_link.score and contributes to combined_candidate_score. |
| `needs_review` | N/A | `derived only` | Used to derive evidence.activity_link.needs_review and needs_human_review. |
| `review_reason_codes` | N/A | `derived only` | Used to derive evidence.activity_link.review_reason_codes and final review_reason_codes. |

### Derived / Target Fields

| Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- |
| `evidence` | `derived only` | Structured evidence object container. |
| `evidence.name` | `derived only` | Name comparison details (score, matches, tokens). |
| `evidence.elevation` | `derived only` | Elevation comparison details (score, tier, diff_m). |
| `evidence.csv_coordinate` | `derived only` | Coordinate distance details (score, tier, distance_m). |
| `evidence.location` | `derived only` | Administrative overlap details (score, level, matches). |
| `evidence.activity_link` | `derived only` | Title-enriched activity link match details (score, confidence). |
| `combined_candidate_score` | `derived only` | Deterministic combined match score in [0..1] range. |
| `candidate_rank_for_mountain` | `derived only` | 1-based rank of summit candidate for the given mountain (by score desc). |
| `candidate_rank_for_summit_candidate` | `derived only` | 1-based rank of mountain for the given summit candidate (by score desc). |
| `match_status` | `derived only` | Candidate link status (e.g. candidate_high_confidence). |
| `confidence` | `derived only` | Match confidence tier (high, medium, low, none). |
| `needs_human_review` | `derived only` | Boolean review flag. |
| `review_reason_codes` | `derived only` | Array of review trigger reason codes (e.g. weak_name_evidence). |
| `notes` | `derived only` | Readable summary of matches and warnings. |

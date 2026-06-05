# Mountain Summit Candidate Review Queue Compression Mapping

This document details the source-to-target field mapping and classifications for the review queue compression and conflict grouping stage of the mountain-to-summit candidate links.

## Source field classifications

The tables below classify every relevant field from the `location_refined_candidate_links.jsonl` input dataset and the newly derived compression/report fields.

### 1. Refined Candidate Links Input (`data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl`)

| Source Field | Classification | Target Field / Output CSV | Target Role / Rationale |
| :--- | :--- | :--- | :--- |
| `mountain_no` | migrated | `mountain_no` | Unique mountain identifier key. |
| `mountain_name` | migrated | `mountain_name` | Original mountain name. |
| `summit_candidate_id` | migrated | `summit_candidate_id` | Summit candidate identifier. |
| `source_gpx_path` | preserved as legacy reference | N/A | Full source GPX path; omitted in compact review CSVs but kept in memory. |
| `source_gpx_basename` | migrated | `source_gpx_basename` | GPX filename for grouping and easy file identification. |
| `track_name` | migrated | `track_name` | GPX track name segment. |
| `candidate_lat` | preserved as legacy reference | N/A | Latitude for mapping; kept in summit conflict CSV. |
| `candidate_lon` | preserved as legacy reference | N/A | Longitude for mapping; kept in summit conflict CSV. |
| `candidate_ele_m` | migrated | `candidate_ele_m` | Refinement candidate elevation. |
| `mountain_csv_lat` | preserved as legacy reference | N/A | Original CSV coordinate latitude. |
| `mountain_csv_lon` | preserved as legacy reference | N/A | Original CSV coordinate longitude. |
| `mountain_elevation_m` | migrated | `mountain_elevation_m` | Original Excel-sourced elevation. |
| `evidence` | partially migrated | `elevation_diff_m` | Extracted elevation differences for quick review. |
| `combined_candidate_score` | preserved as legacy reference | N/A | Pre-refinement combined score. |
| `candidate_rank_for_mountain` | migrated | `candidate_rank_for_mountain` | Pre-refinement rank for mountain. |
| `candidate_rank_for_summit_candidate` | migrated | `candidate_rank_for_summit_candidate` | Pre-refinement rank for summit candidate. |
| `match_status` | preserved as legacy reference | N/A | Original match status flag. |
| `confidence` | migrated | `confidence` | Candidate confidence level (`high`, `medium`, `low`, `none`). |
| `needs_human_review` | preserved as legacy reference | N/A | Generic review flag; replaced by review buckets. |
| `review_reason_codes` | migrated | `review_reason_codes` | Original link review reason codes. |
| `location_refinement` | partially migrated | `location_refinement_level`, `csv_municipality`, `csv_island`, `matched_terms`, `nearest_display_name` | Extracted location refined components for column display. |
| `location_refined_candidate_score` | migrated | `location_refined_candidate_score` | Post-refinement candidate score. |
| `location_refined_rank_for_mountain` | migrated | `location_refined_rank_for_mountain` | Post-refinement rank for mountain. |
| `location_refined_rank_for_summit_candidate` | migrated | `location_refined_rank_for_summit_candidate` | Post-refinement rank for summit candidate. |
| `review_priority` | migrated | `review_priority` | Pre-compression review priority. |
| `review_priority_reason_codes` | migrated | `review_priority_reason_codes` | Pre-compression review priority reason codes. |
| `notes` | migrated | `notes` | General explanation notes field. |

### 2. Derived Compression & Conflict Grouping Fields

| Derived Field | Classification | Target Field / Output CSV | Role / Rationale |
| :--- | :--- | :--- | :--- |
| `top1_for_mountain` | derived only | (internal logic filter) | Row represents post-refinement rank 1 for mountain. |
| `top3_for_mountain` | derived only | (internal logic filter) | Row represents post-refinement rank <= 3 for mountain. |
| `score_gap_to_next_candidate` | derived only | `score_gap_to_next_candidate` | Refined score difference between Rank 1 and Rank 2 for the same mountain. |
| `score_gap_from_top_candidate` | derived only | (internal logic filter) | Difference from top rank score (used for top-3 queue threshold checks). |
| `mutual_top1` | derived only | `mutual_top1` | Boolean indicating candidate is rank 1 for mountain AND mountain is rank 1 for candidate. |
| `mutual_top3` | derived only | `mutual_top3` | Boolean indicating candidate is rank <= 3 for mountain AND mountain is rank <= 3 for candidate. |
| `candidate_shared_by_multiple_mountains` | derived only | (internal logic filter) | Candidate is top-1 for more than one mountain. |
| `mountain_has_multiple_close_candidates` | derived only | (internal logic filter) | Mountain has multiple candidates within score threshold. |
| `gpx_group_id` | derived only | `source_gpx_basename` | Grouping key for grouping by source GPX basenames. |
| `summit_candidate_conflict_group_id` | derived only | `summit_candidate_conflict_group_id` / `summit_candidate_id` | Grouping key for conflict groupings. |
| `review_bucket` | derived only | `review_bucket` | Assigned bucket: `accept_candidate_after_map_check`, `resolve_conflict`, `check_close_alternatives`, `check_location_warning`, `low_priority`, `deprioritized`. |
| `compact_review_reason_codes` | derived only | `compact_review_reason_codes` | Explanation flags for compression prioritization. |
| `compact_review_priority` | derived only | `compact_review_priority` | Priority label for compressed reviews (`high`, `medium`, `low`). |

# Mountain Geographic Grounding Request Packet Mapping

This document audits and classifies all source, intermediate, and derived fields involved in the Stage 20 preparation stage for the external geographic grounding agent.

## Source Fields Mapping

These are the primary fields from the mountain source file (`ehime_mountain_source_rows.json`) and the location-stability-refined candidate links (`location_stability_refined_candidate_links.jsonl` and compact review CSV queues).

### 1. Mountain Source File (`ehime_mountain_source_rows.json`)

| Source Field | Ingestion/Migration Classification | Target Field / Destination | Rationale |
|---|---|---|---|
| `mountain_no` | `migrated` | `source_mountain.mountain_no` | Target mountain unique identifier. |
| `mountain_name` | `migrated` | `source_mountain.mountain_name` | Target mountain canonical name. |
| `name` | `migrated` | `source_mountain.mountain_name` | Duplicate of mountain name. |
| `source_row_no` | `migrated` | `source_row_no` | Source row tracking. |
| `location` | `migrated` | `source_mountain.municipality_or_island` | Structured location object. |
| `location.municipality_or_island` | `migrated` | `source_mountain.municipality_or_island` | Text location specifier from source. |
| `location.municipality` | `migrated` | `source_mountain.municipality` | Extracted source municipality. |
| `location.island` | `migrated` | `source_mountain.island` | Extracted source island (if any). |
| `coordinates` | `migrated` | `source_mountain.csv_lat`, `source_mountain.csv_lon` | Coordinates object. |
| `coordinates.lat` | `migrated` | `source_mountain.csv_lat` | Source lat coordinate. |
| `coordinates.lon` | `migrated` | `source_mountain.csv_lon` | Source lon coordinate. |
| `elevation_m` | `migrated` | `source_mountain.elevation_m` | Source mountain official elevation. |
| `yamap_url` | `migrated` | `source_mountain.yamap_url` | Source YAMAP reference URL. |

### 2. Location-Stability Links & Compact Review Queues

| Source Field | Actual Schema Field | Classification | Target Field / Destination | Rationale |
|---|---|---|---|---|
| `summit_candidate_id` | `summit_candidate_id` | `migrated` | `top1_candidate.summit_candidate_id` | Summit candidate identifier. |
| `source_gpx_basename` | `source_gpx_basename` | `migrated` | `top1_candidate.source_gpx_basename` | Source GPX file reference. |
| `source_gpx_path` | `source_gpx_path` | `migrated` | `top1_candidate.source_gpx_path` | Relative path to GPX. |
| `track_name` | `track_name` | `migrated` | `top1_candidate.track_name` | Name of matched track. |
| `candidate_lat` | `candidate_lat` | `migrated` | `top1_candidate.candidate_lat` | Candidate latitude coordinate. |
| `candidate_lon` | `candidate_lon` | `migrated` | `top1_candidate.candidate_lon` | Candidate longitude coordinate. |
| `candidate_ele_m` | `candidate_ele_m` | `migrated` | `top1_candidate.candidate_ele_m` | Candidate GPX elevation. |
| `mountain_csv_lat` | `mountain_csv_lat` | `migrated` | `top1_candidate.mountain_csv_lat` | CSV latitude for candidate. |
| `mountain_csv_lon` | `mountain_csv_lon` | `migrated` | `top1_candidate.mountain_csv_lon` | CSV longitude for candidate. |
| `mountain_elevation_m` | `mountain_elevation_m` | `migrated` | `top1_candidate.mountain_elevation_m` | Official mountain elevation. |
| `elevation_diff_m` | `elevation_diff_m` | `migrated` | `top1_candidate.elevation_diff_m` | Absolute elevation difference. |
| `location_stability_refined_candidate_score` | `location_stability_refined_candidate_score` | `migrated` | `top1_candidate.location_stability_refined_candidate_score` | Location-stability adjusted score. |
| `location_stability_rank_for_mountain` | `location_stability_refined_rank_for_mountain` | `migrated` | `top1_candidate.location_stability_rank_for_mountain` | Rank of candidate for mountain. |
| `location_stability_rank_for_summit_candidate` | `location_stability_refined_rank_for_summit_candidate` | `migrated` | `top1_candidate.location_stability_rank_for_summit_candidate` | Rank of mountain for candidate. |
| `score_gap_to_next_candidate` | `score_gap_to_next_candidate` | `migrated` | `top1_candidate.score_gap_to_next_candidate` | Score gap to next alternative. |
| `mutual_top1` | `mutual_top1` | `migrated` | `top1_candidate.mutual_top1` | Boolean indicating mutual top 1. |
| `mutual_top3` | `mutual_top3` | `migrated` | `top1_candidate.mutual_top3` | Boolean indicating mutual top 3. |
| `confidence` | `confidence` | `migrated` | `top1_candidate.confidence` | Confidence bucket. |
| `review_priority` | `review_priority` | `migrated` | `top1_candidate.review_priority` | Original review priority. |
| `compact_review_priority` | `compact_review_priority` | `migrated` | `top1_candidate.compact_review_priority` | Compact review priority (high/medium/low). |
| `review_bucket` | `review_bucket` | `migrated` | `top1_candidate.review_bucket` | Stage 18 queue bucket. |
| `location_stability_level` | `location_stability_bucket` | `migrated` | `top1_candidate.location_stability_level` | Location-stability bucket. |
| `location_stability_reason_codes` | `location_stability_reason_codes` | `migrated` | `top1_candidate.location_stability_reason_codes` | Location-stability reasons. |
| `municipality_match_status` | `evidence.location_stability.municipality_relation` | `migrated` | `top1_candidate.municipality_match_status` | Matches source municipality. |
| `municipality_adjacency_status` | `evidence.location_stability.reason_codes` | `migrated` | `top1_candidate.municipality_adjacency_status` | Checks if candidate is adjacent. |
| `municipality_incompatibility_status` | `evidence.location_stability.location_stability_bucket` | `migrated` | `top1_candidate.municipality_incompatibility_status` | Stability level incompatibility status. |
| `csv_municipality` | `csv_municipality` | `migrated` | `top1_candidate.csv_municipality` | CSV source municipality. |
| `csv_island` | `csv_island` | `migrated` | `top1_candidate.csv_island` | CSV source island. |
| `matched_terms` | `matched_terms` | `migrated` | `top1_candidate.matched_terms` | Shared terms in reverse geocoding. |
| `nearest_display_name` | `nearest_display_name` | `migrated` | `top1_candidate.nearest_display_name` | Nearest Nominatim geocoded place. |
| `review_reason_codes` | `review_reason_codes` | `migrated` | `top1_candidate.review_reason_codes` | Raw links review reason codes. |
| `review_priority_reason_codes` | `review_priority_reason_codes` | `migrated` | `top1_candidate.review_priority_reason_codes` | Review priority reason codes. |
| `compact_review_reason_codes` | `compact_review_reason_codes` | `migrated` | `top1_candidate.compact_review_reason_codes` | Compact review reasons. |
| `notes` | `notes` | `migrated` | `top1_candidate.notes` | Narrative diagnostic note. |

---

## Derived Fields (Target Output Fields)

These fields are generated as part of the Stage 20 preparation run.

| Target Field | Classification | Target File | Rationale |
|---|---|---|---|
| `selected_for_grounding` | `derived only` | `review_required_grounding_request_packets.jsonl` | Boolean flag indicating grounding selection. |
| `selection_reason_codes` | `derived only` | `review_required_grounding_request_packets.jsonl` | List of triggers that caused selection. |
| `grounding_request_id` | `derived only` | `review_required_grounding_request_packets.jsonl` | Unique identifier generated from SHA-256 hash. |
| `grounding_request_packet_id` | `derived only` | `review_required_grounding_request_packets.jsonl` | Identical to request ID. |
| `grounding_request_packet_path` | `derived only` | `review_required_grounding_request_selection.jsonl` | Repository-relative path to Markdown packet. |
| `grounding_context` | `derived only` | `review_required_grounding_request_packets.jsonl` | Full context structure for grounding. |
| `candidate_summary` | `derived only` | `review_required_grounding_request_packets.jsonl` | Text representation of candidates. |
| `conflict_summary` | `derived only` | `review_required_grounding_request_packets.jsonl` | Narrative conflict diagnostic text. |
| `prompt_text` | `derived only` | `review_required_request_packets/mountain_*.md` | Grounding agent prompt request text. |
| `expected_output_schema` | `derived only` | `review_required_request_packets/mountain_*.md` | Grounding agent response JSON schema. |
| `external_agent_instruction` | `derived only` | `review_required_request_packets/mountain_*.md` | Context-specific text prompt instruction. |

---

## Status Declarations

* **Unmigrated Gaps**: none
* **Needs Decision Items**: none
* **Existing Source Files Modified**: false
* **Reverse-geocoding/KSJ reference files deleted or modified**: false
* **Current Stage 18/19 location-stability artifacts modified**: false

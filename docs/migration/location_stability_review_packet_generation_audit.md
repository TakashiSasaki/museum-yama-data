# Location-Stability Review Packet Generation Audit

This document audits the source-to-target mapping, classifications, and provenance policies for the new location-stability review packets and decision template generation stage (Stage 19).

## Provenance and Ingestion Classifications

All inputs and output fields for these new stages (Stage 19) are classified below.

### 1. Ingestion / Source Data Fields (Inputs)

| Field/Path | Primary Role | Ingestion Classification | Notes |
|---|---|---|---|
| `mountain_no` in [compact_review_queue_top1.csv](file:///data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top1.csv) | Mountain key | `preserved as raw snapshot` | Input from Stage 18. |
| `mountain_name` in [compact_review_queue_top1.csv](file:///data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top1.csv) | Mountain name | `preserved as raw snapshot` | Input from Stage 18. |
| `summit_candidate_id` in compact queues | Suggested candidate ID | `preserved as raw snapshot` | Input from Stage 18. |
| `source_gpx_basename` in compact queues | GPX filename | `preserved as raw snapshot` | Input from Stage 18. |
| `track_name` in compact queues | Track name | `preserved as raw snapshot` | Input from Stage 18. |
| `candidate_ele_m` / `mountain_elevation_m` / `elevation_diff_m` in compact queues | Elevation metrics | `preserved as raw snapshot` | Input from Stage 18. |
| `location_refined_candidate_score` in compact queues | Adjusted candidate score | `preserved as raw snapshot` | Input from Stage 18. |
| `confidence` / `review_priority` / `compact_review_priority` / `review_bucket` in compact queues | Priorities and buckets | `preserved as raw snapshot` | Input from Stage 18. |
| `location_refinement_level` in compact queues | Location stability bucket | `preserved as raw snapshot` | Maps to `location_stability_bucket` (Stage 17 evidence). |
| `csv_municipality` in compact queues | Source municipality | `preserved as raw snapshot` | Mountain expected municipality. |
| `matched_terms` in compact queues | Municipality relation | `preserved as raw snapshot` | Maps to `municipality_relation` (Stage 17 evidence). |
| `nearest_display_name` in compact queues | Candidate municipality | `preserved as raw snapshot` | Maps to `candidate_center_municipality` (Stage 17 evidence). |
| `review_reason_codes` / `notes` in compact queues | Diagnostics and notes | `preserved as raw snapshot` | Input from Stage 18. |
| `candidate_lat` / `candidate_lon` in [location_stability_refined_candidate_links.jsonl](file:///data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl) | Coordinate coordinates | `preserved as raw snapshot` | Location stability coordinates input. |
| `evidence.location_stability` fields in [location_stability_refined_candidate_links.jsonl](file:///data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl) | Detailed stability features | `preserved as raw snapshot` | Includes `all_cardinal_1km_same`, `distance_stable_interior`, `center_distance_to_boundary_m`, `candidate_municipality_stability`. |

### 2. New Decision Template Fields (Stage 19 CSV Outputs)

| Field/Path | Primary Role | Classification | Notes |
|---|---|---|---|
| `mountain_no` | Ref key | `migrated` | Preserved from input top1 row. |
| `mountain_name` | Name | `migrated` | Preserved from input top1 row. |
| `suggested_summit_candidate_id` | Suggested ID | `migrated` | Mapped from top1 `summit_candidate_id`. |
| `suggested_candidate_score` | Suggested score | `migrated` | Mapped from top1 `location_refined_candidate_score`. |
| `suggested_candidate_confidence` | Suggested confidence | `migrated` | Mapped from top1 `confidence`. |
| `suggested_location_stability_bucket` | Suggested bucket | `migrated` | Mapped from top1 `location_refinement_level`. |
| `suggested_municipality_relation` | Suggested relation | `migrated` | Mapped from top1 `matched_terms`. |
| `suggested_candidate_municipality` | Suggested candidate mun | `migrated` | Mapped from top1 `nearest_display_name`. |
| `source_mountain_municipality` | Expected mountain mun | `migrated` | Mapped from top1 `csv_municipality`. |
| `accepted_summit_candidate_id` | Decision field | `derived only` | Empty by default (`""`). Fillable by human reviewer. |
| `decision_status` | Decision field | `derived only` | Initialized to `"pending_review"`. |
| `decision_reason` | Decision field | `derived only` | Empty by default (`""`). |
| `reviewer_notes` | Decision field | `derived only` | Empty by default (`""`). |
| `needs_followup` | Decision field | `derived only` | Initialized to `false`. |
| `map_checked` | Decision field | `derived only` | Initialized to `false`. |
| `packet_path` | Packet reference | `derived only` | Mapped to repo-relative path to the GPX group packet for this mountain. |
| `top3_candidate_ids` | Options field | `derived only` | Pipe-separated list of top-3 candidate IDs for this mountain. |
| `conflict_group_ids` | Options field | `derived only` | Pipe-separated list of conflict packet filenames/names. |
| `created_from_stage` | Provenance field | `derived only` | Initialized to `"location_stability_review_packets"`. |

### 3. New Review Packet Output Paths (Stage 19 Outputs)

| Path | Primary Role | Classification | Notes |
|---|---|---|---|
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/index.md` | Packets index | `derived only` | Lists GPX and candidate packets. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/gpx_groups/*.md` | GPX group packets | `derived only` | Grouped review files by GPX file. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/summit_candidate_groups/*.md` | Candidate packets | `derived only` | Grouped review files by summit candidate ID. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/mountain_groups/*.md` | Mountain packets | `derived only` | Mountain-specific details (included to assist human reviewers). |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packet_manifest.json` | Manifest | `derived only` | Includes file list and checksums. |
| `docs/migration/mountain_summit_candidate_location_stability_review_packet_report.md` | Report | `derived only` | Stage 19 completion summary report. |

---

## Status and Verification Declarations

* **Unmigrated gaps**: none
* **Needs decision items**: none
* **Existing source files modified**: false (No raw GPX, YAMAP Markdown, Nominatim caches, or primary mountains/summit candidates databases are modified).
* **Existing Stage 10/11/12 artifacts overwritten**: false (Existing Stage 12 decision templates and packets are fully preserved and untouched).
* **Reverse-geocoding artifacts deleted or modified**: false (Nominatim outputs and reverse-geocoding artifacts remain preserved).
* **DVC status**: not active; no DVC command executed.
* **Final coordinate generation**: out of scope (This stage generates human review aid documents only; it does not assign final coordinates or automatically accept candidates).
* **Automatic candidate acceptance**: out of scope.
* **Scope**: location-stability review packets and decision template only.

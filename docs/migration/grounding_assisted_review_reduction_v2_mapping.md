# Grounding-Assisted Review Reduction v2 Mapping Audit

## Purpose
This document maps every input field used to generate the Stage 25 Grounding-Assisted Review Queues v2, verifying the provenance and target classification.

## Input: `data/04_feature/mountain_summit_candidate_links/2026-06-06/grounding_assisted_candidate_links.jsonl` (Stage 23)

| Field | Target Classification | Notes |
|-------|-----------------------|-------|
| `candidate_ele_m` | migrated | Used for candidate matching and review display. |
| `candidate_lat` | migrated | Used for candidate matching and review display. |
| `candidate_lon` | migrated | Used for candidate matching and review display. |
| `candidate_rank_for_mountain` | preserved as legacy reference | Stage 23 rank, preserved for comparison but recalculated in Stage 25. |
| `candidate_rank_for_summit_candidate` | preserved as legacy reference | Preserved for reference. |
| `combined_candidate_score` | preserved as legacy reference | Replaced by `grounding_assisted_candidate_score` logic. |
| `confidence` | preserved as legacy reference | Legacy field. |
| `evidence` | migrated | Nested evidence block preserved for downstream review. |
| `grounding_assisted_candidate_score` | migrated | Primary sorting score. |
| `grounding_assisted_generation_status` | migrated | Generation context. |
| `grounding_distance_m` | migrated | Included in CSVs. |
| `grounding_distance_tier` | migrated | Included in CSVs. |
| `grounding_elevation_diff_m` | migrated | Included in CSVs. |
| `grounding_elevation_tier` | migrated | Context. |
| `grounding_match_status` | migrated | Included in CSVs. |
| `grounding_municipality_match_status` | migrated | Included in CSVs. |
| `grounding_name_match_status` | migrated | Included in CSVs. |
| `grounding_reason_codes` | migrated | Included in CSVs. |
| `grounding_reference_status` | migrated | Included in CSVs. |
| `grounding_review_reduction_class` | derived only | Intermediate field. |
| `match_status` | preserved as legacy reference | Legacy field. |
| `mountain_csv_lat` | migrated | Preserved for review. |
| `mountain_csv_lon` | migrated | Preserved for review. |
| `mountain_elevation_m` | migrated | Preserved for review. |
| `mountain_name` | migrated | Primary key attribute. |
| `mountain_no` | migrated | Primary key. |
| `mountain_source_row_no` | migrated | Context. |
| `needs_human_review` | derived only | Overridden by Stage 25 class. |
| `notes` | migrated | Debug notes preserved. |
| `review_reason_codes` | derived only | Generated anew in Stage 25. |
| `source_gpx_basename` | migrated | Provenance included in CSVs. |
| `source_gpx_path` | migrated | Provenance. |
| `summit_candidate_gpx_path` | migrated | Provenance. |
| `summit_candidate_id` | migrated | Candidate key. |
| `track_name` | migrated | Included in CSVs. |

## Input: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (Stage 22)

| Field | Target Classification | Notes |
|-------|-----------------------|-------|
| `coordinate_cluster_count` | migrated | |
| `coordinate_conflict` | migrated | Included in CSVs. |
| `evidence_links` | migrated | |
| `grounding_record_count` | migrated | |
| `grounding_reference_status` | migrated | |
| `grounding_statuses` | migrated | |
| `has_usable_coordinate` | migrated | Included in CSVs. |
| `mountain_name` | migrated | Primary key attribute. |
| `mountain_no` | migrated | Primary key. |
| `municipality_match_status` | migrated | |
| `name_match_status` | migrated | |
| `notes` | migrated | |
| `raw_response_refs` | preserved as raw snapshot | |
| `review_reason_codes` | migrated | |
| `selected_grounding_confidence_score` | migrated | |
| `selected_grounding_elevation_m` | migrated | |
| `selected_grounding_lat` | migrated | |
| `selected_grounding_lon` | migrated | |
| `selected_grounding_municipality` | migrated | |
| `source_mountain_name` | migrated | |
| `source_municipality` | migrated | |
| `usable_coordinate_record_count` | migrated | |

## Input: `data/04_feature/mountain_summit_candidate_links/2026-05-12/grounding_refined_candidate_links.jsonl` (Stage 21)

| Field | Target Classification | Notes |
|-------|-----------------------|-------|
| `best_yamap_activity_candidate` | preserved as legacy reference | |
| `candidate_ele_m` | preserved as legacy reference | Stage 23 coordinate is used instead. |
| `candidate_lat` | preserved as legacy reference | Stage 23 coordinate is used instead. |
| `candidate_lon` | preserved as legacy reference | Stage 23 coordinate is used instead. |
| `candidate_rank_for_mountain` | preserved as legacy reference | |
| `candidate_rank_for_summit_candidate` | preserved as legacy reference | |
| `combined_candidate_score` | preserved as legacy reference | |
| `confidence` | preserved as legacy reference | |
| `evidence` | preserved as legacy reference | |
| `grounding_bucket` | preserved as legacy reference | |
| `grounding_cluster_count` | preserved as legacy reference | |
| `grounding_confidence` | preserved as legacy reference | |
| `grounding_consensus` | preserved as legacy reference | |
| `grounding_distance_m` | preserved as legacy reference | |
| `grounding_distance_score` | preserved as legacy reference | |
| `grounding_evidence_count` | preserved as legacy reference | |
| `grounding_refined_candidate_score` | preserved as legacy reference | |
| `grounding_refined_rank_for_mountain` | preserved as legacy reference | |
| `grounding_refined_rank_for_summit_candidate` | preserved as legacy reference | |
| `grounding_refined_review_priority` | migrated | Critical field for Stage 21 carry-forward logic. |
| `grounding_refinement` | preserved as legacy reference | |
| `location_stability_bucket` | preserved as legacy reference | |
| `location_stability_reason_codes` | preserved as legacy reference | |
| `location_stability_refined_candidate_score` | preserved as legacy reference | |
| `location_stability_refined_rank_for_mountain` | preserved as legacy reference | |
| `location_stability_refined_rank_for_summit_candidate` | preserved as legacy reference | |
| `location_stability_refinement` | preserved as legacy reference | |
| `location_stability_review_priority` | preserved as legacy reference | |
| `match_status` | preserved as legacy reference | |
| `mountain_csv_lat` | preserved as legacy reference | |
| `mountain_csv_lon` | preserved as legacy reference | |
| `mountain_elevation_m` | preserved as legacy reference | |
| `mountain_name` | preserved as legacy reference | |
| `mountain_no` | migrated | Used to link. |
| `mountain_source_row_no` | preserved as legacy reference | |
| `needs_human_review` | preserved as legacy reference | |
| `notes` | preserved as legacy reference | |
| `review_reason_codes` | preserved as legacy reference | |
| `source_gpx_basename` | preserved as legacy reference | |
| `source_gpx_path` | preserved as legacy reference | |
| `summit_candidate_gpx_path` | preserved as legacy reference | |
| `summit_candidate_id` | migrated | Used to check top candidate agreement. |
| `track_name` | preserved as legacy reference | |
| `yamap_activity_candidates` | preserved as legacy reference | |

## Input: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/grounding_refined_review_queue.csv` (Stage 21)

| Field | Target Classification | Notes |
|-------|-----------------------|-------|
| `mountain_no` | migrated | Link key. |
| `mountain_name` | preserved as legacy reference | |
| `summit_candidate_id` | migrated | Link key. |
| `grounding_refined_score` | preserved as legacy reference | |
| `grounding_bucket` | preserved as legacy reference | |
| `grounding_distance_m` | preserved as legacy reference | |
| `grounding_consensus` | preserved as legacy reference | |
| `grounding_confidence` | preserved as legacy reference | |
| `location_stability_bucket` | preserved as legacy reference | |
| `location_stability_refined_score` | preserved as legacy reference | |
| `candidate_lat` | preserved as legacy reference | |
| `candidate_lon` | preserved as legacy reference | |
| `candidate_ele_m` | preserved as legacy reference | |
| `elevation_diff_m` | preserved as legacy reference | |
| `name_tier` | preserved as legacy reference | |
| `grounding_refined_review_priority` | migrated | Critical field for Stage 21 carry-forward logic. |
| `track_name` | preserved as legacy reference | |

## Input: `data/03_primary/mountains/ehime_mountain_source_rows.json`

| Field | Target Classification | Notes |
|-------|-----------------------|-------|
| `coordinates` | migrated | |
| `csv_no` | migrated | |
| `difficulty_rank` | migrated | |
| `elevation_m` | migrated | |
| `entry_course_recommended` | migrated | |
| `location` | migrated | |
| `mountain_no` | migrated | Primary key |
| `mountain_no_source` | migrated | |
| `mountain_no_status` | migrated | |
| `name` | migrated | Primary key attribute. |
| `source_row_no` | migrated | |
| `yamap_url` | migrated | |

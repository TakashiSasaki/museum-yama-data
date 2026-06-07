# Grounding-Assisted Review Reduction v3 Field Mapping Audit

## Stage 23 Candidate Links
| Field | Status | Notes |
|---|---|---|
| `mountain_no` | migrated | Used for joining and output context. |
| `mountain_name` | migrated | Used for output context. |
| `summit_candidate_id` | migrated | Preserved and used for equivalence checking. |
| `candidate_lat` | migrated | Used for 20m equivalence tolerance checking. |
| `candidate_lon` | migrated | Used for 20m equivalence tolerance checking. |
| `grounding_assisted_generation_status` | migrated | Used to check `no_candidate_marker`. |
| `grounding_distance_m` | migrated | Used for support logic (`<= 50m`, `<= 250m`). |
| `grounding_elevation_diff_m` | migrated | Used for strict support logic (`<= 10m`). |
| `grounding_name_match_status` | migrated | Used to check for exact match or contradiction. |
| `grounding_municipality_match_status` | migrated | Used to check for exact match or contradiction. |
| `grounding_assisted_candidate_score` | migrated | Used for ranking candidates and score gap checking. |

## Stage 25 Review Queue Outputs
| Field | Status | Notes |
|---|---|---|
| `mountain_no` | migrated | Used for cross-referencing Stage 25 active review set in diagnostics. |

## Stage 21 Grounding-Refined Candidate Links
| Field | Status | Notes |
|---|---|---|
| `mountain_no` | migrated | Used for joining. |
| `summit_candidate_id` | migrated | Used for checking top candidate ID agreement. |
| `candidate_lat` | migrated | Used for 20m fallback distance checking. |
| `candidate_lon` | migrated | Used for 20m fallback distance checking. |
| `grounding_refined_rank_for_mountain` | migrated | Used for finding top stage 21 candidate. |

## Stage 21 Review Queue
| Field | Status | Notes |
|---|---|---|
| `mountain_no` | migrated | Used for joining. |
| `grounding_refined_review_priority` | migrated | Examined to establish Stage 21 low-priority support signal. |
| `grounding_bucket` | preserved as legacy reference | Examined in diagnostics, but not primary signal for priority. |

## Grounding Reference Index
| Field | Status | Notes |
|---|---|---|
| `mountain_no` | migrated | Used for joining. |
| `reference_status` | migrated | Checked to ensure usability. |
| `cluster_consensus_status` | migrated | Used to detect coordinate conflicts. |
| `has_usable_coordinate` | migrated | Used to verify if evidence has coordinates. |
| `coordinate_conflict` | migrated | Extracted to signal grounding conflict. |

## Mountains Source JSON
| Field | Status | Notes |
|---|---|---|
| `mountain_no` | migrated | Primary loop driving key. |
| `name` | migrated | Provides fallback mountain name. |

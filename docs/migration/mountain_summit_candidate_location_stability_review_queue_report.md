# Mountain Summit Candidate Location Stability Review Queue Report

- **Branch and HEAD commit**: `museum-yama-data` (`1c0355f58259a8ece52390ef0de757dd5fd7aa02`)
- **Created at**: `2026-06-05T10:45:12.798Z`
- **Command used**: `generate-location-stability-compact-review-queues`

## Input Paths

| Input | Path |
|---|---|
| Location stability-refined links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl` |

## Output Paths

| Output | Path |
|---|---|
| Manifest JSON | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/manifest.json` |
| Top-1 Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top1.csv` |
| Top-3 Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top3.csv` |
| Conflict Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_conflicts.csv` |
| GPX Group CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/conflict_groups_by_gpx.csv` |
| Summit Candidate Conflict CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/conflict_groups_by_summit_candidate.csv` |
| Summary Markdown | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_summary.md` |
| Report Markdown | `docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md` |

## Summary Counts

| Metric | Count |
|---|---|
| Input refined links | 11372 |
| Mountains | 531 |
| Summit candidates | 496 |
| Top-1 queue rows | 531 |
| Top-3 queue rows | 1593 |
| Conflict queue rows | 4301 |
| GPX groups | 268 |
| Summit candidate conflict rows | 496 |
| Score gap threshold | 0.03 |

## Compact Review Bucket Definitions
- **accept_candidate_after_map_check**: Clear mutual top-1 rank, medium/high confidence, and no severe warnings.
- **resolve_conflict**: Candidate is top-ranked for multiple mountains, or mountain's top-1 candidate is not mutual top-1.
- **check_close_alternatives**: Rank 1 or top-3 candidate where the score gap between rank 1 and rank 2 is <= `0.03`.
- **check_location_warning**: Location stability warnings (boundary_plausible, adjacent_but_deep_inside, municipality_incompatible_strong) but name or elevation evidence is otherwise strong.
- **low_priority**: Rank > 3 candidates with no special conflicts.
- **deprioritized**: Pre-refinement deprioritized candidate at rank > 3.

## Review Priority Mapping
- **High**: Links in `resolve_conflict`, `check_location_warning`, and `check_close_alternatives` buckets.
- **Medium**: Links in `accept_candidate_after_map_check` bucket.
- **Low**: Links in `low_priority` and `deprioritized` buckets.

## Source Modification Status
**Source files and location stability-refined link inputs were NOT modified.**

## Next Recommended Steps
1. Open `conflict_groups_by_summit_candidate.csv` to resolve multi-mountain assignments.
2. Review `compact_review_queue_conflicts.csv` to confirm close alternative summits.
3. Validate clear mutual top-1 candidates in `compact_review_queue_top1.csv`.

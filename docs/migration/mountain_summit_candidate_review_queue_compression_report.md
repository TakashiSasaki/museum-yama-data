# Mountain Summit Candidate Review Queue Compression Report

- **Branch and HEAD commit**: `museum-yama-data` (`1100600c73f0f782600780153c9008472d14d9bc`)
- **Created at**: `2026-06-05T06:50:53.619Z`
- **Command used**: `generate-compact-mountain-summit-review-queues`

## Input Paths

| Input | Path |
|---|---|
| Location-refined links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl` |

## Output Paths

| Output | Path |
|---|---|
| Manifest JSON | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_manifest.json` |
| Top-1 Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top1.csv` |
| Top-3 Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top3.csv` |
| Conflict Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_conflicts.csv` |
| GPX Group CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_gpx.csv` |
| Summit Candidate Conflict CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_summit_candidate.csv` |
| Summary Markdown | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_summary.md` |
| Report Markdown | `docs/migration/mountain_summit_candidate_review_queue_compression_report.md` |

## Summary Counts

| Metric | Count |
|---|---|
| Input refined links | 11372 |
| Mountains | 531 |
| Summit candidates | 496 |
| Top-1 queue rows | 531 |
| Top-3 queue rows | 1593 |
| Conflict queue rows | 5747 |
| GPX groups | 268 |
| Summit candidate conflict rows | 496 |
| Score gap threshold | 0.03 |

## Compact Review Bucket Definitions
- **accept_candidate_after_map_check**: Clear mutual top-1 rank, medium/high confidence, and no severe warnings.
- **resolve_conflict**: Candidate is top-ranked for multiple mountains, or mountain's top-1 candidate is not mutual top-1.
- **check_close_alternatives**: Rank 1 or top-3 candidate where the score gap between rank 1 and rank 2 is <= `0.03`.
- **check_location_warning**: Location/boundary mismatch but name or elevation evidence is otherwise strong.
- **low_priority**: Rank > 3 candidates with no special conflicts.
- **deprioritized**: Pre-refinement deprioritized candidate at rank > 3.

## Review Priority Mapping
- **High**: Links in `resolve_conflict`, `check_location_warning`, and `check_close_alternatives` buckets.
- **Medium**: Links in `accept_candidate_after_map_check` bucket.
- **Low**: Links in `low_priority` and `deprioritized` buckets.

## Review Queue Compression Performance
- **Original link count**: 11,372
- **Top-1 review baseline queue**: 531 rows (1 row per mountain, a 95.3% reduction).
- **Top-3 alternative review queue**: 1593 rows (a 86.0% reduction).
- **Conflict-only prioritized queue**: 5747 rows (a 82.1% reduction).

This compression significantly reduces the manual workload. Resolving conflicts and close alternatives first provides the highest leverage for validating coordinate identities.

## Mapping Document
See: `docs/migration/mountain_summit_candidate_review_queue_compression_mapping.md`

## Validation Commands Run
```sh
npm test
```

## Source Modification Status
**Source files and location-refined link inputs were NOT modified.**

## Next Recommended Steps
1. Open `conflict_groups_by_summit_candidate.csv` to resolve multi-mountain assignments.
2. Review `compact_review_queue_conflicts.csv` to confirm close alternative summits.
3. Validate clear mutual top-1 candidates in `compact_review_queue_top1.csv`.

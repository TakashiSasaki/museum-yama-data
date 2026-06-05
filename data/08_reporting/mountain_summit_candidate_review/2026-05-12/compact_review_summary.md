# Refined Mountain Summit Candidate Review Queue Compact Summary

- **Input location-refined links**: 11372
- **Unique mountains**: 531
- **Unique summit candidates**: 496
- **Top-1 queue row count**: 531
- **Top-3 queue row count**: 1593
- **Conflict queue row count**: 5747
- **GPX group count**: 268
- **Summit candidate conflict rows**: 496
- **Score gap threshold**: 0.03

## Compact Review Bucket Distribution

- **accept_candidate_after_map_check**: 180
- **resolve_conflict**: 2924
- **check_close_alternatives**: 215
- **check_location_warning**: 2608
- **low_priority**: 5415
- **deprioritized**: 30

## Compact Review Priority Distribution

- **High**: 5747
- **Medium**: 180
- **Low**: 5445

## Next Recommended Review Steps

1. **Resolve Conflicts**: Start with [`conflict_groups_by_summit_candidate.csv`](conflict_groups_by_summit_candidate.csv) and [`conflict_groups_by_gpx.csv`](conflict_groups_by_gpx.csv). Grouping review by GPX tracks makes it easier to resolve traverses and multiple mountain matches along a ridge.
2. **Review Close Alternatives**: Open [`compact_review_queue_conflicts.csv`](compact_review_queue_conflicts.csv) and filter for `review_bucket = 'check_close_alternatives'`. Check cases where candidates have a score gap <= 0.03.
3. **Audit Location Mismatches**: Inspect candidates with `review_bucket = 'check_location_warning'` where name or elevation evidence is otherwise strong.
4. **Routine Map Check**: Validate [`compact_review_queue_top1.csv`](compact_review_queue_top1.csv) for `review_bucket = 'accept_candidate_after_map_check'`. These have clear mutual top-1 ranks and strong confidence.

See the full review report at [`docs/migration/mountain_summit_candidate_review_queue_compression_report.md`](../../../../docs/migration/mountain_summit_candidate_review_queue_compression_report.md).

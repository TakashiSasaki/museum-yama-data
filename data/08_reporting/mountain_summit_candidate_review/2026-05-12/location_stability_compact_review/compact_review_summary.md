# Location-Stability Refined Review Queue Compact Summary

- **Input stability-refined links**: 11372
- **Unique mountains**: 531
- **Unique summit candidates**: 496
- **Top-1 queue row count**: 531
- **Top-3 queue row count**: 1593
- **Conflict queue row count**: 4301
- **GPX group count**: 268
- **Summit candidate conflict rows**: 496
- **Score gap threshold**: 0.03

## Compact Review Bucket Distribution

- **accept_candidate_after_map_check**: 232
- **resolve_conflict**: 2865
- **check_close_alternatives**: 159
- **check_location_warning**: 1277
- **low_priority**: 1383
- **deprioritized**: 5456

## Compact Review Priority Distribution

- **High**: 4301
- **Medium**: 232
- **Low**: 6839

## Next Recommended Review Steps

1. **Resolve Conflicts**: Start with [`conflict_groups_by_summit_candidate.csv`](conflict_groups_by_summit_candidate.csv) and [`conflict_groups_by_gpx.csv`](conflict_groups_by_gpx.csv).
2. **Review Close Alternatives**: Open [`compact_review_queue_conflicts.csv`](compact_review_queue_conflicts.csv) and filter for `review_bucket = 'check_close_alternatives'`. Check cases where candidates have a score gap <= 0.03.
3. **Audit Location Mismatches**: Inspect candidates with `review_bucket = 'check_location_warning'` where name or elevation evidence is otherwise strong.
4. **Routine Map Check**: Validate [`compact_review_queue_top1.csv`](compact_review_queue_top1.csv) for `review_bucket = 'accept_candidate_after_map_check'`.

See the full review report at [`docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md`](../../../../../docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md).

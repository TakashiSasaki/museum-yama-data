# Refined Mountain Summit Candidate Linking Review Queue

- **Total mountains**: 531
- **Input candidate link records**: 11372
- **Output refined link records**: 11372
- **Review queue row count**: 9732
- **Exact municipality matches**: 2608
- **Nearby municipality matches**: 0
- **Island text matches**: 100
- **Weak admin matches**: 7
- **Local text matches**: 43
- **Boundary tolerated mismatches**: 8614
- **Unavailable location cases**: 0
- **Top-1 per mountain coverage**: 531 / 531
- **Review Priority Distribution**:
  - High: 9516
  - Medium: 588
  - Low: 1238
  - Deprioritized: 30

## Review Queue

Use the generated CSV queue [`location_refined_review_queue.csv`](location_refined_review_queue.csv) to perform manual validation. The queue has been significantly reduced from 11372 to 9732 rows.

## Next Recommended Steps

1. Open `location_refined_review_queue.csv` and review rows where `review_priority = 'high'`.
2. Prioritize resolving ambiguous top-ranked candidate assignments where the same physical summit candidate is matched to multiple mountains.
3. Check the boundary mismatch warnings where name and elevation evidence are otherwise strong.
4. After manual confirmation, compile the final resolved-mountain waypoint dataset.

See the full refinement report at [`docs/migration/mountain_summit_candidate_location_refinement_report.md`](docs/migration/mountain_summit_candidate_location_refinement_report.md).

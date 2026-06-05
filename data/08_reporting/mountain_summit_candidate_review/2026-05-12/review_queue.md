# Mountain Summit Candidate Linking Review Queue

- **Total mountains**: 531
- **Mountains with at least one candidate**: 531
- **Mountains without candidates**: 0
- **Total candidate link records**: 11372
- **High confidence links**: 0
- **Medium confidence links**: 1481
- **Low confidence links**: 4753
- **Weak/none confidence links**: 5138
- **Ambiguous mountains**: 531
- **Summit candidates linked to multiple mountains**: 496
- **Records requiring human review**: 11372

## Review Queue

Use the generated CSV queue [`review_queue.csv`](review_queue.csv) to perform manual validation.

## Next Recommended Step

1. Open `review_queue.csv` and review rows where `needs_human_review = true`.
2. Prioritize ambiguous mountains, shared summit candidates, low/weak confidence links, and all rows where `needs_human_review = true`.
3. After human validation, create a curated resolved-mountain waypoint dataset.

See the full report at [`docs/migration/mountain_summit_candidate_linking_report.md`](docs/migration/mountain_summit_candidate_linking_report.md).

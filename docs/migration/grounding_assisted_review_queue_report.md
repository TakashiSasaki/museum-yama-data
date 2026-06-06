# Grounding-Assisted Review Queue Report

- **Stage**: 24 — generate-grounding-assisted-review-queues
- **Created at**: `2026-06-06T10:07:51.568Z`
- **Git commit**: `552ce11303fed6af58c2c4f3b810d7addbf949b8`

## Review Queue Summary

| Metric | Count |
|---|---|
| Total mountains | 531 |
| Mountains covered | 531 |
| Coverage gap | 0 |
| Auto-supported (strict match) | 1 |
| Review required | 530 |
| Grounding conflicts | 38 |
| Review candidate links | 6078 |

## Reduction from Baseline

| Metric | Baseline | After Grounding | Reduction |
|---|---|---|---|
| Mountains needing review | 531 | 530 | 1 |

## Output Files

| File | Records |
|---|---|
| `auto_supported_candidates.csv` | 1 |
| `review_required_mountains.csv` | 530 |
| `review_required_candidates.csv` | 6078 |
| `grounding_conflicts.csv` | 38 |
| `summary.md` | — |

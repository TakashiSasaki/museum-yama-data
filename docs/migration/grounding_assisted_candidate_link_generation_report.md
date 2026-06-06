# Grounding-Assisted Candidate Link Generation Report

- **Stage**: 23 — generate-grounding-assisted-summit-candidate-links
- **Created at**: `2026-06-06T10:07:43.705Z`
- **Git commit**: `552ce11303fed6af58c2c4f3b810d7addbf949b8`

## Candidate Link Reduction

| Metric | Baseline (Stage 9) | Grounding-Assisted (Stage 23) | Reduction |
|---|---|---|---|
| Total candidate links | 11372 | 6079 | 5293 (46.5%) |
| Pruned candidates (logged) | — | 495 | — |

## Generation Summary

| Metric | Count |
|---|---|
| Total mountains | 531 |
| Total summit candidates | 496 |
| Grounded spatial search | 295 |
| Strict grounding match | 1 |
| Strong grounding nearby | 2 |
| Weak grounding nearby | 10 |
| Far grounding candidate | 21 |
| Grounding contradicted | 976 |
| Grounding unavailable (fallback) | 0 |
| Grounding coordinate conflict | 38 |
| Grounding no coordinate | 198 |
| No grounding response | 0 |
| Mountains auto-supported | 1 |
| Mountains with candidates | 488 |
| Mountains without candidates | 43 |

## Scoring Formula

```
strict_grounding_match:              0.95 + 0.05 * elevation_closeness
strong_grounding_nearby:             0.80 + 0.05 * name_score + 0.05 * elevation_closeness
weak_grounding_nearby:               0.60 + 0.05 * name_score + 0.05 * elevation_closeness
far_grounding_candidate:             0.40 + existing_blend * 0.6
grounding_contradicted_or_unrelated: existing_blend * 0.8
grounding_unavailable (fallback):    existing_blend
```

## Data Integrity

- Source files not modified
- Existing Stage 9–21 outputs preserved
- No final coordinates generated
- No candidates automatically accepted as canonical

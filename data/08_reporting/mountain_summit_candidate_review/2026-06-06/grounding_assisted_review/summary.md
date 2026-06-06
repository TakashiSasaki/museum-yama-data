# Grounding-Assisted Review Queue Summary

## Mountain Coverage

| Metric | Count |
|---|---|
| Total mountains | 531 |
| Mountains covered by candidate links | 531 |
| Coverage gap | 0 |
| Auto-supported (strict grounding match) | 1 |
| Review required | 530 |
| Grounding conflicts | 38 |

## Candidate Link Statistics

| Metric | Count |
|---|---|
| Total candidate links | 6079 |
| Strict grounding matches | 1 |
| Strong grounding nearby | 2 |
| Weak grounding nearby | 10 |
| Far grounding candidate | 21 |
| Grounding contradicted | 976 |
| Grounding unavailable (fallback) | 5026 |
| Pruned candidates | 0 |

## Review Burden Reduction

| Metric | Baseline | Grounding-Assisted | Reduction |
|---|---|---|---|
| Total candidate links | 11,372 | 6079 | 5293 |
| Mountains needing review | 531 | 530 | 1 |

## Review Files

- `auto_supported_candidates.csv` — 1 mountains excluded from review
- `review_required_mountains.csv` — 530 mountains for human review
- `review_required_candidates.csv` — 6078 candidate links for review
- `grounding_conflicts.csv` — 38 mountains with conflicting grounding

## Policy Notes

- Grounding evidence is auxiliary, not canonical
- Auto-supported candidates are not final accepted coordinates
- Missing Gemini coordinates are handled as unavailable evidence
- Duplicate Gemini records are consolidated by clustering

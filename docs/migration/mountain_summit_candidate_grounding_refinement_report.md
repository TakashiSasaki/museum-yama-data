# Mountain Summit Candidate Grounding Refinement Report

- **Branch and HEAD commit**: `museum-yama-data` (`5dd0544eebd8f765caba716c23cf5d91dc76ca63`)
- **Created at**: `2026-06-06T09:28:40.996Z`
- **Command used**: `refine-mountain-summit-candidate-links-by-grounding`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Location-Stability Refined Links (Stage 17) | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl` |
| Raw Grounding Responses | `data/01_raw/mountain_geographic_grounding/external_agent/2026-06-06/gemini_grounding_responses_raw.json` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Grounding Refined Links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/grounding_refined_candidate_links.jsonl` |
| Stage Manifest | `data/04_feature/mountain_summit_candidate_links/2026-05-12/grounding_refined_manifest.json` |
| Review CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/grounding_refined_review_queue.csv` |
| Review MD | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/grounding_refined_review_queue.md` |
| Stage Report | `docs/migration/mountain_summit_candidate_grounding_refinement_report.md` |

## Grounding Response Consolidation

| Metric | Count |
|---|---|
| Raw grounding records | 387 |
| Unique mountains with grounding | 337 |
| Mountains with coordinates | 333 |
| Mountains without coordinates | 4 |
| Single-cluster consensus | 294 |
| Weak consensus (close) | 1 |
| Weak consensus (moderate) | 2 |
| Conflicting clusters | 36 |

## Refinement Summary Metrics

| Metric | Count |
|---|---|
| Total input candidate links | 11372 |
| Total output refined links | 11372 |
| Mountains with grounding evidence | 333 |
| Mountains without grounding evidence | 198 |
| Grounding supported links | 7 |
| Grounding weakly supported links | 59 |
| Grounding neutral links | 4711 |
| Grounding weakened links | 6595 |
| Upgraded (review priority reduced) | 5 |
| Downgraded (review priority increased) | 1683 |

## Review Burden Reduction

| Metric | Before | After | Reduction |
|---|---|---|---|
| Links needing review (high/medium) | 3002 | 1314 | 1688 |
| Mountains needing review | 531 | 280 | 251 |
| Top-1 links needing review | 527 | 253 | 274 |

## Data Integrity Notes

- Input candidate links were not modified.
- This stage preserves all existing Stage 17 outputs.
- Grounding evidence is auxiliary only — no final coordinates are generated.
- Grounding responses with missing coordinates are treated as neutral evidence.
- Duplicate raw records are consolidated by clustering before scoring.

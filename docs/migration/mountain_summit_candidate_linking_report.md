# Mountain Summit Candidate Linking Report

- **Branch and HEAD commit**: `museum-yama-data` (`957efed813d30ecc26981b0256e32b4c248a23af`)
- **Created at**: `2026-06-05T03:25:41.244Z`
- **Command used**: `generate-mountain-summit-candidate-links`

## Input Paths

| Input | Path |
|---|---|
| Mountain source JSON | `C:\Users\takas\Desktop\museum-yama-data\data\03_primary\mountains\ehime_mountain_source_rows.json` |
| Summit candidates JSONL | `C:\Users\takas\Desktop\museum-yama-data\data\03_primary\summit_candidates\2026-05-12\summit_candidates.jsonl` |
| Location evidence JSONL | `C:\Users\takas\Desktop\museum-yama-data\data\04_feature\location_enrichment\summit_candidates\2026-05-12\summit_candidate_location_evidence.jsonl` |
| Activity links JSONL | `C:\Users\takas\Desktop\museum-yama-data\data\04_feature\activity_linking\gpx_yamap_candidate_links\2026-05-12\title_enriched_candidate_links.jsonl` |

## Output Paths

| Output | Path |
|---|---|
| Candidate links JSONL | `C:\Users\takas\Desktop\museum-yama-data\data\04_feature\mountain_summit_candidate_links\2026-05-12\candidate_links.jsonl` |
| Manifest | `C:\Users\takas\Desktop\museum-yama-data\data\04_feature\mountain_summit_candidate_links\2026-05-12\manifest.json` |
| Review queue CSV | `C:\Users\takas\Desktop\museum-yama-data\data\08_reporting\mountain_summit_candidate_review\2026-05-12\review_queue.csv` |
| Review queue Markdown | `C:\Users\takas\Desktop\museum-yama-data\data\08_reporting\mountain_summit_candidate_review\2026-05-12\review_queue.md` |
| Report | `C:\Users\takas\Desktop\museum-yama-data\docs\migration\mountain_summit_candidate_linking_report.md` |

## Input Record Counts

| Dataset | Count |
|---|---|
| Mountain source records | 531 |
| Summit candidate records | 496 |
| Location evidence records | 496 |
| Activity link records | 293 |

## Candidate Link Record Count

- **Total candidate link records** (including no-candidate rows): 11372
- **Real candidate links** (summit candidate found): 11372
- **No-candidate rows** (mountain with no summit candidate): 0

## Mountains With/Without Candidates

| Category | Count |
|---|---|
| Mountains with at least one candidate | 531 |
| Mountains without any candidate | 0 |

## Confidence Distribution

| Confidence | Count |
|---|---|
| High | 0 |
| Medium | 1481 |
| Low | 4753 |
| None/Weak | 5138 |

## Review Queue Summary

- **Ambiguous mountains**: 531
- **Summit candidates linked to multiple mountains**: 496
- **Records requiring human review**: 11372

## Scoring Formula

Combined score (deterministic, range 0..1):

```
combined = 0.35 * name_score
         + 0.20 * elevation_score
         + 0.20 * csv_coordinate_score
         + 0.10 * location_score
         + 0.15 * activity_link_score
```

## Name Normalization Rules

- NFKC normalization (handles full-width/half-width conversion)
- Lowercase
- Whitespace collapsed
- Tokenized by ・/／,，、spaces-（）+ delimiters
- Signals: GPX track token containment, YAMAP best title similarity, YAMAP any-title similarity
- Score = max(gpx_containment, yamap_best, yamap_any)

## Elevation Tier Rules

| Diff | Tier | Score |
|---|---|---|
| 0..10 m | strong | 1.0 |
| 10..30 m | medium | 0.7 |
| 30..50 m | weak | 0.4 |
| >50 m | warning | 0.1 |
| unavailable | unavailable | 0.0 |

## CSV Coordinate Tier Rules

| Distance | Tier | Score |
|---|---|---|
| 0..100 m | strong | 1.0 |
| 100..300 m | medium | 0.7 |
| 300..1000 m | weak | 0.4 |
| >1000 m | warning | 0.1 |
| unavailable | unavailable | 0.0 |

## Location Evidence Handling Policy

- Mountain source `municipality`, `island`, `municipality_or_island` compared against geocoded location candidates.
- Administrative boundary ambiguity is expected and does not cause hard rejection.
- Island evidence preserved separately.
- Mismatch generates `mismatch_warning` tier (score 0.1), not rejection.
- No geocoding data generates `unavailable` tier (score 0.0).

## Activity Link Handling Policy

- Joined by `source_gpx_basename`.
- `enriched_confidence` → activity_link_score: high=0.8, medium=0.5, low=0.2, none=0.0
- `timezone_sensitive` → adds `timezone_sensitive_activity_link` review reason.
- `needs_review` from activity link propagates to candidate link review.
- Activity-link ambiguity does not block candidate link generation.
- A high-confidence activity link does not prove which summit candidate corresponds to which mountain on traverses.

## Mapping Document

See: `docs/migration/mountain_summit_candidate_linking_mapping.md`

## Source Modification Status

**Source files were NOT modified.**

## Tests and Validation Commands Run

```sh
npm test
python -m compileall scripts src
```

## Known Limitations

- Candidate links are not final truth. They require human validation.
- Traverses may include multiple mountain names in one GPX track.
- A single summit candidate may appear plausible for multiple mountains.
- GPX elevation may be noisy (smoothed by pipeline but not GPS-accurate).
- CSV coordinates exist only for 31 out of 531 mountains.
- Reverse-geocoding evidence is loose and not final identity proof.
- Human review is required for low-confidence and ambiguous cases.
- Mountains without candidates need additional field investigation.

## Next Recommended Steps

1. Open `review_queue.csv` and resolve high-priority ambiguous cases.
2. For mountains with no candidates, investigate whether the summit was not detected (noise, prominence threshold) or whether the GPX track did not visit it.
3. After human validation, generate a curated resolved-mountain waypoint GPX dataset.

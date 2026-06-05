# Mountain Summit Candidate Location Refinement Report

- **Branch and HEAD commit**: `museum-yama-data` (`7755a384ad7d31e3ad6b6c7791615fe66479a915`)
- **Created at**: `2026-06-05T06:34:14.872Z`
- **Command used**: `refine-mountain-summit-candidate-links-by-location`

## Input Paths

| Input | Path |
|---|---|
| Mountain source JSON | `data/03_primary/mountains/ehime_mountain_source_rows.json` |
| Candidate links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl` |
| Location evidence JSONL | `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl` |

## Output Paths

| Output | Path |
|---|---|
| Refined candidate links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl` |
| Refined manifest | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_manifest.json` |
| Review queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_refined_review_queue.csv` |
| Review queue Markdown | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_refined_review_queue.md` |
| Report | `docs/migration/mountain_summit_candidate_location_refinement_report.md` |

## Summary Counts

| Metric | Count |
|---|---|
| Mountain records | 531 |
| Input candidate link records | 11372 |
| Output refined candidate link records | 11372 |
| Review queue rows | 9732 |
| Exact municipality matches | 2608 |
| Nearby municipality matches | 0 |
| Island text matches | 100 |
| Local text matches | 43 |
| Weak admin matches | 7 |
| Boundary tolerated mismatches | 8614 |
| Unavailable location cases | 0 |
| High review priority links | 9516 |
| Medium review priority links | 588 |
| Low review priority links | 1238 |
| Deprioritized links | 30 |
| Top-1 per mountain coverage | 531 / 531 |

## Source Schema Observations
- Mountain records contain `location` fields: `municipality_or_island`, `municipality`, and `island`.
- Reverse geocoding evidence contains candidate locations with names, types, and nearby reverse-geocoded points with display names and address details.
- Original candidate links have `combined_candidate_score` and `evidence.location` (simple location tier).

## Location Normalization Rules
- NFKC unicode normalization.
- Trim and whitespace collapse.
- Japanese place names: do not delete meaningful suffixes (市, 町, 村, 郡, 島).
- Suffix-stripped versions (e.g. "松山" instead of "松山市") are computed dynamically for matching but raw/normalized forms are preserved.

## Municipality/Island Matching Rules
- **exact_municipality_match** (score 1.00): CSV municipality matches (normalized or suffix-stripped) nearest geocoding city/town/village/county/location candidate or nearest address terms.
- **island_text_match** (score 0.90): CSV island is contained in nearest or nearby island/local/display_name/address text.
- **nearby_municipality_match** (score 0.75): CSV municipality matches nearby point city/town/village/county.
- **local_text_match** (score 0.55): CSV municipality_or_island is contained in local/display_name/address text of nearest or nearby points.
- **weak_admin_match** (score 0.40): CSV municipality weakly matches geocoding candidates by partial text/substring containment.
- **boundary_tolerated_mismatch** (score 0.20): geocoding data is available but doesn't overlap; warning generated.
- **unavailable** (score 0.00): insufficient CSV or geocoding data.

## Scoring Formula
Re-weighted score combines original score with location refinement score:
```
location_refined_candidate_score = 0.85 * combined_candidate_score + 0.15 * location_refinement_score
```

## Ranking Rules
- Re-ranks candidate links for each mountain by refined score descending, tie-breaking by `summit_candidate_id` alphabetically.
- Re-ranks candidate links for each summit candidate by refined score descending, tie-breaking by `mountain_no` numerically.

## Review Queue Inclusion Policy
Includes:
- All high review priority records (includes ambiguous top-1 links and strong evidence mismatch).
- All top-1 candidates per mountain.
- Top-3 candidates per mountain if score difference between rank 1 and rank 2 is small (<= 0.05).
- All no-candidate rows.

## Known Limitations
- Municipality evidence is not final proof of peak identity.
- Mountain summits frequently lie on administrative boundaries (causing tolerated mismatches).
- Reverse geocoding may return nearby roads or settlements rather than the summit's administrative name.
- Island candidates may be absent in geocoding lists even when island information exists in display text.
- Human review remains required for ambiguous cases.

## Mapping Document
See: `docs/migration/mountain_summit_candidate_location_refinement_mapping.md`

## Validation Commands Run
```sh
npm test
```

## Source Modification Status
**Source files were NOT modified.**

## Next Recommended Steps
1. Open `location_refined_review_queue.csv` and review high-priority rows.
2. Manually verify and resolve conflicts where a single summit candidate is top-ranked for multiple mountains.
3. Confirm final accepted coordinate sets.

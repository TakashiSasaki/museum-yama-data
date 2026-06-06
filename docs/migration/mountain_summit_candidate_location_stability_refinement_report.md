# Mountain Summit Candidate Location Stability Refinement Report

- **Branch and HEAD commit**: `museum-yama-data` (`1c0355f58259a8ece52390ef0de757dd5fd7aa02`)
- **Created at**: `2026-06-05T10:45:06.754Z`
- **Command used**: `refine-mountain-summit-candidate-links-by-location-stability`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Candidate Links (Stage 9) | `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl` |
| Mountain Source rows | `data/03_primary/mountains/ehime_mountain_source_rows.json` |
| Municipality Adjacency | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` |
| Municipality Stability (Stage 16) | `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Refined Links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl` |
| Stage Manifest | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_manifest.json` |
| Review CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_refined_review_queue.csv` |
| Review MD | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_refined_review_queue.md` |
| Stage Report | `docs/migration/mountain_summit_candidate_location_stability_refinement_report.md` |

## Summary Metrics

| Metric | Count |
|---|---|
| Input candidate links | `11372` |
| Output refined links | `11372` |
| Mountain records | `531` |
| Stability records | `496` |
| Strong match (`location_strong_match`) | `2155` |
| Plausible boundary (`boundary_plausible`) | `635` |
| Incompatible municipality (`municipality_incompatible_strong`) | `2647` |
| Adjacent but deep inside (`adjacent_but_deep_inside`) | `1155` |
| Uncertain location (`location_uncertain_keep`) | `3878` |
| Missing location evidence (`missing_location_evidence`) | `902` |
| Deprioritised by stability | `6933` |

## Policy Statement on Reverse Geocoding

Nominatim geocoding remains preserved as historical context. Future municipality consistency checks prefer Kokudo Suchi Joho (KSJ) administrative-area polygon lookups because they are fully offline, reproducible, and authoritative.

## Source Modification Status

- **Source files modified**: `false` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Reverse geocoding artifacts deleted or modified**: `false`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

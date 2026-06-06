# Mountain Summit Candidate Location Stability Review Packet Report

- **Branch and HEAD commit**: `museum-yama-data` (`d343e5633cbe7a99d458d169f9ca6020d51e5a14`)
- **Created at**: `2026-06-05T11:02:18.726Z`
- **Command used**: `generate-location-stability-review-packets`

## Input Paths

| Input | Path |
|---|---|
| Top-1 compact queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top1.csv` |
| Top-3 compact queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top3.csv` |
| Conflicts compact queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_conflicts.csv` |
| GPX groups CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/conflict_groups_by_gpx.csv` |
| Summit candidate groups CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/conflict_groups_by_summit_candidate.csv` |
| Refined links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl` |

## Output Paths

| Output | Path |
|---|---|
| Manifest JSON | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packet_manifest.json` |
| Decision Template CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv` |
| Review Packets Output Dir | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets` |
| Index Markdown | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/index.md` |
| Report Markdown | `docs/migration/mountain_summit_candidate_location_stability_review_packet_report.md` |

## Summary Counts

| Metric | Count |
|---|---|
| Top-1 queue rows | 531 |
| Top-3 queue rows | 1593 |
| Conflict queue rows | 4301 |
| GPX group rows | 268 |
| Summit candidate group rows | 496 |
| Decision template rows | 531 |
| Initial pending review decisions | 531 |
| Prefilled accepted candidates | 0 |
| GPX group packet count | 268 |
| Summit candidate packet count | 496 |
| Mountain packet count | 531 |

## Review Packet and Decision Policy Summary

This stage compiles human-review packets and a decision template to structure manual coordinate validation:
- **GPX group packets**: Located under `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/gpx_groups/`. Groups mountains and candidate peaks crossed on the same hike/traverse.
- **Summit candidate conflict packets**: Located under `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/summit_candidate_groups/`. Resolves overlapping mountain claims for the same coordinate peak.
- **Mountain packets**: Located under `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/mountain_groups/`. Mountain-specific coordinate and candidate analysis files.
- **Decision Template**: A template located at `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv`. Initialized to `pending_review` with blank decision fields.

## Known Limitations

- Location stability is strong evidence but does not constitute final identity proof.
- Suggested candidates are not final coordinate selections; map check is still required.
- GPX tracks may include traverses and multiple mountains, which require manual group-level review.
- Final coordinate generation remains future work.

## Validation Commands Run
```sh
npm test
```

## Source Modification Status
- **Source files modified**: `false` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Existing Stage 12 outputs overwritten**: `false` (Stage 12 packets/templates remain fully preserved.)
- **Reverse geocoding artifacts deleted or modified**: `false`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

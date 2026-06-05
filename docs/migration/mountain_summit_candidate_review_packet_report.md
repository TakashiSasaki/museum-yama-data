# Mountain Summit Candidate Review Packet Report

- **Branch and HEAD commit**: `museum-yama-data` (`72a3fff3b626fad151a12d0ab9352c9ac7672b1f`)
- **Created at**: `2026-06-05T07:35:34.692Z`
- **Command used**: `generate-mountain-summit-review-packets`

## Input Paths

| Input | Path |
|---|---|
| Review directory | `data/08_reporting/mountain_summit_candidate_review/2026-05-12` |

## Output Paths

| Output | Path |
|---|---|
| Manifest JSON | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packet_manifest.json` |
| Decision Template CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_decisions_template.csv` |
| Review Packets Output Dir | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets` |
| Index Markdown | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/index.md` |
| Report Markdown | `docs/migration/mountain_summit_candidate_review_packet_report.md` |

## Summary Counts

| Metric | Count |
|---|---|
| GPX group input rows | 268 |
| Summit candidate conflict input rows | 496 |
| Top-1 queue rows | 531 |
| Generated GPX group packets | 268 |
| Generated summit candidate packets | 496 |
| Decision template rows | 531 |
| Initial pending_review decisions | 531 |

## Review Packet and Decision Policy Summary

This stage compiles human-review packets and a decision template to structure manual coordinate validation:
- **GPX group packets**: Located under `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/gpx_groups/`. Groups mountains and candidate peaks crossed on the same hike/traverse.
- **Summit candidate conflict packets**: Located under `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/summit_candidate_groups/`. Resolves overlapping mountain claims for the same coordinate peak.
- **Decision Template**: A prefilled template located at `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_decisions_template.csv`. Initialized to `pending_review` with blank decision fields.

See the complete decision policy at [`docs/migration/mountain_summit_review_decision_policy.md`](docs/migration/mountain_summit_review_decision_policy.md).

## Mapping Document
See: [`docs/migration/mountain_summit_candidate_review_packet_mapping.md`](docs/migration/mountain_summit_candidate_review_packet_mapping.md)

## Validation Commands Run
```sh
npm test
```

## Source Modification Status
**Source files, location-refined link inputs, and compact review CSVs were NOT modified.**

## Known Limitations
- Review packets do not automatically resolve identities.
- Suggested candidates are not accepted candidates.
- Map/GIS inspection may still be required to verify coordinates.
- GPX tracks with traverses require group-level judgment.
- Final coordinate generation must wait for a validated human-filled decision table.

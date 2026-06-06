# Mountain Geographic Grounding Request Packet Report

- **Branch and HEAD commit**: `museum-yama-data` (`c3ee0d111b3c1f5401228ab2ce480af92e38a1f1`)
- **Command used**: `generate-review-required-geographic-grounding-requests`
- **Created at**: `2026-06-05T12:27:26.698Z`
- **Mapping Document**: `docs/migration/mountain_geographic_grounding_request_packet_mapping.md`

## Input Files

| Input | Path | SHA-256 |
|---|---|---|
| Mountain Sources | `data/03_primary/mountains/ehime_mountain_source_rows.json` | `e3fcddb965e5e643d5e1c173da5d94c71da5c776c409310bd1612a3600b6c8c4` |
| Refined Links JSONL | `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl` | `a3e4ea54c296599cc908d2903aff79f125bb3dcb63abba310b7f132757bbb125` |
| Top-1 Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top1.csv` | `593f75886b8d9c4542e58c2c7d0b5f834a6bc77809e247a7bbfcc6c74ec73a9b` |
| Top-3 Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top3.csv` | `10fbdbbdd7b91897d795e9255174e9c5616d8c98c352821cbd311737a23cc236` |
| Conflicts Queue CSV | `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_conflicts.csv` | `21ef7e6ff05b7644e9cccf8badaf7dadcc0d20af4fc99829e69fd4ad73dc71d8` |

## Generated Outputs

- Selected Mountain Count: **366**
- Excluded Mountain Count: **165**
- Machine request packets count: **366**
- Markdown packets count: **366**
- Submission Queue CSV rows: **366**

## Selection Reasons Summary

| Reason Code | Selected Count |
|---|---|
| `review_bucket_resolve_conflict` | 298 |
| `compact_review_priority_high` | 298 |
| `compact_reason_shared_candidate` | 280 |
| `prio_reason_shared_top` | 278 |
| `prio_reason_top_ambiguous` | 295 |
| `stability_level_location_uncertain_keep` | 113 |
| `municipality_stability_boundary_ambiguous` | 99 |
| `mutual_top1_false` | 186 |
| `compact_reason_not_mutual_top1` | 186 |
| `municipality_stability_near_boundary` | 104 |
| `stability_level_adjacent_but_deep_inside` | 4 |
| `stability_level_boundary_plausible` | 14 |
| `municipality_stability_outside_prefecture` | 8 |

## Review Buckets Breakdown among Selected

| Review Bucket | Selected Count |
|---|---|
| `resolve_conflict` | 364 |
| `low_priority` | 262 |
| `check_location_warning` | 282 |
| `check_close_alternatives` | 114 |
| `accept_candidate_after_map_check` | 68 |

## Machine-Readable Request Packet Schema

All generated JSONL request packets contain structured metadata including:
- `grounding_request_id`: unique request hash
- `mountain_no`: source mountain ID
- `mountain_name`: source mountain name (mapped primarily from the `name` field in `ehime_mountain_source_rows.json`, with `mountain_name` used only as a compatibility fallback)
- `selection`: reasons and source buckets
- `source_mountain`: original source properties (coordinates, elevation, municipality)
- `top1_candidate`: details of suggest top-1 summit candidate
- `top3_candidates`: list of top-3 alternatives
- `external_agent_task`: prompt string instructing the grounding agent to resolve true coordinates

## Known Limitations

- **Geographic grounding is auxiliary evidence only**: The resulting coordinates are not automatically accepted.
- **Agent prompts do not execute the call**: Packets are generated and must be processed downstream by the grounding execution stage.
- **Elevation and Municipality references are approximate**: Derived candidate properties represent matching GPX track points.

## Next Steps

1. Review the submission queue [`review_required_grounding_submission_queue.csv`](data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_submission_queue.csv).
2. Submit pending packets to the grounding agent.
3. Validate and project responses into decision layers.

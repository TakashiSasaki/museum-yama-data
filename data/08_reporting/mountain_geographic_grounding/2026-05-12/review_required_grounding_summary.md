# Review Required Geographic Grounding Summary

This summary captures the counts and outcomes of the Stage 20 preparation stage for the external geographic grounding agent.

- **Selected Mountains**: 366
- **Excluded Mountains**: 165

## Selection Reasons Breakdown

| Reason Code | Count |
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

| Review Bucket | Count |
|---|---|
| `resolve_conflict` | 364 |
| `low_priority` | 262 |
| `check_location_warning` | 282 |
| `check_close_alternatives` | 114 |
| `accept_candidate_after_map_check` | 68 |

## Generated Output Files

- Machine-readable packets JSONL: `data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_packets.jsonl`
- Selection log JSONL: `data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_selection.jsonl`
- Packets Index Markdown: `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_request_packets/index.md`
- Submission Queue CSV: `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_submission_queue.csv`
- Summary Markdown: `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_summary.md`

## Next Steps

1. Review the submission queue CSV and decide which packets to submit.
2. Submit the packets to the external grounding agent and retrieve raw response files.
3. Save the raw response files to `data/01_raw/external_geographic_grounding/`.

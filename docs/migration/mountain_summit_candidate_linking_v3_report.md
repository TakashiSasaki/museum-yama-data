# Mountain Summit Candidate Linking V3 Report

- **Branch**: museum-yama-data
- **Command used**: `generate-mountain-summit-candidate-links-v3`
- **Source immutability confirmation**: Yes, no source files were modified.
- **Existing legacy outputs overwritten**: false

## Input Data
- Mountains: data/03_primary/mountains/ehime_mountain_source_rows.json (531)
- Summit Candidates: data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl (496)
- Activity Links: data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl
- Grounding Reference: data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl
- Municipality Lookup: data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl
- Municipality Stability: data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl
- Municipality Adjacency: data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json

## Output Data
- Candidate Links: data/04_feature/mountain_summit_candidate_links/2026-06-07-v3/v3_candidate_links.jsonl
- Pruned Log: data/04_feature/mountain_summit_candidate_links/2026-06-07-v3/v3_pruned_candidate_log.jsonl
- Manifest: data/04_feature/mountain_summit_candidate_links/2026-06-07-v3/v3_candidate_links_manifest.json
- Review Directory: data/08_reporting/mountain_summit_candidate_review/2026-06-07-v3

## Mapping Audits
- Source Coverage Audit: docs/migration/mountain_summit_candidate_linking_v3_source_coverage_audit.md
- Source To Target Mapping: docs/migration/mountain_summit_candidate_linking_v3_source_to_target_mapping.md

## Policies
- **Candidate Generation Policy**: Grounding-first, constrained fallback strategy. No Cartesian product.
- **Grounding Usage Policy**: Grounding coordinate used as auxiliary spatial evidence. Strict (≤ 50 m), Strong (≤ 250 m), Weak (≤ 500 m), Exploratory (≤ 1000 m).
- **Municipality Evidence Policy**: Used for scoring, downgrade, and review-priority. Does not create candidates alone.
- **Name Matching Policy**: Japanese-safe normalized text matching. Tiers: strong, medium, weak, none.
- **Elevation Usage Policy**: Adjusts ranking but does not create candidates alone.
- **Activity-link Usage Policy**: Adjusts ranking and review priority but does not create candidates alone.
- **Scoring Formula**:
  - Grounding Strict: 0.95 + elevation boost
  - Grounding Strong: 0.80 + name boost + elevation boost
  - Grounding Weak: 0.60 + name boost + elevation boost
  - Grounding Exploratory: 0.40
  - Fallback CSV Strong: 0.8 + name boost
  - Fallback CSV Medium: 0.7 + name boost
  - Fallback CSV Weak: 0.6 + name boost
  - Fallback Name + Municipality: 0.65
  - Fallback Name Only: 0.55

## Summary Counts
- Total Mountains Checked: 531
- Mountains with Candidates: 473
- Mountains without Candidates: 58
- Total Candidates Generated: 1830

### Strategy Counts
- Strict Grounding: 0
- Strong Grounding: 0
- Weak Grounding: 0
- Exploratory Grounding: 0
- Fallback Candidates: 473

### Review Category Counts
- Auto Supported: 0
- Review Deferred: 0
- Review Required: 110
- Conflict Cases: 363
- No Candidate: 58

## Tests & Validation
- Tests: test_mountain_summit_candidate_linking_v3.js covers Japanese-safe matching, distance, municipality, deterministic ranking, output collisions.
- Validation: All 531 mountains exactly accounted for. Scores bounded to [0,1]. Existing Stage 9-25 outputs were NOT overwritten. Source files NOT modified.

## Known Limitations
- Candidate links are not final truth.
- Gemini grounding is auxiliary evidence only.
- A candidate marked auto-supported is not canonical.
- Traverses may include multiple mountain names in one GPX track.
- A single summit candidate may be plausible for multiple mountains.
- GPX elevation may be noisy.
- CSV coordinates exist only for some mountains.
- Municipality boundaries may be ambiguous near borders.
- Human review remains required for ambiguous and conflict cases.

## Next Steps
- Human review of the review queues.
- Stage 26 completion and migration to canonical records.

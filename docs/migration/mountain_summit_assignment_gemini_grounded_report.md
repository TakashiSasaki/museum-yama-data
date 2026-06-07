# Mountain Summit Assignment (Gemini-Grounded) Validation Report

## Execution Metadata
* **Branch**: `museum-yama-data`
* **Execution Base Commit**: `b8c634d42bb4b17fd83da7c349d20eb14b4bfdf0` (The HEAD commit at which the command was executed)
* **Outputs Committed In**: `6966f071fd56c552bcb139bfbd6e42c51d979475` (The commit containing the generated assignment outputs and report)
* **Command Executed**: 
  ```sh
  node .agents/skills/yama-data-pipeline/cli.js assign-mountain-summits-gemini-grounded \
    --mountains data/03_primary/mountains/ehime_mountain_source_rows.json \
    --summit-candidates data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl \
    --grounding-reference data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl \
    --municipality-lookup data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl \
    --municipality-stability data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl \
    --municipality-adjacency data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json \
    --out data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/proposed_summit_assignments.jsonl \
    --candidate-support-links data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/candidate_support_links.jsonl \
    --pruned-log data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/pruned_candidate_log.jsonl \
    --manifest data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/proposed_summit_assignments_manifest.json \
    --review-dir data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_summit_assignment \
    --report docs/migration/mountain_summit_assignment_gemini_grounded_report.md
  ```
* **Timestamp**: 2026-06-07T05:19:16.767Z

## Input Datasets & Counts
* **Mountains Source**: `data/03_primary/mountains/ehime_mountain_source_rows.json` (531 records)
* **Summit Candidates**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (496 candidates)
* **Grounding Reference**: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (531 records)
* **Municipality Lookup**: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (496 records)
* **Municipality Stability**: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (496 records)
* **Municipality Adjacency**: `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` (20 municipalities)

## Source-to-Target Mapping Path
* Source-to-Target mapping is defined in: `docs/migration/mountain_summit_assignment_gemini_grounded_source_to_target_mapping.md`

## Assignment Output Paths
* Proposed assignments: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/proposed_summit_assignments.jsonl`
* Candidate support links: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/candidate_support_links.jsonl`
* Pruned candidate log: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/pruned_candidate_log.jsonl`
* Proposed assignments manifest: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/proposed_summit_assignments_manifest.json`

## Assignment Algorithm
The algorithm performs a one-to-one mapping for all 531 mountain records:
1. **Join Grounding Data**: Looks up the mountain grounding info using `mountain_no`.
2. **Search Nearby GPX Candidates**: If usable grounding coordinates exist (and no conflict is detected), uses them as a spatial anchor. We query all 496 GPX candidates and keep those within a 1000m radius.
3. **Candidate Scoring**: Evaluates close candidates using a multi-factor scoring formula (grounding quality, distance tier, name similarity, municipality match, elevation compatibility, and CSV coordinate proximity).
4. **Coordinate Proposal**:
   * If close GPX candidates are found, the highest-scoring candidate is selected, and its coordinate is proposed (`proposed_coordinate_source = gpx_summit_candidate`).
   * If no GPX candidate is found within 1000m, we propose the Gemini coordinate directly (`proposed_coordinate_source = gemini_only`), flagging it for review.
5. **Fallback Checks**: If grounding reference is missing/insufficient, checks for fallback candidates within 500m of the historical CSV coordinate, verifying name/municipality compatibility.
6. **Conflict Cases**: If a grounding conflict is identified or candidates have similar scores, flags the case for review.

## Gemini Usage Policy
Gemini grounding coordinates are auxiliary evidence and must never be treated as canonical truth. They serve as primary spatial search anchors. Proposed coordinates are sourced from verified GPX activity tracks where possible.

## GPX Support Tier Policy
* `strict_gpx_support`: 0–50 m
* `strong_gpx_support`: 50–150 m
* `medium_gpx_support`: 150–300 m
* `weak_gpx_support`: 300–500 m
* `distant_gpx_support`: 500–1000 m
* `no_gpx_support`: >1000 m

## Municipality Compatibility Policy
* **Compatible**: Match between expected municipality and candidate municipality.
* **Adjacent**: expected municipality is adjacent to candidate municipality (derived from land adjacency graph).
* **Incompatible**: mismatch and not adjacent. Forces `needs_human_review: true` and category `conflict_case`.

## CSV Coordinate and Elevation Handling
* Proximity between CSV coordinate and proposed coordinate is measured. A distance $>2000$ m flags `csv_coordinate_mismatch`.
* Elevation difference between CSV and proposed is recorded. A difference $>100$ m flags `csv_elevation_mismatch`.

## Scoring Formula
```text
combined_assignment_score =
    0.45 * gemini_grounding_quality
  + 0.25 * gpx_candidate_spatial_support
  + 0.10 * name_compatibility
  + 0.10 * municipality_compatibility
  + 0.05 * elevation_compatibility
  + 0.05 * csv_coordinate_compatibility
```
All combined scores are bounded within `[0, 1]`.

## Review Categories
1. `auto_supported_not_canonical`: Usable, non-conflicting Gemini coordinate matches a GPX candidate within 150m, compatible name/municipality.
2. `quick_review_recommended`: Matches GPX candidate within 150–500 m, or has minor metadata discrepancies.
3. `manual_review_required`: GPX match within 500–1000 m, weak evidence, or fallback cases.
4. `conflict_case`: Gemini coordinate conflict, multiple strong candidates, or municipality mismatch.
5. `gemini_only_coordinate_review`: Usable Gemini coordinate proposed directly because no GPX candidate exists within 1000m.
6. `no_assignment`: No usable Gemini coordinates and no safe fallback candidate.

## Output Summary Statistics
```json
{
  "total_mountains": 531,
  "assigned_count": 295,
  "unassigned_count": 236,
  "needs_human_review_count": 531,
  "auto_supported_not_canonical_count": 0,
  "quick_review_recommended_count": 22,
  "manual_review_required_count": 31,
  "conflict_case_count": 66,
  "gemini_only_coordinate_review_count": 214,
  "no_assignment_count": 198,
  "gpx_supported_assignment_count": 81,
  "gemini_only_assignment_count": 214,
  "no_coordinate_assignment_count": 236,
  "by_review_category": {
    "auto_supported_not_canonical": 0,
    "quick_review_recommended": 22,
    "manual_review_required": 31,
    "conflict_case": 66,
    "gemini_only_coordinate_review": 214,
    "no_assignment": 198
  },
  "source_files_modified": false,
  "old_outputs_overwritten": false,
  "current_review_entry_point_replaced": false
}
```

## Validation Commands Run
1. Run `npm test` from repository root: Successfully ran 28 unit/integration test suites including the newly added `test_gemini_grounded_summit_assignment.js`.
2. Run custom Node validation script: Checked schema properties, coordinates ranges, allowed category checks, unique mountain coverage (531), and review CSV counts.

## Verification Signoff
* Source Files Modified: **false**
* Old Outputs Overwritten: **false**
* Current Review Entry Point Replaced: **false**

## Known Limitations
* Automatic verification shows `auto_supported_not_canonical_count: 0` because all assignments require human review flags (due to missing or imperfect name matching/mismatches or grounding coordinates being unverified). This is expected since this run acts as a review planning index rather than a final auto-resolution step.

## Next Recommended Steps
* Deploy review CSV files for planning and triage.
* Proceed with downstream geocoding cache enrichment and human-in-the-loop review planning.

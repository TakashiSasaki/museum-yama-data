# Gemini-Grounded Canonical Plus Supplemental Assignment Execution Report

## Execution Metadata
* **Branch**: museum-yama-data
* **HEAD Commit**: f59d69c4df5fea7aa1d92383b4f912f2634d52b8
* **Command Executed**: node .agents/skills/yama-data-pipeline/cli.js assign-mountain-summits-canonical-plus-supplemental ...
* **Timestamp**: 2026-06-07T11:47:22.130Z

## Input Datasets & Counts
* Mountain source JSON: `data/03_primary/mountains/ehime_mountain_source_rows.json` (531 records)
* Canonical candidates JSONL: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (496 records)
* Stage 30 supplemental candidates: `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates.jsonl` (31 records)
* Stage 30 supplemental manifest: `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates_manifest.json`
* Grounding reference index: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (531 records)
* Stage 28 balanced assignments: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments.jsonl` (531 records)
* Stage 28 candidate support links: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_support_links.jsonl`
* Activity links: `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl` (293 records)
* Municipality lookup: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (496 records)
* Municipality stability: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (496 records)
* Municipality adjacency: `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` (20 municipalities)

## Output Files
* proposed_summit_assignments: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/proposed_summit_assignments.jsonl`
* candidate_support_links: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/candidate_support_links.jsonl`
* pruned_candidate_log: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/pruned_candidate_log.jsonl`
* proposed_summit_assignments_manifest: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/proposed_summit_assignments_manifest.json`
* review_directory: `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment`

## Method Summary & Policy
This run executed the `gemini_grounded_canonical_plus_supplemental_assignment` experiment. It merges Stage 30 supplemental candidates with existing canonical candidates.
* **Canonical-vs-Supplemental duplicate policy**: Checks if supplemental candidates lie within 30m of any canonical candidate. If so, they are classified as duplicate and canonical candidates are preferred.
* **30m duplicate policy**: 3 supplemental candidates are within 30m of canonical candidates, and 28 are farther than 30m.
* **Repository-relative path policy**: Enforces forward slash repository-relative path normalization.

## Output Summary Statistics
{
  "mountain_records": 531,
  "canonical_summit_candidate_records": 496,
  "supplemental_candidate_records": 31,
  "grounding_reference_records": 531,
  "stage28_assignment_records": 531,
  "activity_link_records": 293,
  "assignment_records": 531,
  "auto_supported_not_canonical_count": 0,
  "canonical_preferred_over_duplicate_supplemental_count": 3,
  "supplemental_fallback_review_required_count": 28,
  "quick_review_recommended_count": 4,
  "manual_review_required_count": 39,
  "conflict_case_count": 45,
  "gemini_only_coordinate_review_count": 214,
  "no_assignment_count": 198,
  "needs_human_review_count": 531,
  "supplemental_proposed_count": 28,
  "supplemental_duplicate_of_canonical_count": 3,
  "canonical_proposed_count": 53,
  "repository_relative_path_violations": 0,
  "source_files_modified": false,
  "canonical_candidates_overwritten": false,
  "supplemental_candidates_overwritten": false,
  "stage27_outputs_regenerated": false,
  "stage28_outputs_regenerated": false,
  "stage30_outputs_regenerated": false,
  "current_review_entry_point_replaced": false
}

## Safety Confirmations
* **Source files modified**: false
* **Existing canonical candidates overwritten**: false
* **Stage 30 supplemental candidates overwritten**: false
* **Stage 27 outputs regenerated**: false
* **Stage 28 outputs regenerated**: false
* **Stage 30 outputs regenerated**: false
* **Current review entry point replaced**: false

> [!WARNING]
> Supplemental candidates are non-canonical summit candidates and serve as review-planning evidence only.

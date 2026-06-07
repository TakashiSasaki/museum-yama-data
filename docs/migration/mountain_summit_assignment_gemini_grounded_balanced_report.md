# Mountain Summit Assignment (Gemini-Grounded Balanced) Validation Report

## Execution Metadata
* **Branch**: museum-yama-data
* **HEAD Commit**: 85eb9132bfcc5e4a9e64cbc1410142c733b2936f
* **Command Executed**: node .agents/skills/yama-data-pipeline/cli.js assign-mountain-summits-gemini-grounded-balanced ...
* **Timestamp**: 2026-06-07T05:48:01.352Z

## Input Datasets & Counts
* Mountain source JSON: `data/03_primary/mountains/ehime_mountain_source_rows.json` (531 records)
* Summit candidates JSONL: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` (496 candidates)
* Grounding reference index: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` (531 records)
* Municipality lookup: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` (496 records)
* Municipality stability: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` (496 records)
* Municipality adjacency: `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` (20 municipalities)
* Activity links: `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`

## Output Manifest Path
* Manifest: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments_manifest.json`

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

## Output Summary Statistics
{
  "total_mountains": 531,
  "assigned_count": 295,
  "unassigned_count": 236,
  "needs_human_review_count": 529,
  "auto_supported_not_canonical_count": 2,
  "quick_review_recommended_count": 8,
  "manual_review_required_count": 59,
  "conflict_case_count": 50,
  "gemini_only_coordinate_review_count": 214,
  "no_assignment_count": 198,
  "gpx_supported_assignment_count": 81,
  "gemini_only_assignment_count": 214,
  "no_coordinate_assignment_count": 236,
  "boundary_compatible_auto_supported_count": 2,
  "activity_title_supported_count": 0,
  "by_review_category": {
    "auto_supported_not_canonical": 2,
    "quick_review_recommended": 8,
    "manual_review_required": 59,
    "conflict_case": 50,
    "gemini_only_coordinate_review": 214,
    "no_assignment": 198
  },
  "source_files_modified": false,
  "old_outputs_overwritten": false,
  "previous_gemini_assignment_outputs_overwritten": false,
  "current_review_entry_point_replaced": false
}

## Verification Signoff
* Source Files Modified: **false**
* Old Outputs Overwritten: **false**
* Previous Gemini Assignment Outputs Overwritten: **false**
* Current Review Entry Point Replaced: **false**

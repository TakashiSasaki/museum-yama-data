# Gemini-Grounded Canonical Plus Supplemental Assignment Progress

## Authoritative Status

* **Method ID**: `gemini_grounded_canonical_plus_supplemental_assignment`
* **Run ID**: `2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment`
* **Current status**: `implemented_outputs_generated_pending_review`
* **Implementation started?**: Yes
* **Source coverage audit completed?**: Yes
* **Source-to-target mapping completed?**: Yes
* **Assignment outputs generated?**: Yes
* **Review outputs generated?**: Yes
* **Current human review entry point replaced?**: No

---

## Authoritative Documents

* Plan:
  - `docs/migration/gemini_grounded_canonical_plus_supplemental_assignment_plan.md`
* Source coverage audit:
  - `docs/migration/gemini_grounded_canonical_plus_supplemental_assignment_source_coverage_audit.md`
* Source-to-target mapping:
  - `docs/migration/gemini_grounded_canonical_plus_supplemental_assignment_source_to_target_mapping.md`
* Report:
  - `docs/migration/gemini_grounded_canonical_plus_supplemental_assignment_report.md`

---

## Outputs Generated

### Feature Outputs
* `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/proposed_summit_assignments.jsonl`
* `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/candidate_support_links.jsonl`
* `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/pruned_candidate_log.jsonl`
* `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/proposed_summit_assignments_manifest.json`

### Review Outputs
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/auto_supported_not_canonical.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/canonical_preferred_over_duplicate_supplemental.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/supplemental_fallback_review_required.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/quick_review_recommended.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/manual_review_required.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/conflict_case.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/gemini_only_coordinate_review.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/no_assignment.csv`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/summary.md`
* `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/manifest.json`

---

## Summary Counts

* **Total Mountains**: 531
* **Canonical Candidates Proposed**: 53
* **Supplemental Candidates Proposed**: 28
* **Supplemental Candidates Classified as Duplicate**: 3
* **No Coordinate Proposed**: 243
* **Needs Human Review Count**: 531

### Category Counts
* **auto_supported_not_canonical**: 0
* **canonical_preferred_over_duplicate_supplemental**: 3
* **supplemental_fallback_review_required**: 28
* **quick_review_recommended**: 4
* **manual_review_required**: 39
* **conflict_case**: 45
* **gemini_only_coordinate_review**: 214
* **no_assignment**: 198

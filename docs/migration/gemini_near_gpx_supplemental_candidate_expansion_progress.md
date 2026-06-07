# Gemini-Near GPX Supplemental Candidate Expansion Progress

## Authoritative Status

* **Recommended Method ID**: `gemini_near_gpx_supplemental_candidate_expansion`
* **Current status**: `implemented_outputs_generated_pending_review`
* **Implementation started?**: Yes
* **Raw GPX trackpoint audit completed?**: Yes
* **Source-to-target mapping completed?**: Yes
* **Supplemental candidate outputs generated?**: Yes
* **Assignment outputs regenerated?**: No
* **Current human review entry point replaced?**: No

## Output Summary Metrics

* **Run ID**: `2026-06-07_gemini_near_gpx_supplemental_candidate_expansion`
* **Eligible Mountains**: 81
* **Supplemental Candidates Generated**: 31
* **Needs Human Review**: 31 (100% of generated candidates)
* **Nearest Trackpoint Too Far (>300m)**: 50
* **Missing GPX link**: 252
* **Missing raw GPX file**: 0
* **Parse error**: 0

## Basis

* Recommended by:
  - `docs/migration/mountain_summit_assignment_candidate_extraction_refinement_plan.md`

## Completed Preconditions

* Source coverage audit for raw GPX trackpoint access: completed.
* Source-to-target mapping audit for supplemental candidate records: completed.
* Supplemental output namespace decision: completed.
* Non-overwrite constraints for old summit candidates and assignment outputs: confirmed.

## Remaining Work

* Human review of supplemental candidates has not started.
* Supplemental candidates have not been accepted as canonical summit coordinates.
* A downstream assignment experiment using canonical + supplemental candidates has not started.
* Duplicate or near-duplicate handling between canonical and supplemental candidates has not yet been implemented.
* Repository-relative path normalization should be enforced for future generated evidence/provenance fields.

## Non-Goals

* Do not create canonical summit coordinates.
* Do not modify raw GPX files.
* Do not overwrite existing summit candidates.
* Do not overwrite Stage 27 or Stage 28 assignment outputs.
* Do not replace Stage 25 review entry point.

## Post-Implementation Consistency Notes

### Usable Grounding Count Definitions

* `mountains_with_usable_grounding = 333` in the Stage 30 manifest refers to records in the Gemini grounding reference with usable grounding coordinates.
* Earlier planning/audit references to `295` refer to the subset represented in the balanced assignment context with generated proposed coordinates.
* These counts use different denominators and should not be compared as the same metric.

### Path Portability Note

* Stage 30 outputs contain local Windows absolute paths in some `evidence.source_file_provenance` fields.
* These fields are provenance-only and do not affect coordinate calculations.
* Future generators must write repository-relative paths in generated JSON/JSONL evidence and manifests.
* Existing Stage 30 generated data is not regenerated in this cleanup task.

### Canonical/Supplemental Duplicate Policy

* Supplemental candidates may be identical or near-identical to existing canonical summit candidates.
* A future assignment experiment must prefer canonical candidates when the supplemental point is within a small duplicate radius of an existing canonical candidate.
* Suggested duplicate radius for future experiments: 30 m.
* Supplemental candidates farther from canonical candidates may be used as fallback review-planning evidence, but remain non-canonical and review-required.

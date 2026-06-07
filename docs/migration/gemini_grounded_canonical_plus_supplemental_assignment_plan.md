# Gemini-Grounded Canonical Plus Supplemental Assignment Plan

This document defines the planning basis for a future assignment experiment that uses both existing canonical summit candidates and Stage 30 supplemental candidates.

---

## 1. Branch and HEAD Inspected

* **Branch**: `museum-yama-data`
* **Latest HEAD inspected before this planning document**: `8d13e0065b0da988d48870396fb72a0b4ae09a04`
* **Work mode**: documentation and audit preparation performed through the ChatGPT GitHub connector environment.

---

## 2. Problem Statement

The repository currently has several generations of review-planning artifacts for associating CSV-derived mountain records with summit coordinates. Stage 28 (`gemini_grounded_balanced_summit_assignment`) improved the assignment method by using Gemini grounding, municipality compatibility, and activity-title/name evidence, but review reduction remained limited.

Stage 30 (`gemini_near_gpx_supplemental_candidate_expansion`) generated supplemental, non-canonical GPX trackpoint-based candidates near Gemini grounding anchors. These supplemental candidates can address cases where the existing canonical summit candidate extraction was too coarse for traverse or multi-peak GPX tracks.

The next experiment should test whether assignment coverage can be improved by using both:

1. canonical summit candidates from `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`, and
2. supplemental candidates from `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates.jsonl`.

This plan does not implement that experiment.

---

## 3. Why Stage 28 Was Insufficient

Stage 28 generated one-record-per-mountain assignment proposals using Gemini grounding anchors and GPX-derived summit candidates. It produced 295 assigned records and 236 unassigned records, but only two records became `auto_supported_not_canonical`; nearly all records still required review. Subsequent blocker analysis showed that simple threshold relaxation would not sufficiently reduce review burden because many GPX-supported records lacked name evidence or were affected by shared candidate ambiguity.

The root issue is not only review classification. Existing summit candidates can be too sparse or too coarse for multi-peak traverse tracks, so a single canonical summit candidate may be reused by several distinct mountain records.

---

## 4. Why Stage 30 Supplemental Candidates Were Generated

Stage 30 was introduced to preserve the existing canonical candidate set while adding supplemental, non-canonical evidence points derived from raw GPX trackpoints near Gemini grounding anchors. It generated 31 supplemental candidates from 81 eligible GPX-linked mountain records. All Stage 30 supplemental candidates are marked `needs_human_review = true` and `supplemental_candidate_type = supplemental_gemini_near_gpx_point`.

The supplemental candidates are not final summit coordinates. They are review-planning evidence that can be used in a later assignment experiment.

---

## 5. Method Identity

```text
stage     = mountain_summit_coordinate_assignment
method_id = gemini_grounded_canonical_plus_supplemental_assignment
run_id    = 2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment
```

---

## 6. Input Datasets

The future implementation should read, but not mutate, the following inputs:

```text
data/03_primary/mountains/ehime_mountain_source_rows.json
data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl
data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates.jsonl
data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates_manifest.json
data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl
data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments.jsonl
data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_support_links.jsonl
data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl
data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl
data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl
data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json
```

---

## 7. Proposed Output Namespace

Future feature outputs:

```text
data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/
```

Future review outputs:

```text
data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/
```

This planning task does not create those output directories.

---

## 8. Non-Overwrite and Source Immutability Policy

Future implementation must not overwrite or mutate:

```text
data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl
data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates.jsonl
data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/
data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/
data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/
```

All new generated artifacts must be written under the new namespace. Writes must be all-or-nothing and must fail if final paths already exist.

---

## 9. Canonical-vs-Supplemental Candidate Policy

The future assignment method must maintain a strict distinction between candidate types:

* `canonical_summit_candidate`: existing candidate from the 2026-05-12 canonical candidate set.
* `supplemental_gemini_near_gpx_point`: Stage 30 supplemental candidate derived from a raw GPX trackpoint near a Gemini grounding anchor.

Supplemental candidates are never canonical truth. They are fallback review-planning evidence only.

---

## 10. 30 m Duplicate Radius Policy

If a supplemental candidate lies within 30 m of an existing canonical summit candidate:

1. classify it as `duplicate_of_canonical`,
2. prefer the canonical candidate for assignment decisions,
3. keep the supplemental candidate only as evidence,
4. record `supplemental_duplicate_of_canonical_candidate_id`, and
5. record `distance_supplemental_to_canonical_m`.

If a supplemental candidate is farther than 30 m from any canonical candidate, it may be considered as fallback review-planning evidence, but it remains non-canonical and review-required.

---

## 11. Repository-Relative Path Policy

Stage 30 historical outputs include local Windows absolute paths in some provenance evidence fields. Existing Stage 30 data should not be regenerated solely for cleanup. Future generators must write repository-relative paths in all generated JSON, JSONL, manifest, and logging outputs.

---

## 12. Future Assignment Policy

For each mountain:

1. Load the mountain source row.
2. Load the Gemini grounding reference.
3. Load canonical summit candidates.
4. Load Stage 30 supplemental candidates.
5. Build a unified candidate pool while preserving candidate type.
6. Prefer canonical candidates over duplicate supplemental candidates within 30 m.
7. Allow non-duplicate supplemental candidates as fallback review-planning proposals.
8. Force `needs_human_review = true` for every assignment that uses a supplemental candidate as the proposed coordinate.
9. Add `supplemental_unverified` to `review_reason_codes` when a supplemental candidate is proposed or materially used.
10. Do not change Stage 25 as the current human review entry point.

---

## 13. Gemini-Only and No-Assignment Handling

Gemini-only records remain review-required. No-assignment records must continue to appear exactly once in the output. Supplemental candidates may reduce no-assignment or weak-assignment cases only when they are tied to a valid Stage 30 supplemental candidate and retain review-required status.

---

## 14. Municipality Compatibility Policy

Future implementation should retain the balanced method’s municipality handling:

* exact municipality match is compatible,
* boundary-compatible municipality is compatible,
* adjacent municipality may be compatible with strong name/activity evidence,
* severe municipality mismatch should force review or conflict,
* municipality evidence should not make a supplemental candidate canonical.

---

## 15. Name and Activity-Title Evidence Policy

Future implementation should use GPX track names, waypoint metadata where available, and activity-title evidence. Name/activity-title evidence can improve review priority and candidate choice, but it must not override canonical-vs-supplemental safety rules.

---

## 16. Review Categories

The future method should define at least:

```text
auto_supported_not_canonical
canonical_preferred_over_duplicate_supplemental
supplemental_fallback_review_required
quick_review_recommended
manual_review_required
conflict_case
gemini_only_coordinate_review
no_assignment
```

`auto_supported_not_canonical` may only be assigned when the proposed coordinate comes from a canonical summit candidate. A supplemental candidate must never produce `needs_human_review = false`.

---

## 17. Expected Target Schema

The future output record should include:

```text
mountain_no
mountain_name
mountain_source_row_no
assignment_status
review_category
proposed_lat
proposed_lon
proposed_ele_m
proposed_coordinate_source
proposed_candidate_id
proposed_candidate_type
canonical_summit_candidate_id
supplemental_candidate_id
supplemental_duplicate_of_canonical_candidate_id
distance_supplemental_to_canonical_m
source_gpx_basename
source_gpx_path
distance_gemini_to_proposed_m
distance_csv_to_proposed_m
elevation_diff_csv_to_proposed_m
confidence
needs_human_review
review_reason_codes
evidence
notes
```

Required evidence sections:

```text
evidence.gemini_grounding
evidence.canonical_summit_candidate
evidence.supplemental_candidate
evidence.candidate_duplicate_resolution
evidence.csv_coordinate
evidence.elevation
evidence.name
evidence.municipality
evidence.activity_title
evidence.stage28_balanced_assignment
evidence.stage30_supplemental_generation
```

---

## 18. Expected Manifest Fields

The manifest should include:

```text
stage
method_id
run_id
schema_version
created_at
branch
head_commit
inputs
outputs
input_sha256
output_sha256
parameters
summary
source_files_modified
canonical_candidates_overwritten
supplemental_candidates_overwritten
stage27_outputs_regenerated
stage28_outputs_regenerated
current_review_entry_point_replaced
```

---

## 19. Validation Requirements

Future implementation must validate:

* exactly one output row per mountain source row,
* valid review category for every row,
* candidate IDs exist in the relevant candidate source,
* candidate type is preserved,
* supplemental proposed assignments always require review,
* duplicate classification uses the 30 m policy,
* canonical candidates are preferred over duplicate supplemental candidates,
* all paths in newly generated outputs are repository-relative,
* no old output namespace is overwritten,
* Stage 25 remains the current human review entry point.

---

## 20. Stop Conditions / Blockers

Implementation must stop if:

* any required input is missing or unparsable,
* Stage 30 supplemental candidates are missing,
* candidate type cannot be preserved,
* duplicate classification cannot be computed,
* a source field remains `needs decision` or `unmigrated gap`,
* implementation would require mutating canonical candidates or Stage 30 outputs,
* implementation would change Stage 25 review entry point.

---

## 21. Later Implementation Tasks

A later implementation PR should:

1. add a dedicated CLI command,
2. load canonical and supplemental candidates,
3. implement duplicate classification,
4. implement canonical-priority candidate choice,
5. implement supplemental fallback proposal logic,
6. generate assignment JSONL and review artifacts in the new namespace,
7. validate all non-overwrite and non-canonical invariants,
8. update progress and current processing state only after successful generation.

---

## 22. Status

* **Planning**: complete.
* **Source coverage audit**: see `docs/migration/gemini_grounded_canonical_plus_supplemental_assignment_source_coverage_audit.md`.
* **Source-to-target mapping**: see `docs/migration/gemini_grounded_canonical_plus_supplemental_assignment_source_to_target_mapping.md`.
* **Implementation**: not started.

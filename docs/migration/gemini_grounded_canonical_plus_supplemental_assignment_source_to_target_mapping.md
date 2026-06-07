# Gemini-Grounded Canonical Plus Supplemental Assignment Source-to-Target Mapping

This document defines the proposed target schema and source-to-target field treatment for the future `gemini_grounded_canonical_plus_supplemental_assignment` method.

---

## 1. Method Identity

```text
stage     = mountain_summit_coordinate_assignment
method_id = gemini_grounded_canonical_plus_supplemental_assignment
run_id    = 2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment
```

---

## 2. Target Output Namespace

Future feature output:

```text
data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/proposed_summit_assignments.jsonl
```

Future review output namespace:

```text
data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/
```

This mapping task does not generate these outputs.

---

## 3. Mapping Classification Definitions

Every observed source field is classified as exactly one of:

```text
migrated
partially migrated
derived only
preserved as legacy reference
preserved as raw snapshot
intentionally discarded
unmigrated gap
needs decision
```

`migrated` means the source field value is directly preserved in the future assignment record, review artifact, or manifest with the same meaning.

`partially migrated` means the source field value is carried forward only under defined conditions, only in a subset of records, or only inside an evidence object.

`derived only` means the source field is used to compute distances, ranks, score components, duplicate classification, candidate preference, review reason codes, or summaries, but the original value is not carried as a primary field.

`preserved as legacy reference` means the field remains available in source or legacy artifacts and may be referenced for traceability, but is not actively copied into the new primary output.

`preserved as raw snapshot` means the field remains preserved in immutable raw/source files and is not parsed or semantically relied upon by this method.

`intentionally discarded` means the field is explicitly not used, with a reason.

`unmigrated gap` means a relevant field has no target treatment yet. This is a blocker.

`needs decision` means the correct treatment is unclear. This is a blocker.

---

## 4. Proposed Future Assignment Record Schema

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

## 5. Future Review Categories

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

Category rules:

* `auto_supported_not_canonical` may only use canonical summit candidates.
* `canonical_preferred_over_duplicate_supplemental` means a supplemental candidate exists within 30 m, but the canonical candidate is preferred.
* `supplemental_fallback_review_required` means a supplemental candidate is used because canonical candidate evidence is insufficient or absent. This always requires human review.
* Supplemental candidate use must never produce `needs_human_review = false`.
* Any proposed assignment using a supplemental candidate must include `supplemental_unverified` in `review_reason_codes`.
* Stage 25 remains the current human review entry point unless explicitly changed later.

---

## 6. Source Field Classifications

### 6.1 Mountain Source Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| `mountain_no` | `mountain_no` | migrated | Authoritative mountain identifier. |
| mountain name field | `mountain_name` | migrated | Used for display and name evidence. |
| source row number | `mountain_source_row_no` | migrated | Traceability to CSV-derived row. |
| CSV latitude/longitude if present | `evidence.csv_coordinate`, `distance_csv_to_proposed_m` | partially migrated | Used for distance calculation and evidence. |
| CSV elevation | `elevation_diff_csv_to_proposed_m`, `evidence.elevation.csv_elevation_m` | partially migrated | Used for elevation consistency. |
| municipality/location text | `evidence.municipality.expected_municipality` | partially migrated | Used for compatibility checks. |
| difficulty/rank/descriptive fields | N/A | preserved as legacy reference | Not needed for candidate selection. |

### 6.2 Canonical Summit Candidate Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| `summit_candidate_id` | `canonical_summit_candidate_id`, `proposed_candidate_id` when selected | migrated | Canonical candidate identifier. |
| `lat`, `lon` | `proposed_lat`, `proposed_lon`, `evidence.canonical_summit_candidate` | partially migrated | Used if canonical candidate is proposed. |
| `ele_m` | `proposed_ele_m`, `evidence.canonical_summit_candidate` | partially migrated | Used if canonical candidate is proposed. |
| `source_gpx_basename` / `source_gpx_path` | `source_gpx_basename`, `source_gpx_path` | partially migrated | Preserved for selected or evidence candidates. |
| `track_name`, waypoint/name metadata | `evidence.name`, `evidence.canonical_summit_candidate` | partially migrated | Used for name compatibility. |
| derived feature metrics | `evidence.canonical_summit_candidate` | partially migrated | Diagnostic evidence only. |

### 6.3 Stage 30 Supplemental Candidate Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| `supplemental_candidate_id` | `supplemental_candidate_id`, `proposed_candidate_id` when selected | migrated | Supplemental candidate identifier. |
| `supplemental_candidate_type` | `proposed_candidate_type`, `evidence.supplemental_candidate.type` | migrated | Must remain `supplemental_gemini_near_gpx_point`. |
| `supplemental_candidate_status` | `evidence.supplemental_candidate.status` | partially migrated | Status is evidence; output assignment remains separate. |
| `nearest_trackpoint_lat`, `nearest_trackpoint_lon` | `proposed_lat`, `proposed_lon` when selected | partially migrated | Used only for supplemental fallback. |
| `nearest_trackpoint_ele_m` | `proposed_ele_m` when selected | partially migrated | Used only for supplemental fallback. |
| `source_gpx_basename`, `source_gpx_path` | `source_gpx_basename`, `source_gpx_path` | partially migrated | Preserve as repository-relative path where possible. |
| `distance_gemini_to_trackpoint_m` | `distance_gemini_to_proposed_m`, evidence | partially migrated | Used for scoring and review. |
| `existing_nearest_summit_candidate_id` | `evidence.candidate_duplicate_resolution` | partially migrated | Used for duplicate classification. |
| `distance_to_existing_nearest_candidate_m` | `distance_supplemental_to_canonical_m` | migrated | Direct duplicate-distance metric. |
| `local_peak_like_score` | `evidence.stage30_supplemental_generation.local_peak_like_score` | partially migrated | Diagnostic score only. |
| `candidate_generation_reason_codes` | `evidence.stage30_supplemental_generation.reason_codes` | partially migrated | Explanation of why supplemental candidate exists. |
| `needs_human_review` | `needs_human_review` if supplemental selected | derived only | Supplemental selection forces review-required. |
| `review_reason_codes` | `review_reason_codes` | partially migrated | `supplemental_unverified` must be retained. |
| `evidence.source_file_provenance` absolute paths | N/A in new primary output | intentionally discarded | Future outputs must not propagate local absolute paths. Repository-relative paths must be used instead. |
| full `evidence` object | `evidence.supplemental_candidate`, `evidence.stage30_supplemental_generation` | partially migrated | Preserve relevant evidence; avoid absolute-path leakage. |

### 6.4 Gemini Grounding Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| selected grounding lat/lon | `evidence.gemini_grounding`, `distance_gemini_to_proposed_m` | partially migrated | Anchor for scoring and distance calculation. |
| selected grounding elevation | `evidence.gemini_grounding.elevation_m` | partially migrated | Elevation comparison. |
| grounding confidence | `evidence.gemini_grounding.confidence` | partially migrated | Review/scoring evidence. |
| evidence links | `evidence.gemini_grounding.links` | partially migrated | Traceability. |
| coordinate conflict indicators | `review_reason_codes`, `review_category` | derived only | Used to force conflict/review. |

### 6.5 Stage 28 Balanced Assignment Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| `mountain_no`, `mountain_name` | join keys | derived only | Used for joining context. |
| `review_category` | `evidence.stage28_balanced_assignment.review_category` | partially migrated | Baseline context. |
| `proposed_candidate_id` / candidate ids | `evidence.stage28_balanced_assignment` | partially migrated | Legacy comparison evidence. |
| `review_reason_codes` | `evidence.stage28_balanced_assignment.review_reason_codes` | partially migrated | Used to understand prior blockers. |
| proposed coordinates | `evidence.stage28_balanced_assignment.proposed_coordinate` | partially migrated | Baseline comparison only. |

### 6.6 Activity Title Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| `gpx_basename` | join key | derived only | Joins activity title evidence to GPX-derived candidates. |
| best title / activity titles | `evidence.activity_title` | partially migrated | Name evidence. |
| activity id / URL metadata | `evidence.activity_title` | partially migrated | Traceability. |
| ranking / title similarity metrics | `evidence.name` | derived only | Used for name evidence tier. |

### 6.7 Municipality Lookup, Stability, and Adjacency Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| candidate municipality primary/matches | `evidence.municipality.candidate_municipality` | partially migrated | Compatibility evidence. |
| lookup status / boundary ambiguity | `evidence.municipality.compatibility` | derived only | Used for review/scoring. |
| stability metrics | `evidence.municipality.stability` | partially migrated | Diagnostic evidence. |
| adjacency relation | `evidence.municipality.adjacency` | partially migrated | Allows adjacent municipality compatibility. |

### 6.8 Manifest and Provenance Fields

| Source Field | Target Field / Nesting | Classification | Reason / Notes |
|---|---|---|---|
| input file paths | manifest `inputs` | migrated | Must be repository-relative. |
| input SHA-256 hashes | manifest `input_sha256` | migrated | Reproducibility. |
| output paths | manifest `outputs` | migrated | Must be repository-relative. |
| run parameters | manifest `parameters` | migrated | Reproducibility. |
| stage/method/run ids | manifest and records | migrated | Identity. |
| historical local absolute paths | N/A | intentionally discarded | Do not propagate non-portable local paths. |

---

## 7. Derived Fields

The following target fields are derived from source records:

```text
assignment_status
review_category
proposed_candidate_type
supplemental_duplicate_of_canonical_candidate_id
distance_supplemental_to_canonical_m
distance_gemini_to_proposed_m
distance_csv_to_proposed_m
elevation_diff_csv_to_proposed_m
confidence
needs_human_review
review_reason_codes
evidence.candidate_duplicate_resolution
evidence.name
evidence.municipality
```

---

## 8. Invariants for Future Implementation

* Supplemental candidates remain non-canonical.
* Supplemental candidate use always requires human review.
* Canonical candidates are preferred over supplemental candidates within 30 m.
* New generated paths must be repository-relative.
* Stage 30 outputs are inputs, not mutable artifacts.
* Stage 25 remains the current human review entry point.

---

## 9. Verification Status

* **Unmigrated Gaps: 0**
* **Needs Decision: 0**
* **Implementation Status**: ready for a later implementation prompt.

No implementation is performed by this mapping task.

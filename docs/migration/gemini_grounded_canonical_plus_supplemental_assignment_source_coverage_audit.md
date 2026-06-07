# Gemini-Grounded Canonical Plus Supplemental Assignment Source Coverage Audit

This document records the source coverage audit for a future assignment experiment using canonical summit candidates plus Stage 30 supplemental candidates.

---

## 1. Branch and HEAD Inspected

* **Branch**: `museum-yama-data`
* **Latest HEAD inspected before this audit**: `8d13e0065b0da988d48870396fb72a0b4ae09a04`
* **Work mode**: audit-only documentation through the ChatGPT GitHub connector environment.

---

## 2. Audit Purpose and Scope

The purpose of this audit is to determine whether the repository has sufficient canonical candidate, supplemental candidate, Gemini grounding, balanced assignment, activity-title, and municipality evidence to support a later `gemini_grounded_canonical_plus_supplemental_assignment` experiment.

This audit does not implement the assignment experiment and does not generate assignment outputs.

---

## 3. Audit-Only Signoff

No feature outputs, review outputs, canonical summit candidates, supplemental candidates, raw GPX files, or Stage 27/28 assignment outputs were modified by this audit.

The current human review entry point remains Stage 25 `grounding_assisted_review_v2`.

---

## 4. Files Inspected

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

## 5. Record Counts

Known current counts from existing manifests, reports, and sampled generated files:

| Source | Count | Notes |
|---|---:|---|
| Mountain source rows | 531 | Authoritative CSV-derived mountain records. |
| Canonical summit candidates | 496 | Existing `2026-05-12` summit candidate set. |
| Stage 30 supplemental candidates | 31 | All non-canonical and review-required. |
| Gemini grounding usable coordinates | 333 | Records in grounding reference with usable coordinates. |
| Balanced assignment records | 531 | One record per mountain in Stage 28. |
| Balanced assigned records | 295 | GPX or Gemini coordinate assigned. |
| Balanced GPX-supported assignments | 81 | Exact source set used by Stage 30. |
| Activity link records | 293 | Matches GPX file count in title-enriched activity linking. |
| Municipality lookup records | 496 | One per canonical summit candidate. |
| Municipality stability records | 496 | One per canonical summit candidate. |

---

## 6. Canonical Candidate Schema Inventory

Canonical summit candidate fields are expected to include candidate identifiers, source GPX metadata, coordinate fields, elevation, track metadata, and derived candidate feature attributes. The future method must preserve canonical candidate identity and type when a canonical candidate is selected.

Canonical candidates are considered the preferred candidate class. They are not necessarily final accepted coordinates, but they are the established primary candidate set and must be preferred over duplicate supplemental candidates.

---

## 7. Supplemental Candidate Schema Inventory

Stage 30 supplemental candidates include:

```text
supplemental_candidate_id
supplemental_candidate_status
supplemental_candidate_type
source_method_id
source_run_id
mountain_no
mountain_name
source_gpx_basename
source_gpx_path
source_gpx_sha256
nearest_trackpoint_index
nearest_trackpoint_segment_index
nearest_trackpoint_lat
nearest_trackpoint_lon
nearest_trackpoint_ele_m
nearest_trackpoint_time
distance_gemini_to_trackpoint_m
gemini_grounding_lat
gemini_grounding_lon
gemini_grounding_elevation_m
gemini_grounding_confidence
existing_nearest_summit_candidate_id
distance_to_existing_nearest_candidate_m
local_window_trackpoint_count
local_window_max_ele_m
local_window_min_ele_m
local_window_ele_range_m
local_window_distance_radius_m
local_peak_like_score
candidate_generation_reason_codes
needs_human_review
review_reason_codes
evidence
notes
```

All Stage 30 supplemental candidates must be treated as non-canonical review-planning evidence.

---

## 8. Grounding Reference Schema Inventory

Grounding reference records provide Gemini-derived grounding coordinates, confidence, source/evidence links, and conflict status. Gemini coordinates guide assignment candidate search and scoring but remain auxiliary evidence. They are not canonical truth.

---

## 9. Balanced Assignment Schema Inventory

Stage 28 balanced assignments provide the immediate context for prior proposed coordinates, review categories, GPX support, Gemini-only status, no-assignment status, and review reason codes. They are useful as legacy context and as a comparison baseline. They must not be overwritten or regenerated by this planning task.

---

## 10. Activity Title Schema Inventory

Activity-title records provide `gpx_basename`, title-enriched activity metadata, and best-title evidence. Future assignment logic may use activity-title evidence for name compatibility and review priority, but it must not override canonical/supplemental candidate safety rules.

---

## 11. Municipality Evidence Schema Inventory

Municipality lookup, stability, and adjacency files provide candidate location compatibility evidence. Future logic should retain the balanced method’s compatibility classes: exact, boundary-compatible, adjacent, unknown, mismatch, and outside-prefecture-like contradictions where applicable.

---

## 12. Candidate Overlap Analysis

Stage 30 generated 31 supplemental candidates.

Using the Stage 30 `supplemental_candidate_summary.csv` field `distance_to_existing_nearest_candidate_m` and the 30 m duplicate policy:

* **Supplemental candidates total**: 31
* **Within 30 m of a canonical candidate**: 3
* **Farther than 30 m from any canonical candidate**: 28
* **Exact same coordinates as canonical candidate, using distance 0 m**: 2
* **Missing nearest canonical context**: 0 observed in the Stage 30 summary fields.

The three within-30m duplicate cases observed from the summary CSV are:

| mountain_no | mountain_name | supplemental_candidate_id | nearest canonical candidate | distance_to_existing_nearest_candidate_m |
|---:|---|---|---|---:|
| 3 | 高森山 | `supplemental-candidate:e7d693c1834f9669` | `summit-candidate:e7ae682a07af2e10` | 0 |
| 82 | 陣ヶ森 | `supplemental-candidate:5e525c75552fd554` | `summit-candidate:25e47e34740282d2` | 20.025 |
| 185 | 岩子山 | `supplemental-candidate:4bb36093640c5344` | `summit-candidate:45f49d8fd831427c` | 0 |

These should be treated as duplicate supplemental evidence and canonical candidate should be preferred in a future assignment experiment.

---

## 13. Path Portability Check

Stage 30 records contain local Windows absolute paths in some `evidence.source_file_provenance` fields. These fields are historical provenance metadata and are not used for coordinate calculation. Existing Stage 30 generated data is preserved as historical output and is not modified by this audit.

Future `gemini_grounded_canonical_plus_supplemental_assignment` outputs must write repository-relative paths only.

---

## 14. Audit Completeness

This audit is complete for planning purposes. It is based on existing repository artifacts and Stage 30 summary outputs. The future implementation should still run a full local validation over every input file before writing outputs.

---

## 15. Blockers

* **Missing files**: None identified from inspected documented paths.
* **Unparsable inputs**: None identified from existing manifests and prior reports.
* **Candidate overlap policy**: defined using 30 m duplicate radius.
* **Path portability policy**: defined; future outputs must use repository-relative paths.

**Blockers**: None for preparing the future implementation prompt.

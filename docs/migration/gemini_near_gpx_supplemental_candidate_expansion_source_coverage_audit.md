# Gemini-Near GPX Supplemental Candidate Expansion Source Coverage Audit

This document records the source coverage audit required before implementing the `gemini_near_gpx_supplemental_candidate_expansion` method.

---

## 1. Branch and HEAD Inspected

* **Branch**: `museum-yama-data`
* **Latest HEAD Commit**: `6a5efa4 docs: record candidate extraction refinement stage`
* **Timestamp**: 2026-06-07T18:35:00Z

---

## 2. Purpose and Scope

The purpose of this audit is to verify that the repository contains sufficient raw GPX trackpoint data, schema stability, and coverage references to support generating supplemental (non-canonical) candidate points near Gemini grounding anchors. 

This analysis is performed to resolve candidate under-detection and over-merging in traverse/multi-peak tracks.

---

## 3. Audit-Only Signoff

This is an **audit-only** document. No supplemental candidates (to be marked as `supplemental_gemini_near_gpx_point`) were generated and no raw GPX files or assignment outputs were modified, and **no assignment output was regenerated** during this audit phase. The current review entry point remains Stage 25 `grounding_assisted_review_v2`.

---

## 4. Input Files Inspected

* **Raw GPX Data**: `data/01_raw/gpx/2026-05-12/` (293 files)
* **Summit Candidates**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
* **Grounding Index**: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`
* **Balanced Assignments**: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments.jsonl`
* **Activity Links**: `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`

---

## 5. Raw GPX Directory Inventory

* **GPX File Count**: 293
* **File Naming Pattern**: `yamap_YYYY-MM-DD_HH_MM.gpx`
* **Reference Integrity Check**:
  * **Existing Summit Candidates**: 268 distinct GPX basenames referenced (25 GPX files are correctly documented as having zero summit candidates). 100% of these 268 basenames exist as physical files.
  * **Balanced Assignments**: 54 distinct GPX basenames referenced in the assignments. 100% of these exist.
  * **Activity Links**: 293 basenames referenced. 100% of these exist.
  * **Deduplication Status**: 19 duplicate suffix files (e.g. `(1).gpx`) were successfully removed or consolidated in previous stages.

---

## 6. GPX XML Structure Inventory

* **Root Element**: `<gpx>`
* **Namespaces**:
  * Default namespace: `xmlns="http://www.topografix.com/GPX/1/1"`
  * XML Schema Instance: `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`
* **Elements and Attributes**:
  * `<trk>` (Track element)
  * `<name>` (Track name string)
  * `<trkseg>` (Track segment container)
  * `<trkpt>` (Trackpoint node)
    * `@lat`: WGS84 latitude attribute (float, e.g. `33.8464981`)
    * `@lon`: WGS84 longitude attribute (float, e.g. `132.7967931`)
  * `<ele>`: Elevation child element of `<trkpt>` (float, e.g. `47.57`)
  * `<time>`: Timestamp child element of `<trkpt>` (string, ISO 8601 UTC format, e.g. `2022-02-16T02:57:12Z`)
* **Missing-Field Patterns**: No trackpoints are missing latitude, longitude, elevation, or time elements. The dataset has 100% attribute density for these key fields.

---

## 7. Trackpoint Count Summary

A full audit of the 293 GPX files in `data/01_raw/gpx/2026-05-12` was executed:
* **Total Trackpoints**: 80,131
* **Min Trackpoints per GPX**: 7
* **Max Trackpoints per GPX**: 1,171
* **Mean Trackpoints per GPX**: 273.5
* **Median Trackpoints per GPX**: 186
* **Zero-Trackpoint Files**: 0
* **Trackpoints Missing Elevation**: 0
* **Trackpoints Missing Time**: 0

---

## 8. Existing Summit Candidate Provenance

* **Source**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
* **Generation Subcommand**: `generate-summit-candidate-gpx` followed by `extract-summit-candidate-features`
* **Parameters**: `smooth_window = 5`, `peak_radius = 10`, `min_prominence = 30`, `merge_distance = 100`
* **Manifest Status**: `data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json` correctly lists 496 candidates across 293 files, with 25 zero-candidate GPX files.

---

## 9. Balanced Assignment Dependency Summary

From `proposed_summit_assignments.jsonl` under the balanced method:
* **Total Mountains**: 531
* **GPX-supported Assignments**: 81
* **Gemini-only Assignments**: 214
* **No Coordinate Proposed**: 236
* **Shared Candidate Ambiguity**: 10 candidate IDs are assigned to multiple mountains. This creates a severe review bottleneck because coarse peak merging grouped distinct peaks (e.g. Ishizuchi range) under single candidate points.

---

## 10. Raw GPX Accessibility for Future Supplemental Candidates

To generate supplemental candidates, the future pipeline needs to link mountains to raw trackpoint streams:
* **Assignments with Usable Grounding Coordinates**: 295 mountains have consensus coordinates from Gemini grounding.
* **Assignments with Linked GPX Basename**: 54 mountains.
* **Basename Linking to Raw GPX**: 100% of these basenames map directly to files in `data/01_raw/gpx/2026-05-12/`.
* **Linkage Path**:
  ```text
  proposed_summit_assignments.jsonl 
    --> source_gpx_basename 
    --> data/01_raw/gpx/2026-05-12/<source_gpx_basename>
  ```
  This direct linkage allows the future algorithm to read the raw trackpoint stream and select the closest trackpoint to the Gemini grounding anchor.

---

## 11. Candidate Extraction Refinement Planning Basis

This audit leverages the analysis and recommendations detailed in:
* `docs/migration/mountain_summit_assignment_candidate_extraction_refinement_plan.md`

The plan concluded that **threshold relaxation alone is insufficient** because it does not generate missing candidate coordinates in traverse tracks. Option 4 (`gemini_near_gpx_supplemental_candidate_expansion`) was recommended because it preserves the existing 496 canonical candidates while introducing supplemental review-planning candidates near Gemini anchors.

---

## 12. Missing Expected Files

* **None**. All raw GPX files, primary candidate files, grounding references, and balanced proposed assignments are present and valid.

---

## 13. Parse Errors and Malformed GPX Files

* **None**. All 293 raw GPX files parse as well-formed XML under the GPX 1.1 schema.

---

## 14. Audit Completeness and Blockers

* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Audit Completeness**: 100% complete.
* **Blockers**: None. The raw GPX trackpoint files are fully populated, schema-stable, and accessible for generating supplemental candidate points.

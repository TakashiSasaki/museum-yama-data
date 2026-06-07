# Gemini-Near GPX Supplemental Candidate Expansion Report

This document records the execution results of the `gemini_near_gpx_supplemental_candidate_expansion` method.

---

## 1. Execution Context

* **Branch**: `museum-yama-data`
* **HEAD Inspected**: `cf35552 docs: audit supplemental candidate expansion inputs`
* **Command Executed**: 
  ```sh
  node .agents/skills/yama-data-pipeline/cli.js generate-gemini-near-gpx-supplemental-candidates ...
  ```
* **Run ID**: `2026-06-07_gemini_near_gpx_supplemental_candidate_expansion`
* **Created At**: 2026-06-07T09:44:22.115Z

---

## 2. Parameter Invariants

* `max_distance_gemini_to_trackpoint_m`: 300
* `local_window_radius_m`: 100
* `local_window_trackpoint_index_radius`: 10
* `supplemental_candidate_type`: `supplemental_gemini_near_gpx_point`
* `supplemental_candidate_status`: `unresolved`
* `needs_human_review`: `true`

---

## 3. Input Summary

* **Raw GPX file count**: 293
* **Raw trackpoint count**: 80131
* **Mountains with usable grounding**: 333
* **Mountains with linked GPX**: 81

---

## 4. Output Summary

* **Eligible mountains**: 81
* **Supplemental candidates generated**: 31
* **Needs human review count**: 31
* **Ineligible counts and reasons**:
  * Nearest trackpoint too far (>300m): 50
  * Missing GPX link: 252
  * Missing raw GPX file: 0
  * Parse error: 0

> [!WARNING]
> These supplemental candidates are for review-planning evidence only. They are not canonical summit candidates and must not be treated as canonical summit coordinates.

---

## 5. Local Peak-Like Score definition

The `local_peak_like_score` estimates if the point is a local maxima within a local window:
* **Local Window**: trackpoints in the same segment whose index is within `selected_index ± 10` and whose spatial distance is `≤ 100` meters.
* **Calculation**:
  ```javascript
  local_peak_like_score = 1.0 - (max_ele - selected_ele) / (max_ele - min_ele)
  ```
  Bounded strictly in `[0, 1]`.

---

## 6. Safety Affirmations

* **Source files modified**: false
* **Existing summit candidates overwritten**: false (existing canonical `summit_candidates.jsonl` remains fully untouched)
* **Assignment outputs regenerated**: false
* **Current human review entry point replaced**: false (Stage 25 remains the current entry point)

---

## 7. Next Recommended Step

We recommend running a new summit assignment experiment that uses both the existing canonical candidates and these newly generated supplemental candidates to see if the assignment coverage can be safely expanded.

---

## 8. Post-Run Consistency Notes

* **Execution Base Commit vs Committed Output Commit**: The execution base commit inspected was `cf35552`. The committed output commit is `19342e8` which contains the generated Stage 30 output files.
* **Non-Canonical Status**: All generated supplemental candidates are non-canonical and serve as review-planning evidence only. They do not replace canonical candidates.
* **Path Portability Issue**: Stage 30 outputs contain local Windows absolute paths inside `evidence.source_file_provenance`. These do not affect coordinate calculations. Future generators must write repository-relative paths only. Existing Stage 30 outputs are not regenerated in this cleanup.
* **Usable Grounding Count Definitions**:
  - `mountains_with_usable_grounding = 333` refers to records in the grounding reference with usable coordinates.
  - Previous planning references to `295` refer to the subset in the balanced assignment context with generated proposed coordinates.
* **Duplicate/Near-Duplicate Policy**: Future assignment experiments must handle duplicates by preferring canonical candidates when a supplemental candidate is within a duplicate radius of 30 m.
* **Outputs Preservation**: This documentation cleanup task does not regenerate Stage 30 outputs.

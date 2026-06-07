# Mountain Summit Assignment Candidate Extraction Refinement Plan

This document outlines the planning and analysis for improving summit candidate extraction and resolving shared-candidate ambiguities under the `gemini_grounded_balanced_summit_assignment` method.

---

## 1. Metadata and Environment Inspected

* **Branch**: `museum-yama-data`
* **HEAD Inspected**: `a4ded42 docs: analyze balanced gemini assignment review blockers`
* **Timestamp**: 2026-06-07T18:15:00Z

---

## 2. Current State Summary

The balanced Gemini-grounded mountain summit assignment (`gemini_grounded_balanced_summit_assignment`) has been implemented and run:
* **Stage**: `mountain_summit_coordinate_assignment`
* **Method ID**: `gemini_grounded_balanced_summit_assignment`
* **Run ID**: `2026-06-07_gemini_grounded_balanced_summit_assignment`
* **Current status**: `implemented_outputs_generated_pending_review`

### Key Assignment Counts:
* **Total Mountains**: 531
* **GPX-supported Assignments**: 81
* **Gemini-only Assignments**: 214
* **No Coordinate proposed**: 236
* **Needs Human Review Count**: 529
* **Auto-supported (Not Canonical)**: 2 (Mountain 3 `高森山` and Mountain 80 `うなめご`)

---

## 3. Why Threshold Relaxation Alone is Insufficient

Simply relaxing the auto-support thresholds (e.g. expanding the spatial search radius or ignoring elevation mismatches) does not solve the root problem. Under simulation, the most relaxed policy (S3) only increased auto-supported records from 2 to 5. 

Therefore, **threshold relaxation alone is insufficient** because the primary bottleneck is not the assignment policy itself, but upstream data representation limitations:
1. **Name Evidence Mismatch (`name_missing` in 66.7% of cases)**: The mountain name is completely absent from GPX track names and YAMAP activity titles, usually due to traverses or multi-peak contexts where the track is named after only one dominant peak or is named generically.
2. **Upstream Extraction Failures**: Distinct summits are either merged into a single candidate due to coarse prominence/merge parameters, or not detected at all due to strict elevation/prominence filters.

---

## 4. Summary of Blocker Analysis Findings

The blocker analysis identified the following bottlenecks for the 81 GPX-supported assignments:
* **Strict Distance Constraint**: 76 out of 81 assignments have a Gemini-to-candidate distance $> 150\text{ m}$.
* **Missing Name Evidence**: 54 out of 81 assignments have no name matching between the CSV mountain record and the GPX track name/YAMAP title.
* **CSV Elevation Mismatch**: 24 out of 81 records have elevation differences $> 200\text{ m}$ against legacy CSV records.
* **Shared Candidates**: 10 unique candidate IDs are shared by multiple mountains, creating topological conflicts.

---

## 5. Shared Candidate Deep Dive

An analysis of the 10 candidate IDs shared by multiple mountains was performed:

| Summit Candidate ID | Mountain Count | Mountain Names | GPX Track Basename | Lat / Lon | Elevation (m) | Classification | Diagnostic Note / Recommended Handling |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| `summit-candidate:22e40e9eb117a033` | 5 | 筒上山;南尖峰;天狗岳;石鎚山;東ノ冠岳 | `yamap_2024-05-03_08_45.gpx` | 33.7513, 133.1116 | 1519.86 | `candidate_extraction_too_coarse` | Coarse parameters merged distinct peaks along the Ishizuchi range into a single point. |
| `summit-candidate:1ed32ce6414c2781` | 3 | 世田山;笠松山;笠松山東峰 | `yamap_2022-12-25_13_36.gpx` | 33.9801, 133.0508 | 98.38 | `needs_manual_interpretation` | Requires manual map verification to locate the individual peaks. |
| `summit-candidate:45f49d8fd831427c` | 2 | 岩子山;垣生山 | `yamap_2023-01-06_11_33.gpx` | 33.8362, 132.7147 | 110.78 | `likely_traverse_multi_peak_context` | Traverse context where a single track contains multiple peaks. |
| `summit-candidate:d43fade4de3e33c8` | 2 | 宝ヶ峯;淡路ヶ峠 | `yamap_2023-03-05_11_09.gpx` | 33.8346, 132.8126 | 278.92 | `likely_traverse_multi_peak_context` | Traverse context; track name contains both peaks. |
| `summit-candidate:d03c84134ca0989d` | 2 | 福見山;左谷ノ森 | `yamap_2022-01-22_09_04.gpx` | 33.8192, 132.8731 | 306.31 | `likely_traverse_multi_peak_context` | Track name covers a long traverse. |
| `summit-candidate:27c1036d4aa2230e` | 2 | 郭公岳;小屋ヶ森 | `yamap_2022-04-08_09_33.gpx` | 33.1812, 132.6194 | 1167.55 | `likely_traverse_multi_peak_context` | Track name contains multiple peaks. |
| `summit-candidate:9186201ca03b041d` | 2 | 東高月山;高月山 | `yamap_2024-03-30_07_11.gpx` | 33.1727, 132.6401 | 1160.44 | `likely_traverse_multi_peak_context` | Multi-peak track name. |
| `summit-candidate:9d447faef6efe2ab` | 2 | 斎藤山;梁瀬山 | `yamap_2022-10-27_13_37.gpx` | 33.5090, 132.5604 | 335.74 | `needs_manual_interpretation` | Requires manual map verification. |
| `summit-candidate:91ebf1d99654d5b2` | 2 | 長尾森;尻割山 | `yamap_2022-04-08_09_33.gpx` | 33.1848, 132.6160 | 1162.27 | `likely_traverse_multi_peak_context` | Multi-peak track name. |
| `summit-candidate:61304308f9a58d0d` | 2 | 秋葉山;明神山 | `yamap_2026-01-11_07_50.gpx` | 33.6543, 132.6896 | 694.36 | `needs_manual_interpretation` | Requires manual map verification. |

---

## 6. Traverse Track Peak Coverage Findings

We compared named peaks in multi-peak tracks/activity titles with the number of generated candidates and actual assignments:
* **Under-Detection**: In 224 multi-peak tracks, candidate extraction often yields fewer candidates than the number of named peaks. For example, `yamap_2022-01-22_09_04.gpx` (track name: `高森山・岩伽羅山・衣掛山・吉山(吉山城址)`) lists 8 named peaks, but only 2 candidates were generated.
* **Severe Peak Merging**: Tracks like `yamap_2022-12-25_13_36.gpx` (track name: `医王山`) list 10 named peaks in their title, but only 1 candidate was extracted due to a large merging distance parameter ($100\text{ m}$).

---

## 7. Name-Missing GPX-Supported Case Findings

Out of 81 GPX-supported records, 54 fail the balanced policy due to a lack of name verification. Key cases:
* **West Akaishi Mountain (`西赤石山`, Mountain 222)**: Supported by `yamap_2022-11-26_04_41.gpx`. The candidate is 439.5m from the Gemini anchor. The name matching fails (`name_missing`) because the track name is a list of other peaks in the range, missing "西赤石山".
* **Ishizuchi Mountain (`石鎚山`, Mountain 234)**: Matches `yamap_2024-05-03_08_45.gpx`. The candidate is only 129.4m from the Gemini anchor but fails due to `name_missing` because the track is named `面河山`.

---

## 8. Candidate Extraction Gap Hypotheses

* **H1**: Summit candidate extraction produces one dominant high/elevation point for a traverse but merges local sub-peaks.
* **H2**: Candidate detection parameters (prominence 30m) are too strict for low-relief or short trail tracks.
* **H3**: Track/activity titles contain multiple named peaks, but candidate extraction does not preserve per-name candidate associations.
* **H4**: Gemini coordinates may identify the named mountain, but nearest GPX candidate within 1000m may be a different summit candidate.
* **H5**: Activity title evidence is available but only used as name support after candidate selection, not to generate or choose better per-peak candidates.
* **H6**: Shared summit candidate IDs indicate candidate extraction granularity problems rather than assignment-policy problems.

---

## 9. Refinement Policy Options

* **Option 1: Candidate extraction refinement from existing GPX tracks (`refined_gpx_summit_detection`)**
  * *Description*: Reprocess GPX tracks with tighter merging distance (e.g. 50m) and smaller prominence parameters.
  * *Expected Review Reduction*: Medium (splits ~25 shared candidates).
  * *Requires Raw GPX Reprocessing*: Yes.
  * *Requires Audits*: Yes.

* **Option 2: Name-aware candidate selection within existing candidate set (`name_aware_existing_candidate_selection`)**
  * *Description*: Do not re-run peak detection. Use text similarity on activity titles and waypoint names to rank existing candidates.
  * *Expected Review Reduction*: Low.
  * *Requires Raw GPX Reprocessing*: No.
  * *Requires Audits*: No.

* **Option 3: Gemini-anchored local candidate search from raw GPX points (`raw_gpx_local_peak_candidate_refinement`)**
  * *Description*: Find the trackpoint in raw GPX that is closest to the Gemini grounding anchor, deriving a candidate point dynamically.
  * *Expected Review Reduction*: High.
  * *Requires Raw GPX Reprocessing*: Yes.
  * *Requires Audits*: Yes.

* **Option 4: Hybrid candidate expansion (`gemini_near_gpx_supplemental_candidate_expansion`)**
  * *Description*: Keep existing candidates. Generate supplemental candidates from the raw GPX trackpoints that lie closest to Gemini anchors. Explicitly tag them as `supplemental_gemini_near_gpx_point`.
  * *Expected Review Reduction*: High.
  * *Requires Raw GPX Reprocessing*: Yes.
  * *Requires Audits*: Yes.

* **Option 5: Manual curation queue before algorithmic expansion (`manual_shared_candidate_resolution_queue`)**
  * *Description*: Direct shared-candidate and name-missing cases directly to human validation templates.
  * *Expected Review Reduction*: None (increases human effort).
  * *Requires Raw GPX Reprocessing*: No.
  * *Requires Audits*: No.

---

## 10. Recommended Next Method

We recommend implementing Option 4: **`gemini_near_gpx_supplemental_candidate_expansion`**.
* **Rationale**: It targets the core bottleneck: missing candidate points near Gemini anchors (due to under-detection/over-merging) without destroying the existing validated candidate set. By introducing supplemental candidate points, it solves coordinate-missing and distant-candidate errors.

---

## 11. Mandatory Audits Before Implementation

Because the recommended next method (Option 4) requires reading raw GPX points and generating supplemental candidate records:
1. A **new source coverage audit** is strictly required to verify the integrity and schema of raw trackpoint coordinates.
2. A **new source-to-target mapping audit** is strictly required to define how supplemental trackpoint coordinates are ingested and represented in downstream steps.

---

## 12. Output Namespace Recommendation

Proposed supplemental candidates and subsequent features must live in:
```text
data/03_primary/summit_candidates/hybrid_expansion/
data/04_feature/mountain_summit_assignments/hybrid_expansion/
```

---

## 13. Risks and Non-Goals

### Risks:
* **False Positives**: Supplemental trackpoints are not validated peaks; they could represent trail bends or saddle points. Strict distance filters ($\le 150\text{ m}$) must be applied to any supplemental point before it is auto-supported.
* **Name Mismatch**: Supplemental points do not automatically resolve the missing name evidence blocker.

### Non-Goals:
* Do not modify or overwrite original raw GPX source files.
* Do not automatically accept coordinates without verification checks.
* The current human review entry point remains unchanged (**Stage 25** `grounding_assisted_review_v2`).

---

## 14. Execution and Safety Signoff

* **Did this task regenerate any assignment outputs?**: No, **no assignment output was regenerated** in this planning task.
* **Did this task change the human review entry point?**: No, the current human review entry point remains unchanged (**Stage 25** `grounding_assisted_review_v2`).
* **Did this task modify any source data or old outputs?**: No, **no source data or old outputs were modified** in this planning task.

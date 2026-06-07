# Blocker Analysis for Gemini-Grounded Balanced Mountain Summit Assignment

This document provides a detailed diagnostic analysis explaining why the current "Balanced" Gemini-grounded mountain summit assignment method (`gemini_grounded_balanced_summit_assignment`) still leaves almost all (529 out of 531) mountain records requiring human review, with only 2 records auto-supported.

This is an analysis/reporting document only. No assignment outputs or raw data were modified.

---

## 1. Metadata and Environment Inspected

* **Branch**: `museum-yama-data`
* **HEAD Commit**: `bcb248dda2605c34f3ab7492cb70e9e04a75a880` (feat: implement balanced gemini-grounded summit assignment)
* **Command Executed**: `wsl python3 scripts/analyze_gemini_grounded_balanced_blockers.py`
* **Analysis Run Timestamp**: 2026-06-07T15:52:00Z

### Files Inspected

* Input/Output Data:
  * [proposed_summit_assignments.jsonl](file:///c:/Users/takas/Desktop/museum-yama-data/data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments.jsonl)
  * [candidate_support_links.jsonl](file:///c:/Users/takas/Desktop/museum-yama-data/data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_support_links.jsonl)
  * [pruned_candidate_log.jsonl](file:///c:/Users/takas/Desktop/museum-yama-data/data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/pruned_candidate_log.jsonl)
  * [proposed_summit_assignments_manifest.json](file:///c:/Users/takas/Desktop/museum-yama-data/data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments_manifest.json)
  * [ehime_mountain_source_rows.json](file:///c:/Users/takas/Desktop/museum-yama-data/data/03_primary/mountains/ehime_mountain_source_rows.json)
  * [title_enriched_candidate_links.jsonl](file:///c:/Users/takas/Desktop/museum-yama-data/data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl)
  * [title_enriched_manifest.json](file:///c:/Users/takas/Desktop/museum-yama-data/data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_manifest.json)

---

## 2. Input/Output Counts and Verification

* **Total Mountains**: 531
* **Assigned Mountains**: 295
* **Unassigned Mountains**: 236
* **GPX-supported Assignments**: 81
* **Gemini-only Assignments**: 214
* **No Coordinate proposed**: 236
* **Needs Human Review Count**: 529
* **Auto-supported (Not Canonical)**: 2 (Mountain 3 `高森山` and Mountain 80 `うなめご`)

---

## 3. Why only 2 records are Auto-Supported

Under the current balanced policy (S0), a proposed GPX-supported coordinate is automatically accepted (without review) only if it meets all of the following conditions:
1. **GPX Distance**: The distance between the Gemini grounding anchor and the closest GPX candidate is $\le 150\text{ m}$.
2. **Name Evidence**: Name evidence is strong (`name_exact_track_contains`, `name_exact_activity_title_contains`, `name_explicit_activity_mountain_names`, or `name_token_containment_strong`).
3. **Municipality**: The candidate municipality matches exactly, is boundary-compatible, or is adjacent with a strong name.
4. **No Near-Tie**: No second close candidate exists with a similar score (no coordinate conflict or near-tie).
5. **No CSV Elevation Mismatch**: Elevation difference between the proposed candidate and the legacy CSV is $\le 200\text{ m}$.
6. **No CSV Coordinate Mismatch**: Distance between the proposed candidate and the legacy CSV coordinate is $\le 2000\text{ m}$.

### Core Blocker Breakdown (GPX-supported assignments, $N = 81$):

1. **Strict Distance Threshold ($\le 150\text{ m}$)**:
   * **76 out of 81 records (93.8%)** have a Gemini-to-GPX distance $> 150\text{ m}$.
   * Breakdown:
     * `medium_gpx_support` ($150\text{ m} - 300\text{ m}$): 8 records (9.88%)
     * `weak_gpx_support` ($300\text{ m} - 500\text{ m}$): 18 records (22.22%)
     * `distant_gpx_support` ($500\text{ m} - 1000\text{ m}$): 50 records (61.73%)
   * **Conclusion**: The $150\text{ m}$ distance filter is the single largest blocker.

2. **Name Evidence Mismatch (`name_missing`)**:
   * **54 out of 81 records (66.67%)** have no name match at all.
   * **Reason**: The mountain name is completely missing from the track name, waypoint tags, and YAMAP activity titles. This happens when the track was named generically or after a different peak in a traverse group.

3. **CSV Elevation Mismatch ($> 200\text{ m}$)**:
   * **24 out of 81 records (29.63%)** fail due to `csv_elevation_mismatch`.
   * **Reason**: Significant elevation difference between the GPX trackpoint elevation and the legacy CSV sheet records.

4. **Topological/Near-Tie Conflict**:
   * **11 out of 81 records (13.58%)** fail due to `multiple_strong_candidates_conflict`. Multiple trackpoints qualify as strong summit candidates, introducing real ambiguity (e.g. traverse route).

---

## 4. Activity-Title Join Diagnostics

A diagnosis of `title_enriched_candidate_links.jsonl` was conducted to verify if activity-title evidence is being successfully joined.

* **Actual JSONL Record Count**: 293
* **Manifest Record Count**: 293
* **Counts Agree**: **Yes** (both have exactly 293 records. No discrepancy exists).
* **GPX-supported basenames with matching Activity Link**: 54 out of 81 (66.7%).
* **Matching links containing YAMAP activity titles**: 53 out of 54.
* **Activity titles containing the CSV mountain name**: 26 out of 81 (32.1%).
* **Available keys**: Joined successfully using `gpx_basename`. Other keys present in the link metadata are preserved but not required for joining.

---

## 5. Candidate Sharing Diagnostics

We inspected whether the same `proposed_summit_candidate_id` was assigned to multiple mountains:

* **Total unique candidate IDs assigned**: 68
* **Shared candidate IDs**: 10 candidate IDs are assigned to multiple mountains (ranging from 2 to 5 mountains per candidate ID).

### Multi-Peak Classifications:
1. **likely_traverse_multi_peak_context** (7 cases): The GPX track is a traverse covering multiple peaks (e.g. `津田山・弁天山` or `宝ヶ峯・淡路ヶ峠`).
2. **suspicious_over_shared_candidate** (1 case): The ID is shared by 5 mountains (`筒上山;南尖峰;天狗岳;石鎚山;東ノ冠岳` under candidate `summit-candidate:22e40e9eb117a033`). This reflects the limitations of peak extraction where all sub-peaks cluster under a single dominant candidate.
3. **needs_manual_interpretation** (2 cases): Shared among neighbors (`秋葉山;明神山` and `斎藤山;梁瀬山`).

---

## 6. Auto-Support Simulation Results

We simulated alternative auto-support policies for the 81 GPX-supported records:

| Policy | Description | Auto-Supported Count | Change |
| :--- | :--- | :---: | :---: |
| **S0** | **Current Balanced Policy** (Distance $\le 150\text{ m}$, Name strong, Muni exact/boundary, no CSV mismatch) | **2** | Baseline |
| **S1** | Relax distance to $\le 300\text{ m}$, Name strong, Muni exact/boundary, **ignore elevation mismatch** | **3** | +1 |
| **S2** | Relax distance to $\le 300\text{ m}$, Name strong, Muni exact/boundary/adjacent, default mismatch | **3** | +1 |
| **S3** | Relax distance to $\le 500\text{ m}$, **Exact Name Match**, Muni exact/boundary, default mismatch | **5** | +3 |
| **S4** | Same as S2, but elevation mismatch threshold is relaxed to $\le 300\text{ m}$ | **3** | +1 |
| **S5** | Same as S2, but **ignore CSV coordinate mismatch** (non-authoritative source) | **3** | +1 |

### Simulation Key Observations:
* Even under the most relaxed policy (S3, expanding distance to $500\text{ m}$ with exact name match), only **5 records** are auto-supported.
* **Why?** The primary blockers are not just distance, but **name evidence mismatch** (`name_missing` in 66.7% of cases) and **elevation mismatch**.
* For example, Mountain 234 (`石鎚山`) has a GPX candidate at $129.4\text{ m}$ (strong distance) and exact municipality, but fails due to `name_missing` (the track was named `面河山`) and `csv_elevation_mismatch` ($452.1\text{ m}$ difference).

---

## 7. Next Implementation Recommendations & Risks

### Recommendation
1. **Do not relax the distance threshold beyond $300\text{ m}$**: GPX track points more than $300\text{ m}$ away from the Gemini grounding anchor are highly likely to belong to different peaks or trail bends.
2. **Accept boundary-compatible and adjacent municipality checks**: If the municipality matches boundary-compatibility or topological adjacency, it should not block auto-support *provided* there is exact track/activity name containment.
3. **Allow warnings for CSV elevation and coordinate mismatches**: The legacy CSV coordinates and elevation records are unverified. They should not block auto-support if name evidence and geographic grounding consensus are strong. Instead, generate warnings rather than hard blocker flags.

### Risks
* Relaxing the name evidence constraint (e.g., accepting token-based containment without track name verification) poses a high risk of false-positive assignments, especially in Ehime where same-name mountains and multi-peak traverses are common.

---

## 8. Integrity and Scope Signoff

* **Assignment outputs regenerated?**: **No**. No assignment JSONL or review CSVs under the balanced method were overwritten or regenerated.
* **Current review entry point replaced?**: **No**. Stage 25 `grounding_assisted_review_v2` remains the canonical entry point.
* **Source data or old outputs modified?**: **No**.

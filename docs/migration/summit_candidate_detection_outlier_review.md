# Summit Candidate Detection Outlier Review

## Purpose
This review identifies outlier cases from the baseline summit candidate detection audit (`docs/migration/summit_candidate_detection_audit.md`). The goal is to surface problematic GPX files—such as those with zero candidates, excessive candidates, or unusually short tracks—to inform future parameter tuning for the `detect_summit_candidates` pipeline stage.

## Validation / Safety Notes
* **This is a read-only review.**
* No GPX files were modified or generated.
* No mountain names were assigned.
* The review does not choose final production parameters.
* Track names and YAMAP titles are used **only as review metadata** and are **not** detection evidence.

## Inputs Used
* `docs/migration/summit_candidate_detection_baseline_summary.csv`
* `docs/migration/gpx_yamap_activity_link_candidates.csv`

## Outlier Selection Criteria
The following transparent, conservative rules were used to flag outliers:
* **zero_candidates**: `candidate_count_default == 0`
* **high_candidate_count**: `candidate_count_default >= 5`
* **few_trackpoints**: `trackpoint_count < 50`
* **low_elevation_range**: `elevation_range < 50`
* **linking_unresolved**: GPX file has `no_candidate`, `multiple_candidates`, or `needs_review` match status in the linking audit.
* **title_candidate_count_mismatch**: A weak heuristic that compares the number of detected candidates against the number of mountain-like components in the track name or YAMAP title.

## Summary Counts by Category
A total of 81 GPX files met one or more outlier criteria.

| Outlier Category | Count |
| :--- | :--- |
| few_trackpoints | 54 |
| low_elevation_range | 36 |
| zero_candidates | 25 |
| high_candidate_count | 19 |
| linking_unresolved | 6 |
| title_candidate_count_mismatch | 3 |

## Zero-Candidate Examples
The following tracks yielded 0 summit candidates under the baseline parameters:

| GPX Path | Track Name | Trackpoints | Elevation Range | Outlier Categories |
| :--- | :--- | :--- | :--- | :--- |
| `gpx/raw/yamap_2022-02-27_10_22.gpx` | 日王山 | 24 | 39.49 | zero_candidates|few_trackpoints|low_elevation_range |
| `gpx/raw/yamap_2022-05-07_13_44.gpx` | 翠波峰 | 11 | 8.83 | zero_candidates|few_trackpoints|low_elevation_range |
| `gpx/raw/yamap_2022-05-07_14_18.gpx` | 平石山 | 19 | 24.72 | zero_candidates|few_trackpoints|low_elevation_range |
| `gpx/raw/yamap_2022-07-14_11_15.gpx` | 龍石山 | 15 | 23.59 | zero_candidates|few_trackpoints|low_elevation_range |
| `gpx/raw/yamap_2022-09-07_13_28.gpx` | 湯築山 | 19 | 19.15 | zero_candidates|few_trackpoints|low_elevation_range |

## High-Candidate-Count Examples
The following tracks yielded 5 or more candidates under the baseline parameters:

| GPX Path | Track Name | Candidates | Trackpoints | Elevation Range | Outlier Categories |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `gpx/raw/yamap_2022-02-06_08_26.gpx` | 谷上山・権現山・白滝山・障子山 | 5 | 912 | 747.93 | high_candidate_count |
| `gpx/raw/yamap_2022-02-11_08_26.gpx` | 塩ヶ森・番駄ヶ森・ケタ山・大磨山・鍵山（象ヶ森） | 5 | 588 | 574.32 | high_candidate_count |
| `gpx/raw/yamap_2022-03-05_09_44.gpx` | 城山・水梨山・向山 | 5 | 661 | 395.54 | high_candidate_count |
| `gpx/raw/yamap_2022-04-08_09_33.gpx` | 鬼ヶ城山・大久保山・八面山・三本杭・横ノ森・小屋ヶ森・毛山 | 5 | 583 | 218.57 | high_candidate_count |
| `gpx/raw/yamap_2022-05-15_06_10.gpx` | 割石東山・青滝山・堂ヶ森 | 6 | 1171 | 1000.31 | high_candidate_count |

## Title-Component Heuristic Notes
A simple heuristic split the `track_name` or `yamap_title` on common separators (`・`, `/`, `／`, `〜`, `～`, `→`, `,`, `、`) to count non-empty title components.
* If a title appears to contain multiple mountain names but no candidates were detected, it flags possible under-detection.
* If the number of candidates vastly exceeds the title components, it flags possible over-detection.
* **Warning:** This is a weak review heuristic only. Title metadata must not be treated as detection evidence or used to assign authoritative identities.

## Limitations
* This review relies on the existing baseline summary. It did not re-parse the GPX files directly.
* True false-positives/false-negatives can only be confirmed via manual visual inspection of the elevation profile or map.

## Recommendations
* **Short Tracks:** Files with `few_trackpoints` or `low_elevation_range` (such as very brief walks) often result in `zero_candidates`. Consider whether these files require a lower minimum prominence threshold or if they should be excluded from candidate detection.
* **Long Multi-Peak Traverses:** Files with `high_candidate_count` generally correlate with long, multi-peak traverse routes (as hinted by their multi-component titles). The current parameters might be performing correctly on these, but manual spot-checking is advised.

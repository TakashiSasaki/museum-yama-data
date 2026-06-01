# Summit Candidate Detection Audit

## Purpose
This read-only audit evaluates the baseline summit candidate detection logic derived from the legacy `.agents/skills/yama-data-pipeline/commands/annotate.js` script. The goal is to understand how the current algorithmic peak-detection behaves on the existing `gpx/raw/*.gpx` files and to identify whether its parameters may need tuning for the future `detect_summit_candidates` Kedro pipeline stage.

**Important Disclaimers:**
- **This audit is read-only.**
- No GPX files were modified or generated.
- No generated candidate GPX files were created.
- **No mountain names were assigned.**
- The legacy `assignPeakNames()` behavior was intentionally excluded, following the policy to decouple candidate detection from mountain identity resolution.
- The audit **does not choose final production parameters**. It provides behavior summaries for informed decision-making.
- The audit does not implement the future Kedro pipeline; it simply tests the parameter behavior on current raw GPX data using Python.

## Methodology
The audit runs a Python replication of the legacy `annotate.js` algorithmic peak detection. It processes all `.gpx` files in `gpx/raw/`.

The core algorithm performs the following steps:
1. **Smoothing**: A moving average is applied to the elevation profile using a defined window size.
2. **Local Maxima Detection**: The smoothed profile is scanned for peaks that are local maxima within a defined radius.
3. **Global Maximum Inclusion**: If the track's global maximum elevation isn't already included in the candidates, it is added.
4. **Prominence Calculation**: A standard prominence-like value is calculated for each candidate based on adjacent cols/saddles.
5. **Prominence Filtering**: Candidates are filtered against a minimum prominence threshold.
6. **Geographic Merging**: Candidates closer than a specific geographic distance (in meters, using the Haversine formula) are merged.

## Baseline Default Parameters Evaluated
The existing legacy parameters evaluated as the baseline are:
- `SMOOTH_WINDOW` = 5
- `PEAK_RADIUS` = 10
- `MIN_PROMINENCE` = 30 (meters)
- `MERGE_DISTANCE` = 100 (meters)

*(Note: `ELEV_TOLERANCE` = 50 was excluded as it only applies to legacy name assignment).*

## Coverage Counts
The audit successfully processed the raw GPX files. Results are summarized in CSV format.

## Default Baseline Summary
A summary of the baseline performance is available at:
`docs/migration/summit_candidate_detection_baseline_summary.csv`

This file provides candidate counts per GPX track based on the default parameters.

## Parameter Sensitivity Summary
To understand how sensitive the detection logic is to parameter adjustments, several variants were tested:

| Variant ID | Smooth | Radius | Min Prominence | Merge Dist. | Total Candidates | Zero Candidates | One Candidate | Multiple Candidates | Median per file | Max per file |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| baseline | 5 | 10 | 30 | 100 | 496 | 25 | 167 | 101 | 1 | 7 |
| lower_prominence | 5 | 10 | 20 | 100 | 583 | 18 | 155 | 120 | 1 | 8 |
| higher_prominence | 5 | 10 | 50 | 100 | 385 | 52 | 163 | 78 | 1 | 5 |
| smaller_merge_distance | 5 | 10 | 30 | 50 | 506 | 25 | 166 | 102 | 1 | 7 |
| larger_merge_distance | 5 | 10 | 30 | 200 | 491 | 25 | 167 | 101 | 1 | 7 |

A detailed CSV of the parameter sensitivity is available at:
`docs/migration/summit_candidate_detection_parameter_sensitivity.csv`

### Sensitivity Findings
- **Prominence is highly sensitive**: Lowering prominence to 20m increased the total candidates by ~17%, whereas increasing it to 50m decreased candidates by ~22%.
- **Merge Distance is slightly sensitive**: Adjusting the merge distance from 100m down to 50m slightly increased total candidates (by 10), and raising it to 200m slightly decreased them (by 5).
- The baseline parameters generally produce a median of 1 summit candidate per GPX file, avoiding excessive noise on typical tracks.

## Limitations
- **Data Quality**: The algorithm relies entirely on the quality of GPX elevation data. Device noise, barometric fluctuations, or missing elevation values can skew results.
- **Track Topology**: Out-and-back tracks versus loop tracks might yield duplicate candidate detections if the user rested at the peak for an extended time.
- **Exclusion of Route Geometry**: This audit strictly evaluates parameter sensitivity without plotting or outputting candidate coordinates or route geometry to maps.

## Recommendations
- Retain the baseline values (`min_prominence=30`, `merge_distance=100`) as a solid starting point for candidate detection logic. They appear well-balanced, yielding an average of ~1 peak per file without over-detecting noise.
- Investigate the GPX files that returned 0 peaks or 0 valid elevation points to confirm whether the tracks are genuinely flat or if the data is malformed.

## Next Steps
- Review the outlier files identified in `summit_candidate_detection_baseline_summary.csv`.
- Once parameters are finalized (outside the scope of this audit), begin implementing the target Kedro `detect_summit_candidates` stage to produce `data/08_reporting/gpx/summit_candidates/` (which will contain non-semantic candidate IDs).

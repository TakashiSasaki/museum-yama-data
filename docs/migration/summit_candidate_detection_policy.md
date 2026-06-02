# Summit Candidate Detection Policy

This document defines the policy for detecting summit candidates from GPX files and describes the intended future `detect_summit_candidates` pipeline stage. It strictly distinguishes candidate detection from mountain identity resolution.

## Separation of Concerns

The pipeline must separate the detection of unverified peak coordinates from the assignment of canonical mountain names.

1.  **`detect_summit_candidates`**:
    *   This stage runs **before** mountain-name identification.
    *   It **must not** assign authoritative mountain names.
    *   It **must not** use CSV mountain-name records, YAMAP activity titles, curated research documents, reverse-geocoded municipality names, or existing annotated GPX names to decide mountain identities.
    *   It **must only** use GPX-derived evidence:
        *   Trackpoint latitude and longitude
        *   Elevation
        *   Timestamps
        *   Ascent/descent transitions
        *   Local maxima in the elevation profile
        *   Prominence-like measures
        *   Distance/time separation between candidates
    *   Output candidates must remain unresolved. If a display label is necessary, use empty strings, null, or a stable non-semantic ID (e.g., `summit-candidate-001`).

2.  **`estimate_municipality`**:
    *   Enriches detected candidates with location evidence (city/county/town/village level).
    *   This is evidence-gathering, not identity resolution.

3.  **`resolve_mountain_identity`**:
    *   A later stage that uses the detected candidates, YAMAP metadata, curated research, and municipality data to assign a canonical mountain identity.

## Legacy / Reference Implementation

The existing script located at `.agents/skills/yama-data-pipeline/commands/annotate.js` contains a legacy peak-detection implementation. This script is useful as a reference baseline but contains behavior that must be separated in the future.

### Baseline Algorithmic Behavior
The legacy script performs the following steps:
*   Smooths the elevation series over a window.
*   Identifies local maxima over a defined radius.
*   Always includes the global maximum if it wasn't already caught.
*   Computes a prominence-like value for each candidate.
*   Filters candidates by a minimum prominence threshold.
*   Merges nearby peaks based on geographic distance.

**Current Parameters (Require Audit/Tuning):**
*   `SMOOTH_WINDOW = 5`
*   `PEAK_RADIUS = 10`
*   `MIN_PROMINENCE = 30`
*   `MERGE_DISTANCE = 100`
*   `ELEV_TOLERANCE = 50`

The legacy/reference detection parameters have a read-only baseline audit in `docs/migration/summit_candidate_detection_audit.md`. The audit evaluates candidate-count behavior and parameter sensitivity, but does not select final production parameters. The baseline audit has a follow-up outlier review in `docs/migration/summit_candidate_detection_outlier_review.md`, focusing on zero-candidate, high-candidate-count, low-elevation-range, few-trackpoint, and linking-unresolved cases. This review supports parameter tuning but does not select production parameters.

### Important Constraints for Future Implementations
*   **Legacy Name Assignment**: The existing `assignPeakNames()` function is legacy behavior. It attempts to map peaks to known mountain names from a CSV file. This behavior **must not** be part of the future `detect_summit_candidates` stage. Name assignment belongs solely in `resolve_mountain_identity`.
*   **Parameter Tuning**: The current parameters are a baseline, not a final optimized policy. They require auditing and tuning, and may need to be adjusted dynamically based on route types or data quality.

## Summit Candidate ID Rules

Summit candidate IDs should be stable non-semantic identifiers. The exact generation rule is a future implementation decision, but IDs must adhere to the following constraints:
*   They must not encode final mountain names.
*   They must remain stable enough for review across repeated pipeline runs when the same input GPX and detection parameters are used.
*   They should be traceable to source evidence, such as source GPX path, track/segment, trackpoint index, or detection run metadata.
*   They should not depend on mutable display names or later identity-resolution results.

## Suggested Output Fields

The `summit_candidates` output dataset must not include final mountain identity fields as required attributes. Suggested fields include:

*   `summit_candidate_id` (stable, non-semantic)
*   `source_gpx_path`
*   `source_track_id`
*   `source_trackpoint_index`
*   `lat`
*   `lon`
*   `ele`
*   `time`
*   `smoothed_ele`
*   `prominence`
*   `detection_method`
*   `detection_parameters`
*   `candidate_status`
*   `needs_review`
*   `notes`

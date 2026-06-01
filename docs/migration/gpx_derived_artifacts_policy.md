# GPX Derived Artifacts Policy

This document establishes the audit rules, path mappings, and processing policy for GPX files and their derived artifacts in the repository. The target state anticipates a DVC + Kedro architecture, emphasizing the strict separation of source data from derived/regenerable work.

## Raw GPX (`gpx/raw/`)
The original GPX files represent individual YAMAP activities. These files are primary raw/source data and **must remain immutable**.
- **Role:** Immutable source data.
- **Future Target:** `data/01_raw/gpx/yamap/`

## Summit Candidate Waypoint Generation
For each single-activity GPX file, adding summit candidate points as GPX waypoints is a required pipeline step.

### Separation of Concerns
The pipeline must strictly distinguish between two conceptual steps:
1. **Summit Candidate Detection**
   - Required pipeline step.
   - Detects candidate points from the elevation profile.
   - Adds candidate waypoints to GPX.
   - **Crucially:** Does not assign final authoritative summit names. Candidate waypoints should either have no name assigned or use a stable, non-semantic candidate ID (e.g., `summit-candidate-001`).

2. **Summit Identity Resolution**
   - A separate, later downstream step.
   - Attempts to associate candidate waypoints with actual mountain/summit names.
   - May require correlation with YAMAP metadata, Excel/CSV records, elevation, coordinates, municipality, known mountain data, and potentially human review.
   - Some identities may remain unresolved ("needs decision").

### Future Pipeline Artifact Paths
Future outputs from this process should be organised as follows:
- **future summit-candidate GPX:** `data/08_reporting/gpx/summit_candidates/`
- **future summit-candidate table:** `data/04_feature/summit_candidates/`
- **future summit identity candidates:** `data/04_feature/summit_identity_candidates/`
- **future resolved mountain waypoint GPX:** `data/08_reporting/gpx/mountain_waypoints/`

### Resolved Mountain Waypoints vs. Summit Candidates
It is essential to distinguish the outputs:
- **Summit-candidate GPX** contains unverified candidate waypoints that represent detected peaks but lack authoritative mountain names. They should use non-semantic stable IDs (e.g., `summit-candidate-001`).
- **Resolved mountain waypoint GPX** is the first concrete target export format. It contains identified mountains as waypoints, with authoritative names, disambiguation labels, and GPX `<extensions>` preserving identity evidence references. These are distinct datasets.

## Legacy Annotated GPX (`gpx/annotated/`)
The existing `gpx/annotated/` directory contains outputs produced by the legacy `annotate` command. These outputs were generated manually or experimentally.
- **Status:** Their correctness is not currently trusted.
- **Content:** These files contain generated summit waypoints and exhibit historical summit-name assignment behavior.
- **Policy:** Existing summit names in these annotated files must **not** be treated as authoritative final summit annotations. However, these files must be **preserved as legacy evidence** of historical work products.
- **Target Mapping:** `data/99_work/legacy_annotated_gpx/`

## Yearly Merged GPX (`gpx/merged-by-year/`)
The repository contains `gpx/merged-by-year/` files, created to help visualise the whole dataset by merging individual activity GPX tracks per year (e.g., for Google My Maps import).
- **Status:** These are derived overview/reporting artifacts, not primary data.
- **Policy:** Existing yearly merged files are useful legacy outputs but require reproducibility and completeness validation against the raw source GPX.
- **Target Mapping:** `data/08_reporting/gpx/merged_by_year/`

## Validation Requirements

Future pipelines must satisfy the following validation requirements.

### For Summit-Candidate GPX
- Raw trackpoints must remain unchanged.
- Trackpoint count must remain unchanged.
- Trackpoint coordinates, elevation, and timestamps must remain unchanged.
- Differences between raw and summit-candidate GPX should be strictly limited to waypoint additions and expected GPX metadata changes.
- Added waypoints should be located at or near source trackpoints.
- Waypoint elevation should correspond to source trackpoint elevation.
- Candidate IDs must be stable enough for review across pipeline runs.
- Candidate identity status should remain unresolved unless specifically resolved by a separate downstream step.

### For Yearly Merged GPX
- All intended raw GPX tracks for a given year must be included.
- No unexpected raw GPX tracks should be included.
- No duplicate tracks should be introduced.
- Trackpoint data should not be silently modified.
- The merge policy dictating year assignment must be explicitly documented.

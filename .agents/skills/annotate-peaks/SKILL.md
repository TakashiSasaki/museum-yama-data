---
name: annotate-peaks
description: >
  Use this skill to detect mountain summit points in GPX tracks using
  elevation profile analysis and generate annotated GPX files with waypoint
  markers. Matches detected peaks to known mountain names from CSV records.
---

# Annotate Peaks Skill

## When to Use
Run this skill after new GPX files have been added (via the `import-data` skill)
to generate annotated versions with peak waypoints for visualization.

## Algorithm
1. **Smooth** elevation data using a moving average (window=5 points).
2. **Detect local maxima** by comparing each point against its neighbors (radius=10 points).
3. **Filter by prominence**: keep only peaks that rise ≥30m above surrounding terrain.
4. **Merge nearby peaks**: if two peaks are within 100m, keep only the higher one.
5. **Assign names**: match detected peaks to the mountain database loaded from CSV files
   by comparing track names and elevation values (±50m tolerance).

## Steps
1. Load mountain database from all CSV files in `csv/`.
2. For each GPX file in `gpx/`:
   a. Parse track points (lat, lon, ele, time).
   b. Run peak detection algorithm.
   c. Match detected peaks to known mountain names.
   d. Generate annotated GPX with `<wpt>` waypoint elements.
   e. Save to `gpx/annotated/`.
3. Print summary of detected and named peaks.

## Execution
```powershell
node .agents/skills/annotate-peaks/annotate_peaks.js
```

## Dependencies
- Node.js (no external packages required)

## Tunable Parameters
Edit the `CONFIG` object in `annotate_peaks.js`:

| Parameter | Default | Description |
|:---|:---|:---|
| `SMOOTH_WINDOW` | 5 | Moving average window size |
| `PEAK_RADIUS` | 10 | Neighbor points to check for local max |
| `MIN_PROMINENCE` | 30m | Minimum prominence threshold |
| `MERGE_DISTANCE` | 100m | Merge peaks closer than this |
| `ELEV_TOLERANCE` | 50m | Max diff for CSV name matching |

## Output
- `gpx/annotated/*.gpx` — Annotated GPX files with `<wpt>` summit markers.
- Original GPX files in `gpx/` are never modified.

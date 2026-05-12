---
name: merge-tracks
description: >
  Use this skill to consolidate multiple individual GPX track files into
  yearly merged files for importing into Google My Maps (which has a 10-layer
  limit). Groups tracks by year extracted from the filename.
---

# Merge Tracks Skill

## When to Use
Run this skill when you need to prepare GPX files for import into Google My Maps
or other visualization tools that have layer or file count limits.

## Steps
1. Scan all `.gpx` files in the `gpx/` directory (excluding `merged/` and `annotated/`).
2. Extract the year from each filename (e.g., `2024` from `yamap_2024-06-16_07_27.gpx`).
3. Group all tracks by year.
4. For each year, combine all `<trk>` elements into a single GPX file.
5. Save the merged files to `gpx/merged/` (e.g., `2022_merged.gpx`).

## Execution
```powershell
node .agents/skills/merge-tracks/merge_by_year.js
```

## Dependencies
- Node.js (no external packages required)

## Output
- `gpx/merged/YYYY_merged.gpx` for each year present in the data.

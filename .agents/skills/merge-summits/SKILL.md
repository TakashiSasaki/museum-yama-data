---
name: merge-summits
description: >
  Extracts waypoints from multiple GPX files (and directories containing GPX files recursively),
  treats them as mountain peaks, and merges duplicates based on proximity (50m radius).
  It prioritizes keeping the highest elevation point for each cluster. If a lower point has a proper name
  and the higher point has a generic name (e.g. "Peak (xxxm)"), the proper name is transferred to the higher point.
---

# Merge Summits Skill

## When to Use
Use this skill when you want to consolidate mountain peaks (waypoints) from multiple individual GPX files or directories into a single, clean GPX file representing all unique summits. This is especially useful for creating a master list of all conquered peaks.

## Algorithm
1. **Recursive Discovery**: Search through all provided files and directories to find every `.gpx` file.
2. **Extraction**: Extract all `<wpt>` (waypoint) tags, including their coordinates, elevation (`<ele>`), and name (`<name>`).
3. **Exact Deduplication**: Remove any waypoints that have identically matching latitude and longitude strings.
4. **Proximity Deduplication**: 
   - Sort all extracted waypoints by elevation in descending order.
   - Iterate through the list. For each waypoint, check if it's within a 50-meter radius of any already-accepted (higher) waypoint using the Haversine formula.
   - If it is within 50m, it's considered a duplicate of the higher peak and is discarded.
   - **Name Inheritance**: If the discarded (lower) peak has a proper mountain name, but the kept (higher) peak has a generic name starting with "Peak (", the script automatically transfers the proper name to the higher peak.
5. **Output**: Save the final deduplicated list of waypoints into a new GPX file.

## How to use
Provide any mix of GPX file paths and directory paths as arguments. Use the `--output` or `-o` flag to specify the resulting GPX file (defaults to `all_unique_summits.gpx` in the current directory if omitted).

## Execution Command
```powershell
node .agents/skills/merge-summits/merge_summits.js <path1> <path2> ... [--output result.gpx]
```

### Examples
- Process a single folder and output to desktop:
  ```powershell
  node .agents/skills/merge-summits/merge_summits.js gpx/annotated --output C:\Users\takas\Desktop\all_peaks.gpx
  ```
- Process specific files and a folder together:
  ```powershell
  node .agents/skills/merge-summits/merge_summits.js gpx/annotated/file1.gpx gpx/annotated/file2.gpx other_gpx_folder --output merged.gpx
  ```

## Dependencies
- Node.js (no external packages required)

---
name: reverse-geocode-points
description: Takes GPX files and fetches reverse geocoding data for all waypoints and the start/end trackpoints, exporting to a JSON file. Now supports outputting to directories.
---

# Reverse Geocode Points

This script parses GPX files (waypoints and optionally trackpoints) and fetches reverse geocoding data using the Nominatim OpenStreetMap API.
To comply with the Nominatim usage policy, requests are rate-limited to 2.5 seconds per request by default.

## Usage

```bash
node reverse_geocode_points.js --input <path1> [<path2> ...] --out <output_path> [--limit <num>] [--all-trkpt] [--interval <ms>]
```

### Arguments
* `--input`: One or more paths to `.gpx` files or directories containing `.gpx` files.
* `--out`: The path to output the JSON results.
    * If a **directory** is specified, all `.json` files in the directory are read to skip already processed points. A new file named `geocoded_points_<timestamp>.json` will be created for the new points.
    * If a **file** is specified, that file is read to skip already processed points, and new points will be appended to the same file.
* `--limit`: (Optional) The maximum number of points to process in a single run. Defaults to 100.
* `--all-trkpt`: (Optional) If provided, geocodes all trackpoints. By default, only the first and last trackpoints of a segment are geocoded.
* `--interval`: (Optional) The wait time between API requests in milliseconds. Defaults to 2500ms. Minimum is 1000ms.

## Example

Process the next 100 unprocessed points from the unique summits and raw GPX folders, and output to the `reverse_geocoding` directory:

```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input gpx/all_unique_summits.gpx gpx/raw/ --out reverse_geocoding/ --limit 100
```

## Important Note regarding Nominatim API Data Accuracy

*   The Nominatim OpenStreetMap API may return incomplete, incorrectly formatted, or inaccurate information for certain regions, especially for the English translations of Japanese addresses.
*   Administrative boundaries (e.g., mismatching cities as counties) or missing local town names can occasionally happen due to the underlying open-source database.
*   If you find that the English translation contains Japanese characters or differs from reality, you may need to use an external script to patch the `.json` output files, or refer to the Japanese text as the source of truth ("正本").

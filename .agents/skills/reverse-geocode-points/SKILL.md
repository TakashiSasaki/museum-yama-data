---
name: reverse-geocode-points
description: Performs reverse geocoding on arbitrary GPX waypoints and trackpoints using the Nominatim OpenStreetMap API, supporting both Japanese and English.
---

# Reverse Geocode Points Skill

This skill extracts geographic coordinates (latitude and longitude) from GPX files (waypoints and trackpoints), then performs reverse geocoding to retrieve address information (Prefecture, County, City, Local area) in both Japanese and English. It is built to be a robust, general-purpose standalone agent skill that can work on any GPX data across Windows and Linux environments.

## Features

- **Flexible Input Support:** Accepts one or multiple GPX files, as well as entire directories containing GPX files.
- **Comprehensive Parsing:** Extracts `<wpt>` (waypoints) and `<trkpt>` (trackpoints). By default, it grabs all waypoints and only the first and last trackpoints (start and end). An optional flag allows extracting all trackpoints.
- **Reverse Geocoding:** Uses the free Nominatim (OpenStreetMap) API (`https://nominatim.openstreetmap.org/reverse`).
- **Rate Limit Compliance:** Automatically respects Nominatim's strict usage policies by inserting delays of at least 3.5 seconds between API requests to avoid overloading the server.
- **Multilingual Support:** Queries for both Japanese (`ja`) and English (`en`) address components.
- **Robust and Portable:** Validates input existence, provides descriptive error messages, and gracefully handles file paths across different operating systems.

## Usage

Run the script using Node.js, providing the required arguments:

```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input <path_to_gpx_or_dir> [<another_path> ...] --out <path_to_output_json>
```

### Parameters

- `--input`: One or more paths to GPX files or directories containing GPX files. Directories will be scanned for `.gpx` files (non-recursive).
- `--out`: Path to save the resulting JSON file (e.g., `geocoded_points.json`).
- `--limit`: (Optional) Maximum number of points to process in one run. Defaults to `100`.
- `--all-trkpt`: (Optional) If specified, the script will extract and geocode *every* trackpoint (`<trkpt>`) found in the GPX files. Without this flag, only the first and last trackpoints of each file are processed.

### Incremental Processing / Auto-Resume

The script supports incremental processing using the `--limit` option. It features an **auto-resume capability**: if the output file specified by `--out` already exists, the script will automatically read the number of already geocoded points in the file and skip exactly that many items. It will then geocode the next batch of points (up to the given `--limit`) and append the new results to the existing JSON array.

Example for processing the next 100 items (the script will automatically detect how many points have already been processed and start from the next un-processed point):
```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input gpx/all_unique_summits.gpx gpx/raw --out geocoded_points.json --limit 100
```

### JSON Output Format

The output is a JSON array of objects, with missing address parts mapped to empty strings (`""`) and failed geocoding mapped to `null`:

```json
[
  {
    "type": "waypoint",
    "source_file": "my_route.gpx",
    "lat": 33.7675949,
    "lon": 133.1152818,
    "geocode": {
      "ja": {
        "prefecture": "愛媛県",
        "county": "上浮穴郡",
        "city": "久万高原町",
        "local": "〇〇"
      },
      "en": {
        "prefecture": "Ehime Prefecture",
        "county": "Kamiukena District",
        "city": "Kumakogen",
        "local": "..."
      }
    }
  }
]
```

Valid `type` values are: `"waypoint"`, `"trackpoint"`, `"trackpoint_start"`, and `"trackpoint_end"`.

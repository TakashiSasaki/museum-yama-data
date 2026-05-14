---
name: geocode-points
description: Performs reverse geocoding on peak summits and route start/end points using the Nominatim OpenStreetMap API, supporting both Japanese and English.
---

# Geocode Points Skill

This skill extracts geographic coordinates (latitude and longitude) from mountain peak waypoints and route tracks, then performs reverse geocoding to retrieve address information (Prefecture, County, City, Local area) in both Japanese and English.

## Features

- **Input Support:** Reads peaks from a consolidated GPX file containing `<wpt>` tags and extracts route start/end points by parsing `<trkpt>` tags from individual GPX trace files.
- **Reverse Geocoding:** Uses the free Nominatim (OpenStreetMap) API (`https://nominatim.openstreetmap.org/reverse`).
- **Rate Limit Compliance:** Automatically respects Nominatim's strict usage policies by inserting delays of at least 3.5 seconds between API requests to avoid overloading the server.
- **Multilingual Support:** Queries for both Japanese (`ja`) and English (`en`) address components.
- **Portable Design:** File paths are not hardcoded. The script accepts command-line arguments to adapt to various directory structures.

## Usage

Run the script using Node.js, providing the required arguments:

```bash
node .agents/skills/geocode-points/geocode_points.js --summits <path_to_summits_gpx> --raw-dir <path_to_raw_gpx_dir> --out <path_to_output_json>
```

### Parameters

- `--summits`: Path to the GPX file containing mountain peak waypoints (e.g., `gpx/all_unique_summits.gpx`).
- `--raw-dir`: Path to the directory containing raw GPX files representing climbing routes (e.g., `gpx/raw`). Start and end points will be extracted from these traces.
- `--out`: Path to save the resulting JSON file (e.g., `geocoded_points.json`).
- `--skip`: (Optional) Number of points to skip before processing. Defaults to `0`.
- `--limit`: (Optional) Maximum number of points to process in one run. Defaults to `100`.

### Incremental Processing

The script supports incremental processing using `--skip` and `--limit`. If the output file specified by `--out` already exists, the script will append the new results to the existing JSON array instead of overwriting it.

Example for processing the next 100 items (after the first 100):
```bash
node .agents/skills/geocode-points/geocode_points.js --summits gpx/all_unique_summits.gpx --raw-dir gpx/raw --out geocoded_points.json --skip 100 --limit 100
```

### JSON Output Format

The output is a JSON array of objects, with missing address parts mapped to empty strings (`""`) and failed geocoding mapped to `null`:

```json
[
  {
    "type": "peak",
    "source_file": "all_unique_summits.gpx",
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

Valid `type` values are: `"peak"`, `"start_point"`, and `"end_point"`.

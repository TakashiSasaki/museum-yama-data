---
name: reverse-geocode-points
description: Takes GPX files and fetches reverse geocoding data for all waypoints and the start/end trackpoints. The process is split into three layers (raw, extracted, derived) to retain data without loss.
---

# Reverse Geocode Points (3-Layer Architecture)

The reverse geocoding pipeline uses Nominatim OpenStreetMap API and is divided into three consecutive scripts to prevent information loss, separate fetching from processing, and allow rules to be reapplied to raw data in the future.

## Pipeline Usage

### 1. Fetch Raw Data

Reads GPX files, makes network requests, and outputs raw Nominatim responses.

```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input <path1> [<path2> ...] --out <output_dir> [--limit <num>] [--all-trkpt] [--interval <ms>]
```

**Example:**
```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input gpx/all_unique_summits.gpx gpx/raw/ --out data/01_raw/reverse_geocoding/raw/nominatim --limit 100
```

### 2. Extract Fields

Reads the raw output files and extracts basic address components (prefecture, county, city, local) while recording the exact source keys.

```bash
node .agents/skills/reverse-geocode-points/extract_address_from_raw.js --input <raw_dir> --out <extracted_dir>
```

**Example:**
```bash
node .agents/skills/reverse-geocode-points/extract_address_from_raw.js --input data/01_raw/reverse_geocoding/raw/nominatim --out data/02_intermediate/reverse_geocoding/extracted/nominatim
```

### 3. Project to Vocabularies

Reads extracted files and projects the data into standard vocabularies (locn:, schema:, ic:) based on source keys, generating derived JSON output.

```bash
node .agents/skills/reverse-geocode-points/project_address_vocabularies.js --input <extracted_dir> --out <derived_dir>
```

**Example:**
```bash
node .agents/skills/reverse-geocode-points/project_address_vocabularies.js --input data/02_intermediate/reverse_geocoding/extracted/nominatim --out data/03_primary/reverse_geocoding/derived/address_projection
```

## Important Note regarding Nominatim API Data Accuracy

*   The Nominatim OpenStreetMap API may return incomplete, incorrectly formatted, or inaccurate information for certain regions, especially for the English translations of Japanese addresses.
*   Administrative boundaries (e.g., mismatching cities as counties) or missing local town names can occasionally happen due to the underlying open-source database.
*   By retaining the `raw` response and splitting the extraction and derivation phases, the system handles database errors more robustly. You can patch or regenerate the derived representation without re-querying the API.

---
name: reverse-geocode-points
description: Takes GPX files and fetches reverse geocoding data for all waypoints and the start/end trackpoints. The process is split into three layers (raw, extracted, derived) to retain data without loss.
---

# Reverse Geocode Points (3-Layer Architecture)

The reverse geocoding pipeline uses the Nominatim OpenStreetMap API and is divided into three consecutive scripts to prevent information loss, separate fetching from processing, and allow extraction/projection rules to be reapplied to raw data in the future.

## Path Policy

The raw API response cache is a preserved source snapshot. In this repository it should be written under:

```text
data/01_raw/reverse_geocoding/raw/<provider>/
```

For Nominatim, use:

```text
data/01_raw/reverse_geocoding/raw/nominatim/
```

Extracted and vocabulary-projected files are generated outputs. Use an explicit output path such as `artifacts/generated/reverse_geocoding/...` unless a later pipeline policy assigns a more formal `data/03_primary/` or `data/04_feature/` path.

The commands are portable: they accept explicit `--input` and `--out` paths and do not require a hardcoded repository root. Directory outputs are created when missing. Extensionless `--out` paths are treated as directories; `.json` `--out` paths are treated as single-file outputs.

## Pipeline Usage

### 1. Fetch Raw Data

Reads GPX files, makes network requests, and outputs raw Nominatim responses.

```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input <path1> [<path2> ...] --out <output_dir_or_json> [--limit <num>] [--all-trkpt] [--interval <ms>]
```

**Repository example:**
```bash
node .agents/skills/reverse-geocode-points/reverse_geocode_points.js --input gpx/all_unique_summits.gpx gpx/raw/ --out data/01_raw/reverse_geocoding/raw/nominatim --limit 100
```

### 2. Extract Fields

Reads the raw output files and extracts basic address components (prefecture, county, city, local) while recording the exact source keys.

```bash
node .agents/skills/reverse-geocode-points/extract_address_from_raw.js --input <raw_dir> --out <extracted_dir>
```

**Repository example:**
```bash
node .agents/skills/reverse-geocode-points/extract_address_from_raw.js --input data/01_raw/reverse_geocoding/raw/nominatim --out data/02_intermediate/reverse_geocoding/extracted/nominatim
```

### 3. Project to Vocabularies

Reads extracted files and projects the data into standard vocabularies (locn:, schema:, ic:) based on source keys, generating derived JSON output.

```bash
node .agents/skills/reverse-geocode-points/project_address_vocabularies.js --input <extracted_dir> --out <derived_dir>
```

**Repository example:**
```bash
node .agents/skills/reverse-geocode-points/project_address_vocabularies.js --input data/02_intermediate/reverse_geocoding/extracted/nominatim --out data/03_primary/municipalities/derived/address_projection
```

## Important Note regarding Nominatim API Data Accuracy

*   The Nominatim OpenStreetMap API may return incomplete, incorrectly formatted, or inaccurate information for certain regions, especially for the English translations of Japanese addresses.
*   Administrative boundaries (e.g., mismatching cities as counties) or missing local town names can occasionally happen due to the underlying open-source database.
*   By retaining the `raw` response and splitting the extraction and derivation phases, the system handles database errors more robustly. You can patch or regenerate the derived representation without re-querying the API.

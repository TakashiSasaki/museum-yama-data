---
name: yama-data-pipeline
description: Consolidated skill for local mountaineering data processing including intake, merging, annotating, and validation.
---

# yama-data-pipeline

This skill provides a unified CLI for managing local GPX and CSV data in the Yama Museum repository.

## Installation

Ensure dependencies are installed before running:

```sh
cd .agents/skills/yama-data-pipeline
npm install
```

## Usage

The skill provides a single CLI entrypoint: `cli.js`. The `--root <path>` flag is required for all data-processing operations.

### Commands

#### 1. `intake`
Processes new data from the root `gpx/` directory.
- Extracts GPX files from ZIP archives into `gpx/raw/`.
- Converts Excel files to CSVs in `csv/`.
- Moves processed source files into `processed/`.
- Safely handles filename collisions using SHA-256 hashes for content comparison.

```sh
node cli.js intake --root ../../..
```

#### 2. `merge`
Merges raw GPX tracks in `gpx/raw/` by year.
- Preserves all `<trk>` elements using XML parsing (requires `@xmldom/xmldom`).
- Outputs merged files to `gpx/merged/`.
- Does not modify source files in `gpx/raw/`.

```sh
node cli.js merge --root ../../..
```

#### 3. `annotate`
Detects peaks and annotates tracks with `<wpt>` elements.
- Reads files from `gpx/raw/`.
- Uses mountain databases in `csv/` to map detected elevations to known peaks.
- Outputs annotated files to `gpx/annotated/`.
- Does not modify source files in `gpx/raw/`.

```sh
node cli.js annotate --root ../../..
```

#### 4. `validate`
Validates all processed GPX (`raw/`, `merged/`, `annotated/`) and CSV files.
- Checks for well-formed XML and geospatial elements.
- Checks coordinate bounds, elevations, and times.
- Elevation `<ele>` tags are strictly required on all trackpoints. Although GPX itself may allow trackpoints without elevation, this repository requires `<ele>` on all trackpoints because elevation profiles are used for validation and peak annotation. Missing or non-numeric elevation tags will result in validation failure.
- Verifies CSV row structure and mountain altitude parsing. Note: The CSV parser fully supports reading embedded newlines within quoted fields.
- Exits with a non-zero status code if invalid files are found.
- Note: The `--strict` option has been removed, as the pipeline now naturally requires elevation data and strictly checks all directories.

```sh
node cli.js validate --root ../../..
```

#### 5. `test`
Runs the internal test suite against synthetic fixtures.

```sh
node cli.js test
```

## Directory Assumptions

- `gpx/raw/`: The main source of truth for individual unedited GPX tracks.
- `gpx/merged/`: Automatically generated year-based consolidated tracks.
- `gpx/annotated/`: Automatically generated GPX files with detected waypoints.
- `csv/`: Data tables containing summit definitions and other metadata.
- `processed/`: Archives original data files after intake.

## Safety Guarantees
- No data loss during collisions: During ZIP intake, entries are flattened by basename. If two ZIP entries would map to the same basename, or if a basename already exists in `gpx/raw/`, intake fails instead of renaming. This prevents silent overwrite and ambiguous data provenance. Other operations may safely rename duplicate names with different content.
- Path traversal protection: Safe extraction ensures ZIP entries don't write outside intended directories.
- No source modifications: `merge` and `annotate` never edit `gpx/raw/`.

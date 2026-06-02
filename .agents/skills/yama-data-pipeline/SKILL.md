---
name: yama-data-pipeline
description: Consolidated skill for local mountaineering data processing including intake, merging, annotating, validation, tracking missing YAMAP files, and GPX track consistency verification.
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
- Outputs merged files to `gpx/merged-by-year/`.
- Does not modify source files in `gpx/raw/`.

```sh
node cli.js merge --root ../../..
```

#### 3. `detect-candidates` (Portable)
Detects unverified summit candidates algorithmically from GPX tracks and outputs them as a CSV, using only GPX-derived evidence.
- Accepts either a single GPX file or a directory containing GPX files via `--input`.
- Writes unresolved candidates to the specified `--out` CSV file.
- Does not assign mountain names.
- Does not require CSVs, YAMAP markdown, or reverse geocoding data.
- Does not modify input GPX files or write annotated GPX files.
- Generates stable non-semantic `summit_candidate_id` hashes based on the input path and parameters.

```sh
node cli.js detect-candidates --input ../../../gpx/raw --out ../../../docs/migration/summit_candidates_skill_preview.csv
node cli.js detect-candidates --input ./test/fixtures/sample.gpx --out ./tmp/candidates.csv
```

#### 3b. `annotate` (Legacy)
Detects peaks and annotates tracks with `<wpt>` elements. **Note: This command contains legacy mountain-name assignment logic and writes to `gpx/annotated/`. The portable `detect-candidates` command is the preferred modern alternative for detection.**
- Reads files from `gpx/raw/`.
- Uses mountain databases in `csv/` to map detected elevations to known peaks.
- Outputs annotated files to `gpx/annotated/`.
- Does not modify source files in `gpx/raw/`.

```sh
node cli.js annotate --root ../../..
```

#### 4. `validate`
Validates all processed GPX (`raw/`, `merged-by-year/`, `annotated/`) and CSV files.
- Checks for well-formed XML and geospatial elements.
- Checks coordinate bounds, elevations, and times.
- Elevation `<ele>` tags are strictly required on all trackpoints. Although GPX itself may allow trackpoints without elevation, this repository requires `<ele>` on all trackpoints because elevation profiles are used for validation and peak annotation. Missing or non-numeric elevation tags will result in validation failure.
- Verifies CSV row structure and mountain altitude parsing. Note: The CSV parser fully supports reading embedded newlines within quoted fields.
- Exits with a non-zero status code if invalid files are found.
- Note: The `--strict` option has been removed, as the pipeline now naturally requires elevation data and strictly checks all directories.

```sh
node cli.js validate --root ../../..
```

#### 5. `find-missing`
Finds YAMAP activities referenced in CSV files that do not have a corresponding Markdown file in the `yamap/` directory.
- Reads and parses all `.csv` files under the `csv/` directory to extract YAMAP activity URLs (`https://yamap.com/activities/[ID]`).
- Compares those IDs with the files in the `yamap/` directory (`[ID].md`).
- Lists all missing activity IDs for easy downloading.

```sh
node cli.js find-missing --root ../../..
```

#### 6. `verify`
Verifies consistent matching between GPX files in `gpx/annotated/` and YAMAP activity Markdown records in `yamap/`.
- Parses dates and titles from the YAMAP markdown files.
- Extracts names and dates from the GPX files (using the XML DOM and JST time conversion, with filename fallback).
- Matches files based on exact, partial/substring, and date-only fallback logic.
- Displays match counts and details of unmatched tracks.

```sh
node cli.js verify --root ../../..
```

#### 7. `test`
Runs the internal test suite against synthetic fixtures.

```sh
node cli.js test
```

## Directory Assumptions

- `gpx/raw/`: The main source of truth for individual unedited GPX tracks.
- `gpx/merged-by-year/`: Automatically generated year-based consolidated tracks.
- `gpx/annotated/`: Automatically generated GPX files with detected waypoints.
- `csv/`: Data tables containing summit definitions and other metadata.
- `yamap/`: Markdown records of fetched YAMAP activities containing title, date, description, etc.
- `processed/`: Archives original data files after intake.

## Safety Guarantees
- No data loss during collisions: During ZIP intake, entries are flattened by basename. If two ZIP entries would map to the same basename, or if a basename already exists in `gpx/raw/`, intake fails instead of renaming. This prevents silent overwrite and ambiguous data provenance. Rename-on-collision behavior is only guaranteed for applicable non-ZIP intake/archiving flows, not for other subcommands such as `merge` or `annotate`.
- Path traversal protection: Safe extraction ensures ZIP entries don't write outside intended directories.
- No source modifications: `merge` and `annotate` never edit `gpx/raw/`.

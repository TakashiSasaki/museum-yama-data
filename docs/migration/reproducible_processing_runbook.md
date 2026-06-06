# Reproducible Processing Runbook

## Purpose
This document provides clear, executable, step-by-step procedures for the data-processing steps implemented in this repository. It serves as a runbook to manually reproduce intermediate outputs and details a proposed DVC stage structure for future pipeline automation when stage names and paths stabilize.

## Current Repository Assumptions
* **DVC Status**: DVC is **not** initialized (there is no active `.dvc/` directory, `dvc.yaml`, `dvc.lock`, or `params.yaml` at the root).
* **Processing Tools**: Portable Javascript subcommands are provided by the Node-based agent skill `yama-data-pipeline` under `.agents/skills/yama-data-pipeline/`.

## Layout & Directory Philosophy
* **`data/01_raw/as_received/`**: Holds unmodified, raw files received from providers. These snapshots are immutable.
* **`data/01_raw/gpx/`**: Extracted raw individual activity tracks.
* **`data/02_intermediate/activity_logs/csv_extracted/`**: Structured tabular sheets extracted from the raw workbook.
* **`data/08_reporting/gpx/summit_candidates/`**: Formatted GPX tracks with unresolved summit candidate waypoints added.

---

## Stage: extract_gpx_archive

**Status**: `executed_verified`

### Purpose
Extracts individual GPX track files from the received provider ZIP file. It filters out non-GPX entries and directories, flattens paths by basename, enforces that there are no duplicate basenames, and checks for output directory collisions (all-or-nothing atomicity).

### Inputs
* **Path**: `data/01_raw/as_received/2026-05-12/GPXファイル.zip`
  * **Role**: Provider received raw GPX ZIP archive.
  * **Status**: Exists, immutable.

### Outputs
* **Path**: `data/01_raw/gpx/2026-05-12/`
  * **Role**: Directory containing extracted raw GPX files.
  * **Status**: Exists, contains 312 GPX files.
* **Path**: `docs/migration/yoshitomi_gpx_archive_intake_report.md`
  * **Role**: Human-readable execution summary.
  * **Status**: Exists.

### Command
```sh
# Run from repository root
node .agents/skills/yama-data-pipeline/cli.js intake \
  --input "data/01_raw/as_received/2026-05-12/GPXファイル.zip" \
  --out-dir "data/01_raw/gpx/2026-05-12" \
  --report "docs/migration/yoshitomi_gpx_archive_intake_report.md"
```

### Code Dependencies
* `cli.js`
* `commands/intake.js`

### Parameters
* None (Intake is extraction-only).

### Report
* `docs/migration/yoshitomi_gpx_archive_intake_report.md`

### Validation
To verify the extraction result, run:
```sh
node .agents/skills/yama-data-pipeline/cli.js validate --root .
```

---

## Stage: extract_excel_sheets

**Status**: `executed_verified`

### Purpose
Parses the provider received raw Excel workbook and extracts worksheets exactly as separate CSV files. The extraction ensures UTF-8 encoding without BOM, `\n` (LF) line endings, and implements write-read-back validation inside a temporary staging directory to guarantee all-or-nothing correctness.

### Inputs
* **Path**: `data/01_raw/as_received/2026-05-18/えひめの山.xlsx`
  * **Role**: Yoshitomi primary raw received source workbook.
  * **Status**: Exists, immutable.

### Outputs
* **Path**: `data/02_intermediate/activity_logs/csv_extracted/2026-05-18/`
  * **Role**: Output directory for extracted sheets.
  * **Status**: Exists. Contains 5 CSV files.
* **Path**: `docs/migration/yoshitomi_excel_sheet_extraction_report.md`
  * **Role**: Human-readable sheet extraction report.
  * **Status**: Exists.

### Command
```sh
# Run from repository root
node .agents/skills/yama-data-pipeline/cli.js extract-excel-sheets \
  --input "data/01_raw/as_received/2026-05-18/えひめの山.xlsx" \
  --out-dir "data/02_intermediate/activity_logs/csv_extracted/2026-05-18" \
  --report "docs/migration/yoshitomi_excel_sheet_extraction_report.md"
```

### Expected CSV Filenames
* `愛媛県の山.csv`
* `難易度ランクの根拠.csv`
* `百名山.csv`
* `PH数の推移.csv`
* `島根県の山.csv`

### Code Dependencies
* `cli.js`
* `commands/extract-excel-sheets.js`

### Report
* `docs/migration/yoshitomi_excel_sheet_extraction_report.md`

### Validation
```sh
# Run the validation tool to check CSV fields structure
node .agents/skills/yama-data-pipeline/cli.js validate --root .
```

---

## Stage: generate_summit_candidate_gpx

**Status**: `executed_verified`

### Purpose
Applies elevation profile peak-detection to identify unresolved summit candidates from each GPX track, and creates a corresponding GPX file with `<wpt>` waypoint markers. Zero-candidate files still generate a valid output GPX containing zero waypoints. Staging is used to guarantee all-or-nothing writes.

### Semantic Constraints
* Output file count must equal source GPX file count (1-to-1 mapping).
* Candidate waypoints represent unresolved coordinates only (no mountain names or municipalities are assigned).
* Source GPX trackpoint coordinate geometry (lat, lon, ele, time) must remain entirely unchanged in outputs.

### Inputs
* **Path**: `data/01_raw/gpx/2026-05-12/`
  * **Role**: Source GPX files.
  * **Status**: Exists, contains 312 files.

### Outputs
* **Path**: `data/08_reporting/gpx/summit_candidates/2026-05-12/`
  * **Role**: Output directory for generated candidate GPX files.
  * **Status**: Exists. Contains 312 GPX files and 1 `manifest.json`.
* **Path**: `data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json`
  * **Role**: Machine-readable lineage manifest.
  * **Status**: Exists.
* **Path**: `docs/migration/summit_candidate_gpx_generation_report.md`
  * **Role**: Human-readable validation and generation report.
  * **Status**: Exists.

### Command
```sh
node .agents/skills/yama-data-pipeline/cli.js generate-summit-candidate-gpx \
  --input "data/01_raw/gpx/2026-05-12" \
  --out-dir "data/08_reporting/gpx/summit_candidates/2026-05-12" \
  --report "docs/migration/summit_candidate_gpx_generation_report.md" \
  --manifest "data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json" \
  --smooth-window 5 \
  --peak-radius 10 \
  --min-prominence 30 \
  --merge-distance 100
```

### Code Dependencies
* `cli.js`
* `commands/generate-summit-candidate-gpx.js`
* `lib/summit_detection.js`
* `lib/gpx.js`

### Parameters
* `smooth-window`: `5` (elevation moving average window size)
* `peak-radius`: `10` (local maxima radius in trackpoints)
* `min-prominence`: `30` (minimum meters elevation prominence)
* `merge-distance`: `100` (geographic merge radius in meters)

### Report
* `docs/migration/summit_candidate_gpx_generation_report.md`

### Manifest
* `data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json`

### Validation
Each generated GPX is self-validated during the run for:
1. XML parsing and GPX root structure.
2. Identical trackpoint count and coordinate geometries compared to source GPX.
3. Metadata bounds matching trackpoint coordinates bounding boxes.
4. BASENAME consistency in `<yama:source_gpx_basename>`.
5. Waypoint properties and candidate status (`unresolved`).

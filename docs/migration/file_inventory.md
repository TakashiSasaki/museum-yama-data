# File Inventory

This is a basic summary of files by directory and extension. Generated as part of the initial repository restructuring preparation.

## Directory: `gpx/`

| Extension / Type | Count |
| --- | --- |
| `.gpx` | 593 |

## Directory: `csv/`

| Extension / Type | Count |
| --- | --- |
| `.csv` | 4 |

## Directory: `processed/`

| Extension / Type | Count |
| --- | --- |
| `.xlsx` | 1 |
| `.zip` | 1 |

## Directory: `yamap/`

| Extension / Type | Count |
| --- | --- |
| `.md` | 434 |
| `.txt` | 1 |

## Directory: `museum-yama-web/`

| Extension / Type | Count |
| --- | --- |
| `.json` | 1 |

## Directory: `docs/`

| Extension / Type | Count |
| --- | --- |
| `.md` | 8 |

## Directory: `.agents/`

| Extension / Type | Count |
| --- | --- |
| `.csv` | 1 |
| `.gitignore` | 3 |
| `.gpx` | 2 |
| `.js` | 20 |
| `.json` | 7 |
| `.md` | 6 |

## Directory: `reverse_geocoding/`

| Extension / Type | Count |
| --- | --- |
| `.json` | 7 |

## Root Configuration Files

| File | Present |
| --- | --- |
| `README.md` | Yes |
| `AGENTS.md` | Yes |
| `package.json` | Yes |
| `package-lock.json` | Yes |
| `.gitignore` | Yes |

## Provenance Notes

*   **CSV Extraction:** The CSV files under `csv/` are extracted representations generated from sheets in an Excel workbook using a Python script. However, this script is not currently present in the repository, making the extraction process un-reproducible at this moment. The CSV files should be treated as intermediate/derived data, not primary raw sources.
*   **Primary Source Archives:** The `processed/` directory contains primary source archives, including the original Excel workbook for activity logs (`えひめの山.xlsx`) and the original GPX export package (`GPXファイル.zip`). These should not be edited or extracted directly in place.
*   **Reverse Geocoding & Web Cache:** The JSON files inside `reverse_geocoding/` and `museum-yama-web/` (e.g. `mountains.json`) are conservatively classified as "needs decision" regarding their regenerability. It is unproven whether they contain manual curation, so they must be treated safely and not blindly regenerated or deleted.
*   **Test Fixtures:** Data files (`.gpx`, `.csv`) located under `.agents/` (e.g., in `yama-data-pipeline/test/fixtures/`) are solely test fixtures for scripts and are not part of the project's primary dataset.
*   **YAMAP Fetch Logs:** The `yamap/yamap_all_activity_ids.txt` file acts as a master reference list or fetch log for the YAMAP Markdown activities, and should be semantically separated from the Markdown records during migration.

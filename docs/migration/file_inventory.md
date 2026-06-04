# File Inventory

This is a basic summary of files by directory and extension. Generated as part of the initial repository restructuring preparation.

## Directory: `data/01_raw/provider_received/`

| Extension / Type | Count |
| --- | --- |
| `.md` (README only) | 1 |

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

## Directory: `data/01_raw/reverse_geocoding/`

| Extension / Type | Count |
| --- | --- |
| `.json` | 7 |
| `.md` | 1 |

## Root Configuration Files

| File | Present |
| --- | --- |
| `README.md` | Yes |
| `AGENTS.md` | Yes |
| `package.json` | Yes |
| `package-lock.json` | Yes |
| `.gitignore` | Yes |

## Provenance Notes

*   **CSV Extraction:** The CSV files under `csv/` were produced by extracting all sheets from `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`. They are Excel-derived source-equivalent CSV extracts (Note: 30 rows with a blank 'No' value are explicitly excluded from the authoritative mountain source set), serving as the operational canonical tabular representation for the legacy pipeline. According to user-provided provenance, they were not manually edited, corrected, normalized, or post-processed after extraction. `csv/` is still not independent primary source data, because its provenance is the Excel workbook. The remaining blocker is locating, reconstructing, or validating the historical extraction script or equivalent extraction logic, including sheet mapping, encoding, and exact extraction behavior.
*   **Primary Source Archives:** The `processed/` directory is a legacy processed-marker archive and retained source snapshot archive. Files were moved there after old workflow handling to mark them as already processed. `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx` is the retained source snapshot / primary source workbook for the CSV-derived activity records. `data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip` is a retained source snapshot / primary GPX export package. These should not be edited or extracted directly in place.
*   **Reverse Geocoding & Web Cache:** The JSON files inside `data/01_raw/reverse_geocoding/` are classified as "preserved as raw snapshot" for municipality-level location enrichment, though schema/reuse decisions remain pending. The files inside `museum-yama-web/` (e.g. `mountains.json`) are conservatively classified as "needs decision" regarding their regenerability. It is unproven whether they contain manual curation, so they must be treated safely and not blindly regenerated or deleted.
*   **Test Fixtures:** Data files (`.gpx`, `.csv`) located under `.agents/` (e.g., in `yama-data-pipeline/test/fixtures/`) are solely test fixtures for scripts and are not part of the project's primary dataset.
*   **YAMAP Fetch Logs:** The `yamap/yamap_all_activity_ids.txt` file acts as a master reference list or fetch log for the YAMAP Markdown activities, and should be semantically separated from the Markdown records during migration.

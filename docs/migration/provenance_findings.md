# Source Provenance Findings

This document captures detailed, human-readable findings from the repository source coverage audit, to supplement the structured tables in the documentation.

## Missing CSV Extraction Script
The CSV files located in `csv/` are extracted representations generated from sheets inside an original Excel workbook. A Python script was originally used to extract the sheets into `.csv` formats. However, a repository-wide search did not find this script. As a result, the extraction process is currently irreproducible. The `csv/` files should be treated as intermediate, derived data rather than primary sources. The possibility remains that these files have been manually edited, but without further proof, they retain the `derived only` provisional classification.

## Primary Source Archives
The `processed/` directory was found to contain the true primary source archives:
1. `えひめの山.xlsx`: This is the primary source archive representing the original activity log workbook. It serves as the source from which the current `csv/` files were originally extracted.
2. `GPXファイル.zip`: This is the primary GPX export package.

These files are preserved as raw snapshots and should not be edited, nor should they be extracted directly in place.

## Web Cache Artifacts & Manual Curation Risk
The web artifact `museum-yama-web/mountains.json` is a generated web cache. However, because we do not have complete proof of its regenerability, it cannot be safely regenerated or deleted without a risk of data loss. It might contain manual curation or accumulated corrections, and is therefore classified as "needs decision."

## Reverse Geocoding
JSON files inside `reverse_geocoding/` were inspected and their precise classification is pending. We do not have sufficient evidence to confidently classify them purely as source or derived data without risking the loss of manual curation. Thus, their migration status remains "needs decision" and their proposed target path is TBD.

## YAMAP Logs & References
A fetch log, `yamap_all_activity_ids.txt`, was found inside the `yamap/` directory alongside Markdown activity records. This file acts as a master reference list. Rather than migrating it with the actual `.md` activity records under `data/01_raw/yamap_markdown/`, this file will be given a separate mapping under `data/01_raw/yamap_metadata/` to maintain the semantic split.

## Test Fixtures
Certain data files (`.csv`, `.gpx`) were discovered within the `.agents/` folder, such as `.agents/skills/yama-data-pipeline/test/fixtures/`. These have been properly identified as skill-specific test fixtures and legacy test data. They are not part of the project's primary dataset, and they will purposefully be excluded from the main data tree migration.

## GPX and YAMAP Activity ID Coverage
Original GPX files contain YAMAP activity IDs. Metadata for those activity IDs has been scraped from YAMAP web pages and saved as Markdown snapshots in `yamap/`. However, there are likely discrepancies in coverage across the various datasets.
- Extra YAMAP metadata may exist for activity IDs not present in GPX files, and that is completely acceptable.
- Future validation pipelines must not assume that the sets of activity IDs extracted from GPX files, represented by `yamap/*.md`, listed in `yamap/yamap_all_activity_ids.txt`, and represented in Excel/CSV activity logs are identical.
- Differences must be reported as coverage categories rather than being silently deleted or coerced. Example categories include:
  - GPX activity IDs without YAMAP metadata
  - YAMAP metadata without matching GPX files
  - Excel/CSV activity records without matching GPX files
  - GPX files without matching Excel/CSV activity rows
- No extra fetched metadata should be deleted merely because it is not referenced by a GPX file.
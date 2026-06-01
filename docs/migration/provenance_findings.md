# Source Provenance Findings

This document captures detailed, human-readable findings from the repository source coverage audit, to supplement the structured tables in the documentation.

## Missing CSV Extraction Script
The CSV files located in `csv/` are extracted representations generated from sheets inside an original Excel workbook. A Python script was originally used to extract the sheets into `.csv` formats. However, a repository-wide search did not find this script. As a result, the extraction process is currently irreproducible. The `csv/` files should be treated as intermediate, derived data rather than primary sources. According to user-provided provenance, these files were not manually edited or post-processed after extraction. The remaining blocker is locating, reconstructing, or validating the historical extraction script or equivalent extraction logic.

## Primary Source Archives
The `processed/` directory was found to contain the true primary source archives:
1. `えひめの山.xlsx`: This is the primary source archive representing the original activity log workbook. It serves as the source from which the current `csv/` files were originally extracted.
2. `GPXファイル.zip`: This is the primary GPX export package.

These files are preserved as raw snapshots and should not be edited, nor should they be extracted directly in place.

## Curated Research & Target Data Model Policies

Recent audits established the target framework for mountain identity resolution:
- **Mountain Identity Resolution Policy:** Explains the same-name mountain problem, defines evidence sources, and strictly separates unresolved candidates from resolved mountains. See [Mountain Identity Resolution Policy](mountain_identity_resolution_policy.md).
- **Waypoint Collection Output Policy:** Establishes that the first concrete semantic output target is a GPX/XML collection of resolved mountain waypoints. See [Waypoint Collection Output Policy](waypoint_collection_output_policy.md).
- **Target Data Model:** Describes the logical design of layers in the pipeline (`01_raw`, `02_intermediate`, `03_primary`, `04_feature`, `08_reporting`). See [Target Data Model](target_data_model.md).
- **Readiness Plan:** Outlines conditions required for bootstrapping DVC and Kedro. See [DVC and Kedro Readiness Plan](dvc_kedro_readiness_plan.md).

Furthermore, some Markdown files stored in `docs/` (e.g., `same_name_16mountains.md`, `愛媛県内七山調査依頼.md`) are not merely operational notes; they are **human-curated research documents** serving as vital evidence for mountain identity resolution. They must be preserved as legacy references and not casually rewritten.

## JSON Data Structures

For detailed findings regarding JSON data structures (`reverse_geocoding/` and `museum-yama-web/mountains.json`), please see [JSON Provenance Findings](json_provenance_findings.md). Note that `mountains.json` is a provisional web cache and will be superseded by the structured feature datasets and resolved mountain waypoint GPX output.

## GPX Derived Artifacts

Detailed policies regarding raw GPX, generated summit candidates, legacy annotations, and merged artifacts are established in the [GPX Derived Artifacts Policy](gpx_derived_artifacts_policy.md). In summary:
- `gpx/raw/` contains original single-activity GPX files and serves as immutable source data.
- `gpx/annotated/` contains legacy experimental annotated GPX files. Existing summit waypoint name assignments are not trusted.
- Summit-candidate waypoint generation is a required future pipeline step, but summit name/identity resolution must be cleanly separated from candidate detection.
- `gpx/merged-by-year/` contains yearly merged overview files for dataset browsing and Google My Maps import.
- Both legacy outputs are preserved as evidence or useful reporting, but require formalized reproducible pipelines and validation.

In summary regarding JSON Data Structures:
- `reverse_geocoding/` acts as a cache/snapshot of Nominatim API responses for municipality-level location enrichment. The pipeline needs formalizing.
- `museum-yama-web/mountains.json` is likely a web cache but remains "needs decision" because full regenerability is unproven and it may contain manual curations. It is currently an accumulated provisional list and not the final semantic target.

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
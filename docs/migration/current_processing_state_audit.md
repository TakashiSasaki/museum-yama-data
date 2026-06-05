# Current Processing State Audit

This document inventories and verifies the current execution state of the data-processing steps in this repository.

## DVC Setup Audit
* **Does `.dvc/` exist?**: `False`
* **Does root `dvc.yaml` exist?**: `False`
* **Does root `params.yaml` exist?**: `False`
* **Does root `dvc.lock` exist?**: `False`

*DVC tracking is not yet active. Any DVC pipeline descriptions remain proposed-only.*

---

## Stage-Specific Inventories & Statuses

### 1. GPX Archive Extraction (`extract_gpx_archive`)
* **Status**: `executed_verified`
* **GPX ZIP source file exists?**: Yes, at `data/01_raw/as_received/2026-05-12/GPXファイル.zip` (9,790,030 bytes).
* **Extracted GPX output directory exists?**: Yes, at `data/01_raw/gpx/2026-05-12` (historically extracted to `data/01_raw/gpx/yoshitomi/2026-05-12` and relocated to the simplified layout).
* **Extracted GPX file count**: 293 files (after deduplicating 19 suffix copies).
* **Execution Evidence**: [`yoshitomi_gpx_archive_intake_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/yoshitomi_gpx_archive_intake_report.md)

### 2. Excel Sheet CSV Extraction (`extract_excel_sheets`)
* **Status**: `executed_verified`
* **Excel workbook source file exists?**: Yes, at `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` (77,458 bytes).
* **Extracted CSV output directory exists?**: Yes, at `data/02_intermediate/activity_logs/csv_extracted/2026-05-18` (historically extracted to `data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18` and relocated).
* **CSV files discovered**:
  - `愛媛県の山.csv`
  - `難易度ランクの根拠.csv`
  - `百名山.csv`
  - `PH数の推移.csv`
  - `島根県の山.csv`
* **Execution Evidence**: [`yoshitomi_excel_sheet_extraction_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/yoshitomi_excel_sheet_extraction_report.md)

### 3. Summit Candidate GPX Generation (`generate_summit_candidate_gpx`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-summit-candidate-gpx.js` and registered in `cli.js`.
* **Output directory exists?**: Yes, at `data/08_reporting/gpx/summit_candidates/2026-05-12/`.
* **Output GPX file count**: 293 GPX files.
* **Manifest file exists?**: Yes, at `data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/summit_candidate_gpx_generation_report.md`.
* **Execution Evidence**: [`summit_candidate_gpx_generation_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/summit_candidate_gpx_generation_report.md).

### 4. Summit Candidate Feature Extraction (`extract_summit_candidate_features`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/extract-summit-candidate-features.js` and registered in `cli.js`.
* **Output file exists?**: Yes, at `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`.
* **Manifest file exists?**: Yes, at `data/03_primary/summit_candidates/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/summit_candidate_feature_extraction_report.md`.
* **Execution Evidence**: [`summit_candidate_feature_extraction_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/summit_candidate_feature_extraction_report.md).

### 5. Reverse Geocoding Point Index Extraction (`extract_reverse_geocoding_point_index`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/extract-reverse-geocoding-point-index.js` and registered in `cli.js`.
* **Output file exists?**: Yes, at `data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl`.
* **Manifest file exists?**: Yes, at `data/02_intermediate/reverse_geocoding/extracted/nominatim/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/reverse_geocoding_point_index_report.md`.
* **Execution Evidence**: [`reverse_geocoding_point_index_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/reverse_geocoding_point_index_report.md).

### 6. Summit Candidate Location Evidence Enrichment (`enrich_summit_candidates_with_reverse_geocoding`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/enrich-summit-candidates-with-reverse-geocoding.js` and registered in `cli.js`.
* **Output file exists?**: Yes, at `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl`.
* **Manifest file exists?**: Yes, at `data/04_feature/location_enrichment/summit_candidates/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/summit_candidate_location_evidence_report.md`.
* **Execution Evidence**: [`summit_candidate_location_evidence_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/summit_candidate_location_evidence_report.md).

---


## Action Plan Before Active DVC Initialization
Before running `dvc init` and creating active root configuration pipelines, the following must occur:
1. Finalize directory structures and path mapping agreements.
2. Complete downstream stages (such as geocoding cache enrichment and identity resolution).
3. Validate parameters inside `docs/migration/proposed_params.yaml`.
4. Ensure all pipeline tools accept standard stdin/stdout or parameter-driven inputs.

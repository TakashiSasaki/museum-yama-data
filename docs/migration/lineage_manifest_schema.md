# Lineage Manifest Schema

This document defines how machine-readable `manifest.json` files and human-readable reports record file-level lineage.

---

## 1. GPX Archive Extraction Lineage

Recorded inside [`yoshitomi_gpx_archive_intake_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/yoshitomi_gpx_archive_intake_report.md).

### Metadata Schema
* **status**: Execution status (e.g. `SUCCESS`, `FAIL`).
* **input_zip**: Absolute path to provider raw input ZIP archive.
* **output_dir**: Absolute path to extracted files layout destination.
* **selected_gpx_count**: Count of GPX entries selected for extraction.
* **extracted_gpx_count**: Count of successfully extracted GPX files.
* **ignored_non_gpx_count**: Count of non-GPX entries in archive.
* **ignored_directory_count**: Count of directory paths inside archive.
* **all_or_nothing_status**: Handled atomically without partial extract.
* **extracted_files**: Flat string list of extracted filenames.

---

## 2. Excel Sheet Extraction Lineage

Recorded inside [`yoshitomi_excel_sheet_extraction_report.md`](file:///c:/Users/takas/Desktop/museum-yama-data/docs/migration/yoshitomi_excel_sheet_extraction_report.md).

### Metadata Schema
* **status**: Execution status (e.g. `success`, `failure`).
* **input_workbook**: Path to raw received spreadsheet workbook.
* **output_dir**: Target CSV destination path.
* **sheet_count**: Total sheets detected.
* **extracted_csv_count**: Total CSV files produced.
* **sheet_names_discovered**: List of discovered spreadsheet names.
* **extracted_csv_files**: List of generated CSV filenames.
* **CSV encoding**: Fixed format (e.g., `UTF-8 without BOM`).
* **Line endings**: Fixed line endings format (e.g., `LF (\n)`).
* **all-or-nothing**: Staging-validated directory promotion.

---

## 3. Summit Candidate GPX Generation Lineage

Recorded inside a structured JSON manifest at the output directory root, e.g., `manifest.json`.

### Schema
```json
{
  "stage": "generate_summit_candidate_gpx",
  "stage_version": "0.1.0",
  "git_commit": "<HEAD_COMMIT>",
  "created_at": "<ISO8601_TIMESTAMP>",
  "input_dir": "data/01_raw/gpx/2026-05-12",
  "output_dir": "data/08_reporting/gpx/summit_candidates/2026-05-12",
  "parameters": {
    "smooth_window": 5,
    "peak_radius": 10,
    "min_prominence": 30,
    "merge_distance": 100
  },
  "summary": {
    "input_gpx_count": 0,
    "output_gpx_count": 0,
    "total_summit_candidates": 0,
    "zero_candidate_files": 0,
    "failed_files": 0
  },
  "files": [
    {
      "source_gpx_path": "<path>",
      "source_gpx_sha256": "<sha256>",
      "output_gpx_path": "<path>",
      "output_gpx_sha256": "<sha256>",
      "track_name": "<trk/name>",
      "bounds": {
        "minlat": 0,
        "minlon": 0,
        "maxlat": 0,
        "maxlon": 0
      },
      "trackpoint_count": 0,
      "summit_candidate_count": 0,
      "candidate_ids": []
    }
  ]
}
```

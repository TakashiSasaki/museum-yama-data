# Provider Received Source Intake

This directory (`data/01_raw/provider_received/`) is the minimal intake area for newly received, provider-supplied raw source files.

## Purpose

Files placed here should be original received files, preserved exactly as received. Extracted, converted, cleaned, normalized, or generated outputs do not belong here.

## Accepted Formats

Accepted formats include:
* ZIP archives
* Excel workbooks (XLSX)
* CSV files
* PDFs
* JSON files
* Images
* Other original source packages

## Immutability Rule

Files in this directory must not be modified, processed in-place, or moved to indicate a "processed" state. Processing state should be tracked through manifests, audits, or pipeline metadata (such as DVC/Kedro metadata).

The old workflow `processed/` directory remains a legacy handled-source archive and should not be used for new intake.

Generated outputs (including extractions and conversions) belong under the generated-output policy path, e.g., `artifacts/generated/`.

## Naming and Layout Convention

Provider-specific subdirectories should use stable, ASCII-safe slugs.

Recommended layout:
`data/01_raw/provider_received/<provider_slug>/<received_date>/<original_filename>`

Examples:
* `data/01_raw/provider_received/ehime_mountain_provider/2026-06-02/source_workbook.xlsx`
* `data/01_raw/provider_received/partner_user_2437175/2026-06-02/gpx_export.zip`

### Date Semantics

`<received_date>` means the date the project received the file (in ISO `YYYY-MM-DD` format). It is not necessarily the date represented inside the data itself or the modification time (unless modification time is the only evidence and is documented).

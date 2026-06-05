# KSJ N03 Ehime Reference Data Ingestion Audit

This document inventories and classifies all paths and datasets involved in the ingestion of the Kokudo Chiriin (MLIT) KSJ administrative area reference data for Ehime Prefecture (Prefecture Code 38, reference date 2026-01-01).

## Path Classifications

| Source / Target Description | Repository Path | Classification |
|---|---|---|
| Downloaded ZIP from official source URL | `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/N03-20260101_38_GML.zip` | preserved as raw snapshot |
| Raw ZIP checksum, size, official URL, landing page, reference date, downloaded_at, git_commit | `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json` | derived only |
| ZIP internal files | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/*` | derived only |
| Extracted file list, per-file checksums, per-file sizes, source ZIP checksum, extraction command, extraction time | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json` | derived only |
| Task execution summary | `docs/migration/ksj_n03_ehime_reference_data_ingestion_report.md` | derived only |

## Audit Summary

- **Unmigrated gaps**: none
- **Needs decision items**: none
- **Existing source files modified**: false
- **DVC status**: not active; no DVC command executed
- **Final coordinate generation**: out of scope for this task
- **Municipality adjacency generation**: out of scope for this task

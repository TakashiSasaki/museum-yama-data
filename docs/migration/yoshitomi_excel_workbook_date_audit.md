# Yoshitomi Excel Workbook Date Audit

## Summary
- previous_path: `data/01_raw/provider_received/yoshitomi/1980-01-01/えひめの山.xlsx`
- previous_date_segment: `1980-01-01`
- previous_date_basis: `latest_container_member_timestamp`
- current_date_segment: `2026-05-18`
- current_date_basis: `workbook_metadata_modified`
- action_taken: The raw workbook and intermediate CSV directories have been migrated via `git mv` from `1980-01-01` to `2026-05-18` after confirming mapping correctness. The manifests and reports have been updated to reflect this new date basis.

## Workbook Metadata
- modified date, if present: `2026-05-18T01:24:30Z`
- created date, if present: `2025-01-25T12:32:37Z`
- extraction method used: Shell extraction using `unzip -p` and `grep` directly.
- raw metadata source, e.g. docProps/core.xml or xlsx workbook props: `docProps/core.xml`

## ZIP Member Timestamp Check
- latest ZIP member timestamp: `1980-01-01`
- whether 1980-01-01 appears: Yes, all ZIP member timestamps inside the `.xlsx` archive are `1980-01-01`.
- why ZIP member timestamps are trusted or not trusted for XLSX: XLSX files are ZIP containers. The `1980-01-01` timestamp is a known default ZIP entry timestamp, likely indicating a synthetic ZIP archive creation rather than a meaningful timestamp of the actual data inside. Therefore, ZIP member timestamps inside an XLSX are untrustworthy as date indicators when actual workbook metadata exists.

## Path Impact
- previous source workbook path: `data/01_raw/provider_received/yoshitomi/1980-01-01/えひめの山.xlsx`
- current source workbook path: `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
- previous extracted CSV directory: `data/02_intermediate/activity_logs/csv_extracted/yoshitomi/1980-01-01`
- current extracted CSV directory: `data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18`
- manifest file impact: Renamed `yoshitomi__1980-01-01__manifest.md` to `yoshitomi__2026-05-18__manifest.md` and updated `received_date` and `date_basis`.
- extraction report impact: References updated from `1980-01-01` to `2026-05-18`.
- source-to-target mapping impact: Updated `docs/migration/source_to_target_mapping_audit.md` with the newly assigned path.

## Decision
- resolved / needs_decision: resolved
- rationale: A reliable `dcterms:modified` workbook metadata date (`2026-05-18`) was located in the primary source workbook, replacing the untrustworthy `1980-01-01` ZIP default timestamp. The repository paths and documentation have been updated accordingly to adopt this more accurate date basis.

## Validation
- commands run:
  - `unzip -l data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
  - `unzip -p data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx docProps/core.xml | grep -iE "dcterms"`
  - `node .agents/skills/yama-data-pipeline/cli.js validate-provider-received`
  - `sha256sum data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
- files verified:
  - `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
  - `data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18/*.csv` (5 files)
  - `docs/migration/provider_received_manifests/yoshitomi__2026-05-18__manifest.md`

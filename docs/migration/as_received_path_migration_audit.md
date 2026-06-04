# Path Migration Audit: Simplified "as_received" Layout

## Restructuring Context & Rationale
We are simplifying the repository raw-data layout by migrating from provider-explicit paths (`provider_received/yoshitomi/...`) to a single-source pathing layout (`as_received/...`). Since all raw data is sourced from a single provider (Yoshitomi), encoding provider details in directory structures is unnecessarily verbose. The naming `as_received` accurately indicates that the archives and sheets are immutable source materials preserved exactly as received.

## Path Mappings
The following mappings were applied to physical files and tracked under Git:

### Raw Snapshots (Archives & Workbooks)
- **ZIP GPX Archive**:
  - Old: `data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip`
  - New: `data/01_raw/as_received/2026-05-12/GPXファイル.zip`
- **Excel Workbook**:
  - Old: `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
  - New: `data/01_raw/as_received/2026-05-18/えひめの山.xlsx`

### Extracted GPX files
- **Extracted GPX files directory**:
  - Old: `data/01_raw/gpx/yoshitomi/2026-05-12/*.gpx`
  - New: `data/01_raw/gpx/2026-05-12/*.gpx`
  - File count: 312 GPX files migrated

### Extracted CSV files
- **Extracted CSV files directory**:
  - Old: `data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18/*.csv`
  - New: `data/02_intermediate/activity_logs/csv_extracted/2026-05-18/*.csv`
  - Filenames:
    * `愛媛県の山.csv`
    * `難易度ランクの根拠.csv`
    * `百名山.csv`
    * `PH数の推移.csv`
    * `島根県の山.csv`

## Integrity Validation
- **Modification Check**: Source file contents (ZIP, XLSX, GPX, CSV) were NOT modified in any way.
- **File Counts Check**: Counted and matched exactly before and after renaming.
- **Collision check**: Verified target paths were completely empty before moves occurred.

## Rollback Strategy
If rollback is necessary, run the following Git commands to restore the yoshitomi-explicit structure:
```powershell
# Restore received original files
git mv data/01_raw/as_received/2026-05-12/GPXファイル.zip data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip
git mv data/01_raw/as_received/2026-05-18/えひめの山.xlsx data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx

# Restore extracted GPX tracks
git mv data/01_raw/gpx/2026-05-12/*.gpx data/01_raw/gpx/yoshitomi/2026-05-12/

# Restore extracted CSV sheets
git mv data/02_intermediate/activity_logs/csv_extracted/2026-05-18/*.csv data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18/
```

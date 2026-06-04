# Reverse Geocoding Raw Cache Relocation Audit

## Summary
- **old_path**: `reverse_geocoding/`
- **new_path**: `data/01_raw/reverse_geocoding/`
- **classification**: `preserved_as_raw_snapshot`
- **movement_status**: Ready for physical movement via `git mv`.
- **file_count**: 7
- **unresolved_blockers**: None

## Current Inventory
- **file list**:
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-01-46-058Z.json`
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-22-14-402Z.json`
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-57-27-013Z.json`
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T09-43-14-144Z.json`
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T10-37-52-045Z.json`
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T11-53-20-168Z.json`
  - `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T13-18-23-445Z.json`
- **file count**: 7
- **JSON top-level type summary**: List (Array)
- **representative key paths**: `type`, `source_file`, `source_point`, `reverse_geocoding`, `metadata`

## Classification
- **why these files are raw API response cache files**: The files are direct outputs of reverse geocoding API responses stored by `.agents/skills/reverse-geocode-points/reverse_geocode_points.js`, acting as a local cache.
- **why they belong under data/01_raw/reverse_geocoding/**: They are raw source snapshots.
- **why extracted / derived output directories are not created in this task**: Not part of the raw snapshot relocation scope; future work may place derived structures in `data/03_primary/` or `data/04_feature/`.

## Source-to-Target Mapping
- **source path**: `reverse_geocoding/*.json`
- **target path**: `data/01_raw/reverse_geocoding/*.json`
- **final disposition**: `preserved_as_raw_snapshot`
- **remains Git-tracked**: Yes
- **validation method**: File count comparison, checksum comparison, JSON parse / top-level key inspection, stale reference grep.
- **rollback strategy**: Revert the commit or `git mv` back to `reverse_geocoding/`.

## Movement
- **whether git mv was performed**: Pending (to be performed).
- **files moved**: TBD
- **files skipped, if any**: None

## Validation
- **commands run**: Checked initial state with `find`, `wc -l`, and `sha256sum`.
- **before/after counts**: Initial count is 7.
- **checksum or content preservation method**: Checksum equality check before and after movement.
- **stale reference scan summary**: `grep` check across codebase pending.

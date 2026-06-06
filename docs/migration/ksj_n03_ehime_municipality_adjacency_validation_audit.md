# KSJ N03 Ehime Municipality Adjacency Validation Audit

This document inventories and classifies all paths, fields, and datasets involved in generating the Ehime municipality adjacency reference data from the intermediate MLIT KSJ (国土数値情報) N03 GeoJSON dataset.

## Path Classifications

| Source / Target Description | Repository Path | Classification | Notes |
|---|---|---|---|
| Intermediate GeoJSON Input | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` | derived only | derived only input from Stage 13 extracted reference files; raw snapshot is preserved by the Stage 13 ZIP |
| Adjacency JSON Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` | derived only | Generated reference data file. |
| Pair Validation CSV Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency_pair_validation.csv` | derived only | Generated validation details file. |
| Land Adjacency Edges CSV Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_land_adjacency_edges.csv` | derived only | Generated land-boundary edges file. |
| Stage Manifest Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/manifest.json` | derived only | Stage execution manifest. |
| Stage Validation Report Output | `docs/migration/ksj_n03_ehime_municipality_adjacency_validation_report.md` | derived only | Summary validation report. |

## Field Classifications

| Input Field | Meaning | Classification | Notes |
|---|---|---|---|
| `N03_001` | Prefecture name | derived only | Validation filter for 愛媛県. |
| `N03_002` | Subprefecture / Branch field | intentionally discarded | Preserved only in the intermediate N03 source; not copied to adjacency outputs. |
| `N03_003` | County / District name | intentionally discarded | Preserved only in the intermediate N03 source; not copied to adjacency outputs. |
| `N03_004` | Municipality name | migrated | Used as municipality name in output JSON and CSV files. |
| `N03_007` | Local government code | migrated | Used as municipality code in output JSON and CSV files. |
| `geometry` | Geospatial polygon/multipolygon | derived only | Used to compute land-boundary adjacency. |
| Raw feature record | Complete source feature properties/geometry | preserved as raw snapshot | Only preserved via the intermediate N03 GeoJSON source; not copied wholesale into final adjacency outputs. |

## Audit Summary

- **Unmigrated gaps**: none
- **Needs decision items**: none
- **Existing source files modified**: false
- **DVC status**: not active; no DVC command executed
- **Final coordinate generation**: out of scope for this task
- **Candidate-link filtering**: out of scope for this task
- **Adjacency scope**: This task only creates municipality adjacency reference artifacts

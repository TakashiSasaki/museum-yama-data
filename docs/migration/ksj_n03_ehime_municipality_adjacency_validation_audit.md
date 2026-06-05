# KSJ N03 Ehime Municipality Adjacency Validation Audit

This document inventories and classifies all paths, fields, and datasets involved in generating the Ehime municipality adjacency reference data from the intermediate MLIT KSJ (国土数値情報) N03 GeoJSON dataset.

## Path Classifications

| Source / Target Description | Repository Path | Classification |
|---|---|---|
| Intermediate GeoJSON Input | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` | preserved as raw snapshot |
| Adjacency JSON Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` | derived only |
| Pair Validation CSV Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency_pair_validation.csv` | derived only |
| Land Adjacency Edges CSV Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_land_adjacency_edges.csv` | derived only |
| Stage Manifest Output | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/manifest.json` | derived only |
| Stage Validation Report Output | `docs/migration/ksj_n03_ehime_municipality_adjacency_validation_report.md` | derived only |

## Field Classifications

| Input Field | Meaning | Classification |
|---|---|---|
| `N03_001` | Prefecture name | migrated / validation filter for 愛媛県 |
| `N03_002` | Subprefecture / Branch field | preserved as raw snapshot |
| `N03_003` | County / District name | preserved as raw snapshot |
| `N03_004` | Municipality name | migrated, used as municipality name |
| `N03_007` | Local government code | migrated, used as municipality code |
| `geometry` | Geospatial polygon/multipolygon | derived only, used to compute land-boundary adjacency |
| Raw feature record | Complete source feature properties/geometry | preserved as raw snapshot only through intermediate source |

## Audit Summary

- **Unmigrated gaps**: none
- **Needs decision items**: none
- **Existing source files modified**: false
- **DVC status**: not active; no DVC command executed
- **Final coordinate generation**: out of scope for this task
- **Candidate-link filtering**: out of scope for this task
- **Adjacency scope**: This task only creates municipality adjacency reference artifacts

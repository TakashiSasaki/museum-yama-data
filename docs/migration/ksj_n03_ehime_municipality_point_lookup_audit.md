# KSJ N03 Ehime Municipality Point Lookup Audit

This document inventories and classifies all source fields, input paths, and target outputs involved in the municipality point lookup functionality, which uses KSJ/N03 Ehime administrative-area polygon data to determine the municipality for an arbitrary WGS84 latitude/longitude point.

## Scope

Municipality polygon-based point-in-polygon lookup and lookup validation only.

This audit does **not** cover:
- municipality land-boundary adjacency computation (covered in separate Stage 14 audit)
- reverse-geocoding pipeline or outputs
- mountain summit coordinate acceptance
- candidate-link filtering or resolution

## Input Source

```
data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson
```

This is a derived intermediate file extracted from the Stage 13 raw ZIP snapshot. The raw snapshot is:

```
data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/N03-20260101_38_GML.zip
```

## Path Classifications

| Source / Target Description | Repository Path | Classification | Notes |
|---|---|---|---|
| Intermediate GeoJSON Input | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` | derived only | Derived intermediate file extracted from Stage 13 ZIP; raw snapshot preserved by the Stage 13 ZIP. Used read-only. |
| Raw ZIP Snapshot | `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/N03-20260101_38_GML.zip` | preserved as raw snapshot | Immutable source. Not modified. |
| Point Lookup Library | `.agents/skills/yama-data-pipeline/lib/municipality_point_lookup.js` | derived only | New reusable library implementing point-in-polygon and boundary-distance logic. |
| Single-Point Lookup Command | `.agents/skills/yama-data-pipeline/commands/lookup-ehime-municipality-by-point.js` | derived only | New CLI command wrapper for single-point lookup. |
| Batch Lookup Command | `.agents/skills/yama-data-pipeline/commands/lookup-ehime-municipalities-for-points.js` | derived only | New CLI command wrapper for batch JSONL input lookup. |
| Summit Candidate Batch Output JSONL | `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` | derived only | Batch lookup results for summit candidates. Generated output. |
| Batch Lookup Manifest | `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/manifest.json` | derived only | Stage execution manifest with checksums and summary counts. |
| Batch Lookup Report | `docs/migration/ksj_n03_ehime_summit_candidate_municipality_lookup_report.md` | derived only | Human-readable report for the batch lookup run. |
| Test Module | `.agents/skills/yama-data-pipeline/test/test_municipality_point_lookup.js` | derived only | Unit and integration tests for the new lookup library and commands. |

## Field Classifications

| Input Field | Meaning | Classification | Notes |
|---|---|---|---|
| `N03_001` | Prefecture name | derived only | Validation filter for 愛媛県. Used to ensure input data belongs to Ehime. Not copied to lookup output. |
| `N03_002` | Subprefecture / branch field | intentionally discarded | Preserved only in the intermediate N03 source. Not used or copied to lookup outputs. |
| `N03_003` | County / district name | intentionally discarded | Preserved only in the intermediate N03 source. Not used or copied to lookup outputs. |
| `N03_004` | Municipality name | migrated | Used as the returned municipality name in lookup results. |
| `N03_007` | Local government code | migrated | Used as the returned municipality code in lookup results. |
| `geometry` | Polygon / MultiPolygon geometry | derived only | Used for point-in-polygon containment tests and point-to-boundary distance computation. Geometry coordinates not stored verbatim in lookup outputs. |
| Raw feature record | Complete source feature properties/geometry | preserved as raw snapshot | Preserved only via the intermediate N03 GeoJSON source; not copied wholesale into lookup outputs. |

## Output Field Schema (per lookup record)

The batch lookup output JSONL includes these fields per record:

| Output Field | Source | Notes |
|---|---|---|
| `source_record_id` | input JSONL `id_field` value | Unique identifier from input dataset. |
| `lat` | input JSONL `lat_field` value | As provided in input, not re-derived. |
| `lon` | input JSONL `lon_field` value | As provided in input, not re-derived. |
| `lookup_status` | computed | One of: `single_municipality`, `boundary_ambiguous`, `outside_prefecture`, `invalid_coordinate`. |
| `municipality_matches` | computed from `N03_004`, `N03_007`, geometry | List of matching municipality objects. |
| `boundary_matches` | computed | List when within boundary tolerance. |
| `primary_municipality_code` | computed from `N03_007` | Set only when `lookup_status == single_municipality`. |
| `primary_municipality_name` | computed from `N03_004` | Set only when `lookup_status == single_municipality`. |
| `source_dataset` | hardcoded constant | `ksj_administrative_area_N03` |
| `prefecture` | hardcoded constant | `愛媛県` |
| `prefecture_code` | hardcoded constant | `38` |
| `data_reference_date` | hardcoded constant | `2026-01-01` |
| `boundary_tolerance_m` | CLI parameter | Configurable; default 20 m. |
| `notes` | computed | Diagnostic message when applicable. |

## Audit Summary

- **Unmigrated gaps**: none
- **Needs decision items**: none
- **Existing source files modified**: false
- **Raw ZIP snapshot modified**: false
- **Reverse-geocoding artifacts deleted or modified**: false
- **DVC status**: not active; no DVC command executed
- **Final coordinate generation**: out of scope for this task
- **Candidate-link filtering**: out of scope for this task
- **Scope**: municipality lookup library, CLI commands, batch lookup execution, and lookup validation only

## Policy Statement on Reverse Geocoding

Reverse-geocoding outputs remain preserved as historical and contextual evidence. For future **municipality-level lookup**, KSJ/N03 polygon lookup is preferred because it is authoritative, offline, and reproducible.

Reverse geocoding is still appropriate when street address, place names, roads, facilities, island labels, or other human-readable locality context is required. Do not mark previous reverse-geocoding work as obsolete or wrong. It is retained legacy/contextual evidence.

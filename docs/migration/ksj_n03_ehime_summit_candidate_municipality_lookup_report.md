# KSJ N03 Ehime Summit Candidate Municipality Lookup Report

- **Branch and HEAD commit**: `museum-yama-data` (`3636bc4e287de862b90223ceea728523ccb9909e`)
- **Created at**: `2026-06-05T09:54:50.384Z`
- **Command used**: `lookup-ehime-municipalities-for-points`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Source GeoJSON (N03) | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` |
| Points Input | `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` |
| Input Format | `jsonl` |

## Parameters

| Parameter | Value |
|---|---|
| Boundary tolerance | `20 m` |
| ID field | `summit_candidate_id` |
| Lat field | `lat` |
| Lon field | `lon` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Municipality Lookup JSONL | `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` |
| Stage Manifest | `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/manifest.json` |
| Stage Report | `docs/migration/ksj_n03_ehime_summit_candidate_municipality_lookup_report.md` |

## Summary Metrics

| Metric | Count |
|---|---|
| Input point records | `496` |
| Single municipality | `362` |
| Boundary ambiguous | `122` |
| Outside prefecture | `12` |
| Invalid coordinate | `0` |

## Policy Statement on Reverse Geocoding

Reverse-geocoding outputs remain preserved as historical and contextual evidence.
For **municipality-level lookup**, KSJ/N03 polygon lookup is preferred because it is authoritative, offline, and fully reproducible.
Reverse geocoding remains appropriate when street address, place names, roads, facilities, island labels, or other human-readable locality context is required.

## Source Modification Status

- **Source files modified**: `false` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Reverse geocoding artifacts deleted or modified**: `false`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

## Algorithm Notes

- Point-in-polygon: ray-casting algorithm.
- Point-to-boundary distance: local planar approximation (< 0.1% error at ~33°N for single-municipality scales).
- Boundary tolerance: 20 m. Points within this distance of a polygon boundary are classified as `boundary_ambiguous`.

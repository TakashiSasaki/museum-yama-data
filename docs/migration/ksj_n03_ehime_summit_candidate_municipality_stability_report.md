# KSJ N03 Ehime Summit Candidate Municipality Stability Report

- **Branch and HEAD commit**: `museum-yama-data` (`1c0355f58259a8ece52390ef0de757dd5fd7aa02`)
- **Created at**: `2026-06-05T10:45:01.295Z`
- **Command used**: `classify-summit-candidate-municipality-stability`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Source GeoJSON (N03) | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` |
| Summit Candidates | `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` |
| Point Lookup (Stage 15) | `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` |

## Parameters

| Parameter | Value |
|---|---|
| Offset distance | `1000 m` |
| Boundary tolerance | `20 m` |
| Stable interior threshold | `1000 m` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Stability Classification JSONL | `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl` |
| Stage Manifest | `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/manifest.json` |
| Stage Report | `docs/migration/ksj_n03_ehime_summit_candidate_municipality_stability_report.md` |

## Summary Metrics

| Metric | Count |
|---|---|
| Input candidate records | `496` |
| Stable interior (`stable_interior`) | `204` |
| Stable cardinal same (`stable_cardinal_1km_same`) | `20` |
| Near boundary (`near_boundary`) | `138` |
| Offset inconsistent (`offset_inconsistent`) | `0` |
| Boundary ambiguous (`boundary_ambiguous`) | `122` |
| Outside prefecture (`outside_prefecture`) | `12` |
| Invalid coordinate (`invalid_coordinate`) | `0` |
| All cardinal 1km same | `224` |
| Distance stable interior | `204` |

## Interpretation Policy

1. **stable_interior**: Center lookup is single municipality, distance to boundary is >= 1000m, and all four 1km cardinal offset points map to the same municipality.
2. **stable_cardinal_1km_same**: Center lookup is single municipality, and all four 1km cardinal offset points map to the same municipality, but center distance to boundary is below 1000m.
3. **near_boundary**: Center lookup is single municipality, center distance to boundary is below 1000m, and at least one offset point maps to a different municipality.
4. **offset_inconsistent**: Center lookup is single municipality, distance to boundary is >= 1000m, but at least one offset point maps to a different municipality due to complex boundary shape.
5. **boundary_ambiguous**: Center lookup is within boundary tolerance (20m) of multiple municipalities.
6. **outside_prefecture**: Center lookup is outside Ehime Prefecture boundaries.
7. **invalid_coordinate**: Coordinates fail range validation.

## Limitations & Geometry Edge Cases

- Offset points are calculated using a local planar approximation:
  - Latitude offset: `offset_m / 111320`
  - Longitude offset: `offset_m / (111320 * cos(lat))`
- This is accurate within Ehime Prefecture, introducing <0.1% distortion.
- If a summit candidate lies on a narrow peninsula or boundary ridge, it is correctly flagged as `near_boundary` or `offset_inconsistent`.

## Source Modification Status

- **Source files modified**: `false` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Reverse geocoding artifacts deleted or modified**: `false`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

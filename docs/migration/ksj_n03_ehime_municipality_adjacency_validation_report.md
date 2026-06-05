# KSJ N03 Ehime Municipality Adjacency Validation Report

- **Branch and HEAD commit checked**: `museum-yama-data` (`0ec38c8a5009a6f7ed2974bd68a377916338dc50`)
- **Created at**: `2026-06-05T08:32:28.200Z`
- **Command used**: `generate-ehime-municipality-adjacency`

## Dataset Identity & Input Paths

| Input Type | Repository Path |
|---|---|
| Source GeoJSON (`N03`) | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` |
| Ingestion Raw Manifest | `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json` |
| Ingestion Extracted Manifest | `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json` |

- **Geospatial Source**: MLIT KSJ (国土数値情報) administrative area reference data
- **Prefecture**: 愛媛県 (Prefecture code `38`)
- **Data Reference Date**: `2026-01-01`

## Output Paths

| Output Type | Repository Path |
|---|---|
| Adjacency JSON | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` |
| Adjacency Pair Validation CSV | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency_pair_validation.csv` |
| Land Adjacency Edges CSV | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_land_adjacency_edges.csv` |
| Stage Manifest | `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/manifest.json` |
| Stage Report | `docs/migration/ksj_n03_ehime_municipality_adjacency_validation_report.md` |

## Summary Metrics

| Metric | Count |
|---|---|
| Municipality count | `20` |
| Pair count | `190` |
| Confirmed land-boundary pairs | `33` |
| Point-contact-only pairs | `0` |
| Not-adjacent pairs | `157` |

## Validated Adjacency Table

This table lists the computed land adjacency for all 20 municipalities in Ehime Prefecture:

| Municipality | Land-Adjacent Municipalities |
|---|---|
| **松山市** | `今治市`, `東温市`, `久万高原町`, `松前町`, `砥部町` |
| **今治市** | `松山市`, `西条市`, `東温市` |
| **宇和島市** | `西予市`, `松野町`, `鬼北町`, `愛南町` |
| **八幡浜市** | `大洲市`, `西予市`, `伊方町` |
| **新居浜市** | `西条市`, `四国中央市` |
| **西条市** | `今治市`, `新居浜市`, `東温市`, `久万高原町` |
| **大洲市** | `八幡浜市`, `伊予市`, `西予市`, `内子町` |
| **伊予市** | `大洲市`, `松前町`, `砥部町`, `内子町` |
| **四国中央市** | `新居浜市` |
| **西予市** | `宇和島市`, `八幡浜市`, `大洲市`, `久万高原町`, `内子町`, `鬼北町` |
| **東温市** | `松山市`, `今治市`, `西条市`, `久万高原町` |
| **上島町** | *none (island)* |
| **久万高原町** | `松山市`, `西条市`, `西予市`, `東温市`, `砥部町`, `内子町` |
| **松前町** | `松山市`, `伊予市`, `砥部町` |
| **砥部町** | `松山市`, `伊予市`, `久万高原町`, `松前町`, `内子町` |
| **内子町** | `大洲市`, `伊予市`, `西予市`, `久万高原町`, `砥部町` |
| **伊方町** | `八幡浜市` |
| **松野町** | `宇和島市`, `鬼北町` |
| **鬼北町** | `宇和島市`, `西予市`, `松野町` |
| **愛南町** | `宇和島市` |

### Special Cases & Island Handling
- **上島町 (Kamijima Town)**: Has no land-boundary adjacency within Ehime prefecture (`0` adjacencies). This is completely correct as Kamijima consists entirely of islands separated by the Seto Inland Sea.
- **松山市 — 大洲市 (Matsuyama City & Ozu City)**: Correctly computed as **not land-adjacent** (no shared land boundary in the KSJ geometries), separated by Iyo City and Uchiko Town.

### Sea & Bridge Separated Relationships
- Sea-only borders or bridges (e.g. Kurushima-Kaikyo Bridges connecting Imabari City to the islands) are not counted as land adjacency. The algorithm strictly requires adjacent polygon borders to share a physical boundary segment of positive length.

## Adjacency Usage In Downstream Processing
- This reference dataset is generated to serve as an authoritative spatial look-up.
- It will be used in later pipeline stages to classify whether a mountaineering activity's geocoded trackpoints are spatially plausible or incompatible with the mountain source's recorded municipality (e.g., `boundary_plausible` vs. `municipality_incompatible`).
- This stage computes spatial evidence only and does not automatically reject any data.

## Validation Commands Run
- Run test suite:
  ```sh
  npm test
  ```
- Validated output format and data integrity check scripts:
  ```sh
  node C:\Users\takas\.gemini\antigravity-ide\brain\bf9e27a6-9d5c-4faa-8fe5-be0d8bfbb701\scratch\validate_ksj_data.js
  ```

## Source Modification Status
- **Source files modified**: `false` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified).
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

## Known Limitations
- The adjacency is calculated purely from administrative land boundaries. It does not reflect administrative maritime boundaries.
- Boundary vertices are matched at a 7-decimal place floating point precision (~1.1 cm). Points that match below this threshold but are topologically separate are not considered adjacent.

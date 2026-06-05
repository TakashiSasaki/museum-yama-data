# KSJ N03 Ehime Reference Data Ingestion Report

- **Branch and HEAD commit checked**: `museum-yama-data` (`712ee87b338393cb28e655df968fc98d9f905ab0`)
- **Official source URL**: `https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026/N03-20260101_38_GML.zip`
- **Source landing page**: `https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html`
- **Dataset identity**: KSJ / 国土数値情報 行政区域データ (`N03`) Ehime Prefecture (Code `38`)
- **Data reference date**: `2026-01-01`
- **Raw ZIP output path**: `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/N03-20260101_38_GML.zip`
- **Extracted output path**: `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML`
- **Raw ZIP Manifest path**: `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json`
- **Extracted Manifest path**: `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json`

## File Validation Details

- **Raw ZIP Size**: `12542884` bytes
- **Raw ZIP SHA-256**: `88061f7ae784bbdd7b81f514ea904dcef853645b6d477691c1ba31091ab41dbf`
- **Extracted File Count**: `8`

### Extracted File Inventory

| Extracted File Path | Size (Bytes) | SHA-256 Checksum |
|---|---|---|
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/KS-META-N03-20260101_38.xml` | `15053` | `a0ece2962015e6b8917aa5940296c54a187c4fde9e763f6f6def8a85cc18883c` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.cpg` | `5` | `3ad3031f5503a4404af825262ee8232cc04d4ea6683d42c5dd0a2f2a27ac9824` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.dbf` | `888934` | `11df37be50889908985b38d4eff9aaf69cc454f65d320f84844b84501e711364` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` | `16841979` | `16e3af28d9af3a864922869826cec6bfe55adc11d51a81fbc2a12000555adc11` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.prj` | `145` | `1761bb7f37f73fd0eb043175a78403ba37ff1066299987c116fd43bbd0057eae` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.shp` | `7486996` | `29d0bd728caa6d22de0f47835adc4b250f7f64e0603610f0d6409dd552031fea` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.shx` | `38324` | `56569350de79ec57f035feb08920794e346894e699acb815f91d815e90d1cf0d` |
| `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.xml` | `17653334` | `1dc79337a4114d3abec3900c3965eb85e3bfc785b3492e426b0312d34cb38bef` |

### Commands Used / Execution Method
- Executed via custom portable Node.js ingestion and validation script: `scratch/ingest_ksj_data.js` using `adm-zip`.

### Validation Checks Run
1. Checked for existing path collisions.
2. Parsed ZIP directory listing and checked for malicious paths (path traversal `..` or absolute paths).
3. Verified extraction checksums and sizes.
4. Confirmed that no file exceeds the 95MB GitHub file size limit (largest file size: `17653334` bytes).
5. Ran verification matching the manifest counts and existence.

## Policy Affirmations
- **Source files modified**: `false` (No existing raw GPX, YAMAP Markdown, reverse-geocoding cache, mountain source JSON, summit candidate JSONL, candidate links, review queues, or decision templates were modified).
- **DVC status**: not active; no DVC commands were run.
- **Git LFS**: not used; all ingested files are small and directly tracked.
- **Adjacency / coordinates**: Municipality adjacency generation and final coordinate resolution are completely out of scope.

## Next Recommended Step
- Generate and validate municipality adjacency as a separate derived reference stage using the intermediate files under `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML`.

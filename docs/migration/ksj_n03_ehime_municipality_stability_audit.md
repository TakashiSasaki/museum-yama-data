# KSJ N03 Ehime Municipality Stability and Refinement Audit

This document audits the source-to-target mapping, classifications, and provenance policies for the new municipality stability classification stage, location-stability refinement stage, and the compact review queue generation.

## Provenance and Ingestion Classifications

All inputs and output fields for these new stages (Stage 16, 17, and 18) are classified below.

### 1. Ingestion / Source Data Fields (Inputs)

| Field/Path | Primary Role | Ingestion Classification | Notes |
|---|---|---|---|
| `summit_candidate_id` in `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` | Summit candidate ID | `preserved as raw snapshot` | Immutable primary key for summit candidates. |
| `lat` / `lon` in `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl` | Summit candidate coordinate | `preserved as raw snapshot` | Input coordinates for stability spatial lookup. |
| `lookup_status` in `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` | Center point lookup status | `preserved as raw snapshot` | Primary lookup result at center. |
| `municipality_matches` in `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl` | Center point matches and distance | `preserved as raw snapshot` | Containment and distance-to-boundary metrics at center. |
| Geometry in `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson` | MLIT administrative area polygons | `preserved as raw snapshot` | Geospatial boundaries used for ray-casting point-in-polygon and distance checks. |
| Adjacency map in `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json` | Topographic land adjacency | `preserved as raw snapshot` | Set of adjacent municipalities in Ehime. |
| `municipality` in `data/03_primary/mountains/ehime_mountain_source_rows.json` | Mountain source municipality name | `preserved as raw snapshot` | Expected location of the mountain from source. |
| `mountain_no` in `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl` | Mountain reference key | `preserved as raw snapshot` | Links to mountain row. |
| `summit_candidate_id` in `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl` | Summit candidate key | `preserved as raw snapshot` | Links to summit candidate row. |
| `score` / `rank` / `review` fields in `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl` | Broad candidate link scores | `preserved as raw snapshot` | Input features for confidence and ranking before refinement. |

### 2. New Stability Classification Fields (Stage 16 Outputs)

| Field/Path | Primary Role | Classificaton | Notes |
|---|---|---|---|
| `summit_candidate_id` | Ref key | `migrated` | Preserved from input. |
| `lat` / `lon` | Coordinates | `migrated` | Preserved from input. |
| `center_lookup_status` | Status | `derived only` | Re-verified from point lookup. |
| `center_municipality_code` / `name` | Code / name | `derived only` | Re-verified from point lookup. |
| `center_distance_to_boundary_m` | Distance | `derived only` | Re-verified from point lookup. |
| `offset_m` | Offset parameter | `derived only` | Set to 1000m. |
| `boundary_tolerance_m` | Tolerance parameter | `derived only` | Set to 20m. |
| `stable_interior_threshold_m` | Threshold parameter | `derived only` | Set to 1000m. |
| `north_lookup` / `south_lookup` / `east_lookup` / `west_lookup` | Offset lookup status & details | `derived only` | Result of 1km cardinal offset looks (lat, lon, lookup_status, code, name, matches). |
| `all_cardinal_1km_same` | Boolean flag | `derived only` | True if all 4 offsets return same single municipality. |
| `distance_stable_interior` | Boolean flag | `derived only` | True if center distance to boundary >= 1000m. |
| `municipality_stability` | Final stability category | `derived only` | Category from evaluation rules. |
| `municipality_stability_reason_codes` | Diagnostic reason codes | `derived only` | Reason code array explaining classification decision. |
| `source_dataset` / `prefecture` / `prefecture_code` / `data_reference_date` | Metadata | `derived only` | KSJ references. |

### 3. New Refined candidate link Fields (Stage 17 Outputs)

| Field/Path | Primary Role | Classification | Notes |
|---|---|---|---|
| `location_stability_refinement` | Refinement flag | `derived only` | True to denote refinement was run. |
| `evidence.location_stability` | Nested evidence block | `derived only` | Contains source municipality, candidate municipality, stability classification, flags, distance, relation, bucket, adjustments, and reason codes. |
| `location_stability_bucket` | Stability categorisation bucket | `derived only` | Determined from refinement rules. |
| `location_stability_review_priority` | Re-ranked review priority | `derived only` | Re-calculated review priority. |
| `location_stability_reason_codes` | Refinement reasons | `derived only` | Diagnostic code array. |

### 4. New Compact Review Queue Fields (Stage 18 Outputs)

| Field/Path | Primary Role | Classification | Notes |
|---|---|---|---|
| `location_stability_review_priority` | Queue sorting column | `derived only` | Used to sort/filter review queues. |
| `location_stability_bucket` | Queue category column | `derived only` | Used to explain location stability status. |
| `municipality_relation` | Adjacency category | `derived only` | Denotes distance relation between mountain and candidate. |

---

## Status and Verification Declarations

* **Unmigrated gaps**: none
* **Needs decision items**: none
* **Existing source files modified**: false (No raw GPX, YAMAP Markdown, Nominatim caches, or primary mountains/summit candidates databases are modified).
* **Reverse-geocoding artifacts deleted or modified**: false (Nominatim outputs, geocoding point indexes, and location evidence files remain fully preserved).
* **DVC status**: not active; no DVC command executed.
* **Final coordinate generation**: out of scope (This stage refines and re-prioritises candidates for human review queues; it does not set final accepted summit coordinates or create final resolved links).
* **Existing Nominatim-based Stage 10 outputs**: preserved as legacy/contextual refinement.
* **Scope**: stability classification, location-stability refinement, and new review queue generation only.

# Grounding-Assisted Reprocessing — Source-to-Target Field Mapping Audit

This document classifies every source field used in the grounding-assisted reprocessing pipeline.

## Classification Legend

| Classification | Meaning |
|---|---|
| `migrated` | Field is directly used as a primary input in the new pipeline |
| `partially migrated` | Field is used but only under certain conditions |
| `derived only` | Field is computed from other fields, not carried forward directly |
| `preserved as legacy reference` | Field exists in old outputs; new pipeline does not rewrite it |
| `preserved as raw snapshot` | Raw field preserved in immutable source files |
| `intentionally discarded` | Field is explicitly not used and documented as unused |

---

## Source 1: `data/03_primary/mountains/ehime_mountain_source_rows.json`

Record count: 531. Primary key: `mountain_no`.

| Field | Classification | Notes |
|---|---|---|
| `mountain_no` | `migrated` | Primary key for all mountain references |
| `csv_no` | `preserved as legacy reference` | Historical CSV row identifier |
| `source_row_no` | `migrated` | Carried into candidate link records |
| `mountain_no_source` | `preserved as legacy reference` | Provenance of mountain_no assignment |
| `mountain_no_status` | `preserved as legacy reference` | Provenance status |
| `name` | `migrated` | Mountain name used for name matching against grounding and candidates |
| `location.municipality_or_island` | `migrated` | Used for municipality matching |
| `location.municipality` | `migrated` | Used for municipality matching against grounding municipality |
| `location.island` | `partially migrated` | Used only when municipality is null |
| `coordinates.lat` | `migrated` | CSV coordinate evidence (often null) |
| `coordinates.lon` | `migrated` | CSV coordinate evidence (often null) |
| `coordinates.source` | `preserved as legacy reference` | Coordinate provenance |
| `coordinates.raw` | `preserved as raw snapshot` | Original GPS string from CSV |
| `elevation_m` | `migrated` | Used for elevation difference scoring |
| `difficulty_rank` | `intentionally discarded` | Not used in candidate linking |
| `entry_course_recommended` | `intentionally discarded` | Not used in candidate linking |
| `yamap_url` | `preserved as legacy reference` | Reference only |

---

## Source 2: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`

Record count: 496. Primary key: `summit_candidate_id`.

| Field | Classification | Notes |
|---|---|---|
| `summit_candidate_id` | `migrated` | Primary key for all candidate references |
| `candidate_status` | `preserved as legacy reference` | Always "unresolved" |
| `source_gpx_path` | `migrated` | Carried into candidate link records |
| `source_gpx_sha256` | `preserved as raw snapshot` | Input integrity hash |
| `source_gpx_basename` | `migrated` | Used for activity link lookup |
| `summit_candidate_gpx_path` | `migrated` | Carried into candidate link records |
| `summit_candidate_gpx_sha256` | `preserved as raw snapshot` | Output integrity hash |
| `summit_candidate_gpx_basename` | `preserved as legacy reference` | Not directly used in linking |
| `track_name` | `migrated` | Used for name evidence computation |
| `candidate_index_in_gpx` | `preserved as legacy reference` | Ordering provenance |
| `lat` | `migrated` | Candidate latitude for distance computation |
| `lon` | `migrated` | Candidate longitude for distance computation |
| `ele_m` | `migrated` | Candidate elevation for elevation difference |
| `waypoint_name` | `preserved as legacy reference` | GPX waypoint metadata |
| `waypoint_desc` | `preserved as legacy reference` | GPX waypoint metadata |
| `detection_stage` | `preserved as legacy reference` | Algorithm provenance |
| `detection_parameters` | `preserved as legacy reference` | Algorithm parameters |
| `manifest_trackpoint_count` | `preserved as legacy reference` | Track statistics |
| `manifest_bounds` | `preserved as legacy reference` | Track bounds |
| `source_manifest_record_index` | `preserved as legacy reference` | Index provenance |

---

## Source 3: `data/01_raw/mountain_geographic_grounding/external_agent/2026-06-06/gemini_grounding_responses_raw.json`

Record count: 387. Key: `mountain_no` (not unique — 337 unique values, 50 duplicates).

| Field | Classification | Notes |
|---|---|---|
| `_source_document` | `preserved as raw snapshot` | Provenance: which Gemini document produced this record |
| `_source_document_safe_name` | `preserved as raw snapshot` | Safe filename for provenance |
| `_json_block_index` | `preserved as raw snapshot` | Structural provenance within document |
| `_json_record_path` | `preserved as raw snapshot` | JSON path provenance |
| `_lat_lon_status` | `migrated` | Used to determine if coordinates are usable ("numeric" vs "null") |
| `mountain_no` | `migrated` | Join key to mountain source |
| `mountain_name` | `migrated` | Used for name match validation against source mountain |
| `grounding_status` | `migrated` | "grounded_verified" or "insufficient_evidence" |
| `grounded_lat` | `migrated` | Grounding coordinate latitude (null for 4 records) |
| `grounded_lon` | `migrated` | Grounding coordinate longitude (null for 4 records) |
| `grounded_elevation_m` | `migrated` | Grounding elevation (null for 4 records) |
| `grounded_municipality` | `migrated` | Used for municipality match validation |
| `confidence_score` | `migrated` | Gemini self-reported confidence |
| `explanation` | `preserved as raw snapshot` | Natural language explanation, not parsed |
| `evidence_links` | `migrated` | External evidence URLs preserved in reference index |
| `_coordinate_pair_in_text` | `preserved as raw snapshot` | Text extraction provenance |
| `_lat_lon_explicit_status` | `preserved as raw snapshot` | Extraction method provenance |

---

## Source 4: `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl` (fallback evidence)

Used only for fallback candidates without grounding. Classification: `partially migrated`.

Key fields used: `summit_candidate_id`, `location_candidates[]` (for municipality matching in fallback path).

---

## Source 5: `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl` (fallback evidence)

Used only for fallback candidates without grounding. Classification: `partially migrated`.

Key fields used: `source_gpx_basename`, `best_candidate`, `title_enriched_candidate_activities`, `enriched_confidence`, `combined_activity_link_score`.

---

## Audit Confirmation

- No field is classified as `needs decision`
- No field is classified as `unmigrated gap`
- All source fields are explicitly classified
- Source files are immutable and will not be modified

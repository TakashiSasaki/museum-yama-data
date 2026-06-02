# Target Data Model

This document outlines the high-level target data model for the future DVC and Kedro pipeline in the Yama Museum repository. It describes intended logical datasets rather than physical implementation files.

*Note: No physical directories or data files for this model have been created yet.*

## Dataset Overview

The datasets are structured across typical data engineering layers (`01_raw`, `02_intermediate`, `03_primary`, `04_feature`, `08_reporting`).

### 1. `raw_gpx_activities`
* **Role:** Immutable archive of original `.zip` or `.gpx` files exported from GPS devices or YAMAP.
* **Primary Inputs:** Raw user uploads.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC dependency candidate

### 2. `raw_activity_workbook`
* **Role:** The immutable original Excel workbook containing activity logs (`えひめの山.xlsx`).
* **Primary Inputs:** Manual user curation and tracking.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC dependency candidate

### 3. `excel_derived_activity_csv`
* **Role:** Extracted representations of the Excel workbook logs, used for intermediate tabular processing.
* **Primary Inputs:** `raw_activity_workbook`
* **Expected Future Layer:** `02_intermediate`
* **Tracking System:** DVC dependency candidate
* **Status Notes:** Historically existed as the `csv/` legacy directory; generation script needs restoration.

### 4. `raw_yamap_activity_metadata`
* **Role:** Original Markdown activity records scraped/fetched from YAMAP.
* **Primary Inputs:** `fetch-yamap-data` browser subagent outputs.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC dependency candidate

### 5. `raw_reverse_geocoding_cache`
* **Role:** Raw JSON responses from the Nominatim OpenStreetMap API.
* **Primary Inputs:** Coordinates fed into the reverse geocoding script.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC dependency candidate

### 6. `curated_mountain_research_docs`
* **Role:** Human-curated research and reference notes (e.g., same-name mountain disambiguation) providing evidence for identity resolution.
* **Primary Inputs:** Human research and agent-assisted survey drafts.
* **Expected Future Layer:** Maintained in `docs/` (Git-tracked), mapped as conceptual inputs to `04_feature` logic.
* **Tracking System:** Git

### 7. `gpx_tracks` & `gpx_trackpoints`
* **Role:** Normalized track and individual coordinate-level datasets representing the paths traveled.
* **Primary Inputs:** `raw_gpx_activities`
* **Expected Future Layer:** `02_intermediate` or `03_primary`
* **Tracking System:** DVC dependency candidate

### 8. `summit_candidates`
* **Role:** Geolocation points representing algorithmic detections of potential summits. These are strictly unverified, unresolved candidate points produced purely from GPX evidence (elevation profiles, track traces) before identity resolution, and do not have mountain identities. Missing YAMAP metadata must not block the detection of summit candidates.
* **Primary Inputs:** `gpx_tracks` / `gpx_trackpoints`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC dependency candidate

### 9. `summit_candidate_gpx`
* **Role:** Exported representation of summit candidates for review or basic map overlays.
* **Primary Inputs:** `summit_candidates`
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** DVC-tracked output (or dynamically generated)

### 10. `location_enrichment`
* **Role:** Municipality evidence mapping coordinates to administrative levels up to city/county/town/village only. Does not include detailed granular address components (e.g., district, aza, block number). Preserves multiple municipality candidates when ambiguity exists.
* **Primary Inputs:** `raw_reverse_geocoding_cache`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC dependency candidate

### 10b. `summit_candidate_municipality_candidates` (Optional/Suggested)
* **Role:** Tabular representation of municipality candidates for summit candidates, preserving ambiguity where multiple municipalities could overlap the candidate coordinate.
* **Primary Inputs:** `location_enrichment`, `summit_candidates`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC dependency candidate
* **Suggested Fields:** `summit_candidate_id`, `prefecture_name`, `county_name` (when needed for disambiguation), `city_town_village_name`, `municipality_display_name` (e.g., "越智郡上島町"), `rank`, `confidence`, `evidence_source`, `reverse_geocoding_record_id`, `boundary_ambiguity`, `needs_review`, `notes`.

### 11. `mountain_identity_evidence`
* **Role:** The consolidated structured dataset recording the exact reasons, documents, and coordinates used to assign an identity to a mountain peak.
* **Primary Inputs:** `curated_mountain_research_docs`, `location_enrichment`, `raw_activity_workbook`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC dependency candidate

### 12. `summit_identity_candidates`
* **Role:** The relational cross-referencing of `summit_candidates` against `mountain_identity_evidence` to attempt to resolve an identity.
* **Primary Inputs:** `summit_candidates`, `mountain_identity_evidence`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC dependency candidate

### 13. `mountains`
* **Role:** The authoritative structured table of resolved mountain identities with canonical names and disambiguation metadata.
* **Primary Inputs:** `summit_identity_candidates`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC dependency candidate
* **Primary Key:** `mountain_no` (authoritative integer sourced from the CSV `No` column, currently expected to cover `1..501`).
* **Important Note:** Unresolved candidates and resolved mountains are distinct entities. The existing `museum-yama-web/mountains.json` is a provisional legacy web cache and does not serve as this final semantic model.
* **Cardinality Expectation:** In the current reference state, the expected authoritative resolved mountain count is exactly 501. (30 blank-"No" records from the CSV source are explicitly excluded from this authoritative set and must not be included).

### 14. `resolved_mountain_waypoint_gpx`
* **Role:** A collection of identified mountain waypoints formatted as a GPX/XML file, embedding evidence references in its extensions. This is the first concrete target export.
* **Primary Inputs:** `mountains`, `mountain_identity_evidence`
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** DVC-tracked output (or dynamically generated)

### 15. `activity_mountain_links`
* **Role:** A junction dataset mapping specific activities (e.g., YAMAP activity IDs) to the resolved mountain IDs traversed during that activity.
* **Primary Inputs:** `raw_yamap_activity_metadata`, `mountains`, `gpx_tracks`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC dependency candidate

### 16. `web_data_exports`
* **Role:** JSON artifacts specifically optimized for rendering on the front-end web application. (Replacing the legacy `museum-yama-web/mountains.json` cache.)
* **Primary Inputs:** `resolved_mountain_waypoint_gpx`, `activity_mountain_links`
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** Git or dynamically generated
* **Schema Reference:** Will likely use the legacy schema/record shape from `mountains-merged.json`, but the canonical future filename is undecided.
* **Cardinality Expectation:** The future resolved mountain JSON web export should strictly preserve the 501 top-level mountain record count unless a discrepancy is explicitly explained.

### 17. `validation_reports`
* **Role:** Automated checks confirming the integrity of the data layers (e.g., no orphaned candidates coerced to identities without evidence, duplicate mountain names, unlinked GPX files).
* **Primary Inputs:** Outputs across pipeline layers.
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** Git or DVC-tracked output
* **Integrity Validation:** Validation reports should actively verify key constraints and the 501 invariant. Specifically, checks should ensure:
  - total authoritative record count is exactly 501
  - all records contain a `mountain_no`
  - all `mountain_no` values are unique and cover the expected `1..501` range
  - no blank-"No" records are erroneously included
  - same-name records are not improperly merged solely by name
* **Cardinality Reporting:** Report discrepancy categories (e.g., `missing_source_row`, `duplicate_or_merged_record`, `excluded_from_authoritative_source`) and explicitly report the excluded blank-"No" record count separately.

### 18. `provenance_entities`, `provenance_activities`, `provenance_edges`
* **Role:** Tabular representation of the data lineage, entities, processes, and their relationships.
* **Primary Inputs:** Pipeline metadata, execution logs, `mountain_identity_evidence`.
* **Expected Future Layer:** `04_feature` (conceptual paths: `data/04_feature/provenance/*`)
* **Tracking System:** DVC dependency candidate
* **Note:** Future datasets, not yet implemented.

### 19. `lineage_graph_exports`
* **Role:** Graph format exports of the provenance data for visualization.
* **Primary Inputs:** `provenance_entities`, `provenance_activities`, `provenance_edges`
* **Expected Future Layer:** `08_reporting` (conceptual paths: `data/08_reporting/provenance/lineage.*`)
* **Tracking System:** DVC dependency candidate
* **Note:** Future datasets, not yet implemented.

### 20. `gpx_yamap_activity_links`
* **Role:** A dataset capturing matched candidate links between raw GPX track files and YAMAP activity Markdown records based on metadata evidence.
* **Primary Inputs:** `raw_gpx_activities`, `raw_yamap_activity_metadata`
* **Expected Future Layer:** `02_intermediate`
* **Tracking System:** DVC dependency candidate

## Summary of Core Principles

1. **`mountains.json` Status:** It is a provisional legacy/web cache. It is not the final semantic model.
2. **First Export Target:** The first concrete data export target is `resolved_mountain_waypoint_gpx`.
3. **Provenance Management:** Detailed provenance logs will live in structured datasets like `mountain_identity_evidence`. The GPX extensions will only contain summary links to this deep data.
4. **Entity Separation:** `summit_candidates` (unresolved points) and `mountains` (resolved identities) are fundamentally different entities and are managed separately.

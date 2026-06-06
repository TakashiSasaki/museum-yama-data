# Target Data Model

This document outlines the high-level target data model for the future DVC and Kedro pipeline in the Yama Museum repository. It describes intended logical datasets rather than physical implementation files.

*Note: This document represents a logical target model. Several physical datasets now exist as Git-tracked pipeline outputs in `data/02_intermediate`, `data/03_primary`, `data/04_feature`, and `data/08_reporting`. However, some future semantic outputs, such as final resolved summit coordinates, still do not exist.*

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
* **Role:** Extracted representations of the Excel workbook logs, used for intermediate tabular processing. This is an extracted intermediate CSV, and blank `No` values may still exist. It is not used directly for final targets; it is processed into `accepted_mountain_source_rows`.
* **Primary Inputs:** `raw_activity_workbook`
* **Expected Future Layer:** `02_intermediate`
* **Tracking System:** DVC dependency candidate
* **Status Notes:** Historically existed as the `csv/` legacy directory; generation script needs restoration.

### 3b. `accepted_mountain_source_rows`
* **Role:** The normalized and accepted primary dataset for mountain source rows. Existing non-empty source `No` values must be contiguous from 1. Blank `No` values from the intermediate CSV are filled sequentially starting from `max_existing_no + 1` to ensure every row has a non-null, unique effective `mountain_no`. Downstream resolved mountain records consume this dataset, not the raw extracted CSV directly.
* **Primary Inputs:** `excel_derived_activity_csv`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC dependency candidate
* **Status Notes:** This is the strictly validated output of the mountain source acceptance and normalization stage. All coordinates from the `GPS` column are preserved as coordinate evidence.

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
* **Primary Inputs:** `summit_identity_candidates`, `mountain_summit_coordinates`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC dependency candidate
* **Primary Key:** `mountain_no`. This is a unified effective key after acceptance/normalization. Existing non-empty source `No` values must be contiguous from `1` (currently `1..501`). Blank source `No` rows are filled sequentially after `max_existing_no` (currently resulting in `502..531`). The final expected key set is `1..531`. `source_row_no` is preserved as provenance, not used as the fill value.
* **Required Metadata Fields:** `mountain_no_source` and `mountain_no_status` are required.
* **Important Note:** Unresolved candidates and resolved mountains are distinct entities. The existing `museum-yama-web/mountains.json` is a provisional legacy web cache and does not serve as this final semantic model.
* **Cardinality Expectation:** The target source set is all 531 CSV rows. The 30 blank-"No" rows receive provisional sequence-filled `mountain_no` values and are included.
* **Coordinate Evidence:** Provisional rows already have CSV lat/lon data in the `GPS` column, and these coordinates must be preserved as evidence.

### 13b. `mountain_summit_coordinates`
* **Role:** The dataset holding the resolved summit coordinates for mountain entities, preserving coordinate provenance.
* **Primary Inputs:** `raw_activity_workbook` (CSV extracts), `summit_candidates`, explicit human review records
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC dependency candidate
* **Key Alignment:** Maps to `mountain_no`.
* **Important Note:** Must distinguish coordinate sources (e.g., `csv_existing_gps`, `gpx_summit_candidate`) and validation statuses. Unresolved summit coordinates must be represented explicitly rather than dropping rows.

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
* **Schema Reference:** Will likely adapt the legacy schema/record shape (e.g., from `processed/mountain_merged.json`), but only after strictly satisfying the `mountain_no` primary key and 531-record validations. The legacy JSON in `processed/` is a schema reference only. The canonical future filename is undecided. For more details on adapting the schema, see [Legacy Resolved Mountain JSON Schema Audit](legacy_resolved_mountain_json_schema_audit.md). For the full schema contract and validation report, see [Resolved Mountain JSON Schema Contract](resolved_mountain_json_schema_contract.md) and [Mountain Source Validation Report](mountain_source_validation_report.md).
* **Cardinality Expectation:** The future resolved mountain JSON web export should strictly preserve the expected 531 top-level mountain record count unless a discrepancy is explicitly explained.

### 17. `validation_reports`
* **Role:** Automated checks confirming the integrity of the data layers (e.g., no orphaned candidates coerced to identities without evidence, duplicate mountain names, unlinked GPX files).
* **Primary Inputs:** Outputs across pipeline layers.
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** Git or DVC-tracked output
* **Integrity Validation:** Validation reports should actively verify key constraints. Specifically, checks should ensure:
  - target record count is 531
  - all records contain a `mountain_no`
  - all `mountain_no` values are unique and cover the expected `1..531` range
  - `mountain_no_source` and `mountain_no_status` are populated
  - same-name records are not improperly merged solely by name
* **Cardinality Reporting:** Report discrepancy categories (e.g., `missing_source_row`, `duplicate_or_merged_record`).

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

### 21. `mountain_summit_candidate_links`
* **Role:** A feature-level dataset capturing the generated candidate links between mountain records (`mountain_no`) and detected summit candidates, scoring their similarity using name similarity, elevation profile differences, distance between CSV coordinates and GPX summit coordinates, reverse-geocoding administrative overlap, and activity links.
* **Primary Inputs:** `accepted_mountain_source_rows`, `summit_candidates`, `location_enrichment` (reverse geocoding evidence), `gpx_yamap_activity_links` (title-enriched candidate activity links).
* **Expected Future Layer:** `04_feature` (physical path: `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl`)
* **Tracking System:** DVC dependency candidate
* **Status Notes:** This stage has been executed, providing candidate links and review queues to facilitate human-in-the-loop validation before final coordinate/identity resolution.

### 22. `mountain_summit_candidate_review_packets` (Historical/Superseded)
* **Role:** Markdown review packets grouping contested links and candidate ridge traverses by GPX track file and summit conflicts to facilitate human review, along with a prefilled review decisions template.
* **Primary Inputs:** `mountain_summit_candidate_links` (location-refined candidate links and conflict queues).
* **Expected Future Layer:** `08_reporting` (historical physical path: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/` and `review_decisions_template.csv`)
* **Tracking System:** DVC dependency candidate / Git-tracked outputs
* **Status Notes:** These paths are historical and were deleted/superseded. Use location-stability or grounding-assisted artifacts instead.

### 23. `mountain_geographic_grounding_reference`
* **Role:** Normalized external geographic grounding coordinate reference points for mountains that required external geographic verification.
* **Primary Inputs:** Raw external grounding responses, `accepted_mountain_source_rows`.
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC dependency candidate

### 24. `grounding_refined_candidate_links` (Stage 21 Baseline)
* **Role:** Candidate links projected with grounding responses as auxiliary evidence to reduce human review burden, without aggressively pruning the candidate universe.
* **Primary Inputs:** `mountain_summit_candidate_links` (location-stability refined), `mountain_geographic_grounding_reference`.
* **Expected Future Layer:** `04_feature`

### 25. `grounding_assisted_candidate_links` (Stage 23)
* **Role:** A heavily pruned subset of candidate links utilizing strict geographic grounding tolerances to remove completely spurious candidate rows.
* **Primary Inputs:** `summit_candidates`, `accepted_mountain_source_rows`, `mountain_geographic_grounding_reference`.
* **Expected Future Layer:** `04_feature`

### 26. `grounding_assisted_review_queues` (Stage 24)
* **Role:** Reporting artifacts grouping the `grounding_assisted_candidate_links` into action-oriented human-review tasks.
* **Primary Inputs:** `grounding_assisted_candidate_links`.
* **Expected Future Layer:** `08_reporting`

## Summary of Core Principles

1. **`mountains.json` Status:** It is a provisional legacy/web cache. It is not the final semantic model.
2. **First Export Target:** The first concrete data export target is `resolved_mountain_waypoint_gpx`.
3. **Provenance Management:** Detailed provenance logs will live in structured datasets like `mountain_identity_evidence`. The GPX extensions will only contain summary links to this deep data.
4. **Entity Separation:** `summit_candidates` (unresolved points) and `mountains` (resolved identities) are fundamentally different entities and are managed separately.

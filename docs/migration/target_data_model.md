# Target Data Model

This document outlines the high-level target data model for the future DVC and Kedro pipeline in the Yama Museum repository. It describes intended logical datasets rather than physical implementation files.

*Note: No physical directories or data files for this model have been created yet.*

## Dataset Overview

The datasets are structured across typical data engineering layers (`01_raw`, `02_intermediate`, `03_primary`, `04_feature`, `08_reporting`).

### 1. `raw_gpx_activities`
* **Role:** Immutable archive of original `.zip` or `.gpx` files exported from GPS devices or YAMAP.
* **Primary Inputs:** Raw user uploads.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC

### 2. `raw_activity_workbook`
* **Role:** The immutable original Excel workbook containing activity logs (`えひめの山.xlsx`).
* **Primary Inputs:** Manual user curation and tracking.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC

### 3. `excel_derived_activity_csv`
* **Role:** Extracted representations of the Excel workbook logs, used for intermediate tabular processing.
* **Primary Inputs:** `raw_activity_workbook`
* **Expected Future Layer:** `02_intermediate`
* **Tracking System:** DVC
* **Status Notes:** Historically existed as the `csv/` legacy directory; generation script needs restoration.

### 4. `raw_yamap_activity_metadata`
* **Role:** Original Markdown activity records scraped/fetched from YAMAP.
* **Primary Inputs:** `fetch-yamap-data` browser subagent outputs.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC

### 5. `raw_reverse_geocoding_cache`
* **Role:** Raw JSON responses from the Nominatim OpenStreetMap API.
* **Primary Inputs:** Coordinates fed into the reverse geocoding script.
* **Expected Future Layer:** `01_raw`
* **Tracking System:** DVC

### 6. `curated_mountain_research_docs`
* **Role:** Human-curated research and reference notes (e.g., same-name mountain disambiguation) providing evidence for identity resolution.
* **Primary Inputs:** Human research and agent-assisted survey drafts.
* **Expected Future Layer:** Maintained in `docs/` (Git-tracked), mapped as conceptual inputs to `04_feature` logic.
* **Tracking System:** Git

### 7. `gpx_tracks` & `gpx_trackpoints`
* **Role:** Normalized track and individual coordinate-level datasets representing the paths traveled.
* **Primary Inputs:** `raw_gpx_activities`
* **Expected Future Layer:** `02_intermediate` or `03_primary`
* **Tracking System:** DVC

### 8. `summit_candidates`
* **Role:** Geolocation points representing algorithmic detections of potential summits. These are strictly unverified entities and do not have mountain identities.
* **Primary Inputs:** `gpx_tracks` / `gpx_trackpoints` elevation profile analysis.
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC

### 9. `summit_candidate_gpx`
* **Role:** Exported representation of summit candidates for review or basic map overlays.
* **Primary Inputs:** `summit_candidates`
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** DVC (or dynamically generated)

### 10. `location_enrichment`
* **Role:** Municipality and regional boundaries mapped to coordinates.
* **Primary Inputs:** `raw_reverse_geocoding_cache`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC

### 11. `mountain_identity_evidence`
* **Role:** The consolidated structured dataset recording the exact reasons, documents, and coordinates used to assign an identity to a mountain peak.
* **Primary Inputs:** `curated_mountain_research_docs`, `location_enrichment`, `raw_activity_workbook`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC

### 12. `summit_identity_candidates`
* **Role:** The relational cross-referencing of `summit_candidates` against `mountain_identity_evidence` to attempt to resolve an identity.
* **Primary Inputs:** `summit_candidates`, `mountain_identity_evidence`
* **Expected Future Layer:** `04_feature`
* **Tracking System:** DVC

### 13. `mountains`
* **Role:** The authoritative structured table of resolved mountain identities with canonical names and disambiguation metadata.
* **Primary Inputs:** `summit_identity_candidates`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC
* **Important Note:** Unresolved candidates and resolved mountains are distinct entities. The existing `museum-yama-web/mountains.json` is a provisional legacy web cache and does not serve as this final semantic model.

### 14. `resolved_mountain_waypoint_gpx`
* **Role:** A collection of identified mountain waypoints formatted as a GPX/XML file, embedding evidence references in its extensions. This is the first concrete target export.
* **Primary Inputs:** `mountains`, `mountain_identity_evidence`
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** DVC (or dynamically generated)

### 15. `activity_mountain_links`
* **Role:** A junction dataset mapping specific activities (e.g., YAMAP activity IDs) to the resolved mountain IDs traversed during that activity.
* **Primary Inputs:** `raw_yamap_activity_metadata`, `mountains`, `gpx_tracks`
* **Expected Future Layer:** `03_primary`
* **Tracking System:** DVC

### 16. `web_data_exports`
* **Role:** JSON artifacts specifically optimized for rendering on the front-end web application.
* **Primary Inputs:** `resolved_mountain_waypoint_gpx`, `activity_mountain_links`
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** Git or dynamically generated

### 17. `validation_reports`
* **Role:** Automated checks confirming the integrity of the data layers (e.g., no orphaned candidates coerced to identities without evidence).
* **Primary Inputs:** Outputs across pipeline layers.
* **Expected Future Layer:** `08_reporting`
* **Tracking System:** Git or DVC

## Summary of Core Principles

1. **`mountains.json` Status:** It is a provisional legacy/web cache. It is not the final semantic model.
2. **First Export Target:** The first concrete data export target is `resolved_mountain_waypoint_gpx`.
3. **Provenance Management:** Detailed provenance logs will live in structured datasets like `mountain_identity_evidence`. The GPX extensions will only contain summary links to this deep data.
4. **Entity Separation:** `summit_candidates` (unresolved points) and `mountains` (resolved identities) are fundamentally different entities and are managed separately.

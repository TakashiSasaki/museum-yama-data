# Pipeline Design (Placeholders)

This directory will eventually contain the implementation of the data pipelines using Kedro.

**Important:** No code has been implemented yet. These are only structural placeholders.

## Intended Future Pipelines

### `parse_gpx`
* **Purpose:** Reads raw `.gpx` tracks from user inputs and converts them into normalized/intermediate track data (coordinates, elevation, timestamps).
* **Intended Inputs:** `raw_gpx_activities`
* **Intended Outputs:** `gpx_tracks`, `gpx_trackpoints`
* **Implementation Status:** Not implemented

### `link_gpx_to_yamap_activity`
* **Purpose:** Matches raw GPX track files to YAMAP activity Markdown metadata using explicit evidence (filename timestamps, JST track times, and normalized track names). **Note:** This stage may output a `missing_yamap_metadata` link status for valid GPX files lacking matching public YAMAP metadata (e.g., due to accepted coverage gaps).
* **Intended Inputs:** `raw_gpx_activities`, `raw_yamap_activity_metadata`
* **Intended Outputs:** `gpx_yamap_activity_links`
* **Implementation Status:** Not implemented

### `detect_summit_candidates`
* **Purpose:** Algorithmically detects potential peaks purely from GPX-derived evidence (e.g., elevation profiles, track traces). Assigns stable non-semantic candidate IDs. **Note:** This stage must not assign mountain names or identities. Missing YAMAP metadata must not block `detect_summit_candidates`. The five GPX files accepted as YAMAP metadata coverage gaps remain valid immutable GPX source tracks and remain fully eligible for GPX parsing, elevation-profile analysis, and summit candidate detection.
* **Intended Inputs:** `gpx_tracks` / `gpx_trackpoints`
* **Intended Outputs:** `summit_candidates`
* **Implementation Status:** Not implemented (Note: A portable baseline implementation `detect-candidates` exists as an agent skill command, generating unresolved candidates to aid with future experiments, but it is not the final Kedro pipeline implementation).

### `export_summit_candidate_gpx`
* **Purpose:** Generates a purely geographic GPX file showing all unverified summit candidates.
* **Intended Inputs:** `summit_candidates`
* **Intended Outputs:** `summit_candidate_gpx`
* **Implementation Status:** Not implemented

### `estimate_municipality`
* **Purpose:** Performs or maps coordinates against reverse geocoding cache to associate coordinates with municipalities/regions. **Note:** This stage preserves multiple municipality candidates when the point cannot be uniquely resolved, rather than forcing a single choice.
* **Intended Inputs:** `summit_candidates`, `raw_reverse_geocoding_cache`
* **Intended Outputs:** `location_enrichment`
* **Implementation Status:** Not implemented

### `collect_identity_evidence`
* **Purpose:** Consolidates geographic data, curated documentation, YAMAP metadata, and legacy records to form an evidence base for mountain identity.
* **Intended Inputs:** `location_enrichment`, `raw_activity_workbook`, `raw_yamap_activity_metadata`, `curated_mountain_research_docs`
* **Intended Outputs:** `mountain_identity_evidence`
* **Implementation Status:** Not implemented

### `resolve_mountain_identity`
* **Purpose:** Associates summit candidates with definitive mountain identities, creating the structured master `mountains` table. Handles same-name disambiguation.
* **Intended Inputs:** `summit_candidates`, `mountain_identity_evidence`
* **Intended Outputs:** `summit_identity_candidates`, `mountains`
* **Implementation Status:** Not implemented

### `export_resolved_mountain_waypoints`
* **Purpose:** Creates the final GPX waypoint export with full canonical names and provenance extensions for resolved mountains.
* **Intended Inputs:** `mountains`, `mountain_identity_evidence`
* **Intended Outputs:** `resolved_mountain_waypoint_gpx`
* **Implementation Status:** Not implemented

### `build_activity_mountain_links`
* **Purpose:** Connects specific YAMAP activity logs to the verified mountains they traversed.
* **Intended Inputs:** `raw_yamap_activity_metadata`, `mountains`, `gpx_tracks`
* **Intended Outputs:** `activity_mountain_links`
* **Implementation Status:** Not implemented

### `export_web_data`
* **Purpose:** Generates JSON data objects optimized for frontend mapping and UI consumption.
* **Intended Inputs:** `resolved_mountain_waypoint_gpx`, `activity_mountain_links`
* **Intended Outputs:** `web_data_exports`
* **Implementation Status:** Not implemented

### `validate_outputs`
* **Purpose:** Runs logical assertions (e.g., ensuring unresolved candidates are not coerced into identities) and coverage reports across the generated layers.
* **Intended Inputs:** Various pipeline outputs
* **Intended Outputs:** `validation_reports`
* **Implementation Status:** Not implemented

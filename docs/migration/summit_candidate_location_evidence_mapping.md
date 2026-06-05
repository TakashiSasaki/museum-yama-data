# Summit Candidate Location Evidence Mapping

This document details the source-to-target field mapping classifications for joining summit candidates with nearby reverse geocoding point indexes.

## Field Classifications

| Source Field / Attribute | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `summit_candidate_id` | `summit_candidate_id` | `migrated` | Joins candidate key. |
| candidate coordinates (`lat`, `lon`) | `lat`, `lon` | `migrated` | Preserves coordinates. |
| `source_gpx_path` | `source_gpx_path` | `migrated` | Traces back to source. |
| `summit_candidate_gpx_path` | `summit_candidate_gpx_path` | `migrated` | Traces back to output waypoint. |
| `track_name` | `track_name` | `migrated` | Traces back to track. |
| geocoded point ID (`geocoded_point_id`) | `nearest_geocoded_point_id` | `migrated` | References closest point. |
| geocoded point coords (`lat`, `lon`) | N/A | `derived only` | Used to compute Haversine distance. |
| computed distance | `nearest_distance_m` | `derived only` | Distance in meters. |
| geocoded point address components | `municipality_candidates`, `island_candidates`, etc. | `migrated` | Summarized candidates. |
| geocoded point `display_name` | `nearest_display_name` | `migrated` | Preserved for context. |
| geocoded point `address` | `nearest_address` | `migrated` | Preserved for context. |
| radius value | `search_radius_m` | `derived only` | Parameter used in query. |
| evidence classification | `location_evidence_status` | `derived only` | Identifies matches or missing cache. |
| distance tier classification | `location_evidence_level` | `derived only` | Identifies confidence tier. |

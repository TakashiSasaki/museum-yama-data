# Summit Candidate Feature Mapping

This document details the source-to-target field mapping classifications for the extraction of summit candidate features from GPX and manifest files.

## Field Classifications

| Source Field / Attribute | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `source_gpx_path` | `source_gpx_path` | `migrated` | Preserved from manifest record. |
| `source_gpx_sha256` | `source_gpx_sha256` | `migrated` | Preserved from manifest record. |
| `output_gpx_path` | `summit_candidate_gpx_path` | `migrated` | Preserved from manifest record. |
| `output_gpx_sha256` | `summit_candidate_gpx_sha256` | `migrated` | Preserved from manifest record. |
| `track_name` | `track_name` | `migrated` | Preserved from manifest record. |
| `bounds` | `manifest_bounds` | `migrated` | Preserved from manifest bounds. |
| `trackpoint_count` | `manifest_trackpoint_count` | `migrated` | Preserved from manifest record. |
| `summit_candidate_count` | N/A | `derived only` | Verified against extracted count. |
| `candidate_ids` | `summit_candidate_id` | `migrated` | Used as ID fallback if not in waypoint. |
| `<wpt>` `lat` | `lat` | `migrated` | Parsed to float. |
| `<wpt>` `lon` | `lon` | `migrated` | Parsed to float. |
| `<wpt>` `<ele>` | `ele_m` | `migrated` | Parsed to float or null. |
| `<wpt>` `<name>` | `waypoint_name` | `migrated` | Preserved; also parsed for `summit_candidate_id`. |
| `<wpt>` `<desc>` | `waypoint_desc` | `migrated` | Preserved as raw description. |
| `<wpt>` `<extensions>` `yama:candidate_status` | `candidate_status` | `migrated` | Preserved. Defaults to `unresolved`. |
| `<wpt>` `<extensions>` `yama:detection_method` | `detection_stage` | `derived only` | Sets detection stage context. |
| `<wpt>` `<extensions>` `yama:detection_parameters` | `detection_parameters` | `migrated` | Preserved. |
| zero-candidate files | N/A | `derived only` | Summarized in validation report. |

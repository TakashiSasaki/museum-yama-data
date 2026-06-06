# Summit Candidate Feature Mapping

This document details the source-to-target field mapping classifications for the extraction of summit candidate features from GPX and manifest files.

## Field Classifications

| Source Field / Attribute / File | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| source raw GPX path | `source_gpx_path` | `migrated` | Preserved from manifest file record. |
| source raw GPX checksum | `source_gpx_sha256` | `migrated` | Preserved from manifest file record. |
| summit-candidate GPX path | `summit_candidate_gpx_path` | `migrated` | Preserved from manifest file record. |
| summit-candidate GPX checksum | `summit_candidate_gpx_sha256` | `migrated` | Preserved from manifest file record. |
| manifest stage | `detection_stage` | `migrated` | Preserved from input manifest root `stage`. |
| manifest detection parameters | `detection_parameters` | `migrated` | Preserved from input manifest root `parameters`. |
| manifest source_gpx_path | `source_gpx_path` | `migrated` | Preserved from manifest file record. |
| manifest output_gpx_path | `summit_candidate_gpx_path` | `migrated` | Preserved from manifest file record. |
| manifest track_name | `track_name` | `migrated` | Preserved from manifest file record. |
| manifest bounds | `manifest_bounds` | `migrated` | Preserved from manifest bounds. |
| manifest trackpoint_count | `manifest_trackpoint_count` | `migrated` | Preserved from manifest file record. |
| manifest summit_candidate_count | N/A | `derived only` | Count of candidates in this GPX, verified against count in JSONL. |
| manifest candidate_ids | `summit_candidate_id` | `migrated` | Fallback ID array mapped sequentially to waypoints if name is missing candidate ID. |
| GPX waypoint lat | `lat` | `migrated` | Parsed to float from `<wpt>` lat attribute. |
| GPX waypoint lon | `lon` | `migrated` | Parsed to float from `<wpt>` lon attribute. |
| GPX waypoint ele | `ele_m` | `migrated` | Parsed to float from `<wpt> <ele>` element (or null if missing/unparseable). |
| GPX waypoint name | `waypoint_name` | `migrated` | Preserved; also parsed to extract the `summit_candidate_id`. |
| GPX waypoint desc | `waypoint_desc` | `migrated` | Preserved as raw description. |
| GPX waypoint extensions, if present | N/A | `derived only` | Used to inspect individual waypoint-level detection parameters and attributes. |
| zero-candidate GPX files | N/A | `derived only` | Accounted for in output manifest and validation report. |
| failed GPX files, if present | N/A | `derived only` | Count of failed files, verified as 0 in this stage. |


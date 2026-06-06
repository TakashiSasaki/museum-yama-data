# GPX to YAMAP Date Linking Report

* **Branch and HEAD commit**: 26f04bff24c048a121a9b1bbfaee22f2d08acf80
* **Selected GPX input directory**: `data/01_raw/gpx/2026-05-12`
* **Selected YAMAP Markdown input directory**: `data/01_raw/yamap_markdown`
* **Command used**: `node .agents/skills/yama-data-pipeline/cli.js link-gpx-yamap-by-date ...`
* **Output paths**:
  - Intermediate GPX Index: `data/02_intermediate/activity_linking/gpx_filename_index/2026-05-12/gpx_filename_index.jsonl`
  - Intermediate YAMAP Index: `data/02_intermediate/activity_linking/yamap_activity_index/yamap_activity_index.jsonl`
  - Candidate Links: `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/date_candidate_links.jsonl`
  - Review Queue CSV: `data/08_reporting/activity_linking/gpx_yamap_review_queue/2026-05-12/date_review_queue.csv`
* **Record counts**:
  - GPX Indexed: 293
  - YAMAP Indexed: 434
  - Candidate Link Records: 293
* **SHA-256 Checksum Policy**: SHA-256 is explicitly used for all project-level file integrity.
* **Timezone Ambiguity Handling Policy**: Parsed datetimes from filenames are evaluated under both direct JST interpretation and UTC-to-JST conversions (+9 hours shift) to preserve ambiguity across all indexes, candidate feature lists, and review queues.
* **Status counts**:
  - `single_date_candidate`: 128
  - `multiple_date_candidates`: 160
  - `no_date_candidate`: 5
  - `gpx_datetime_unparsed`: 0
* **Timezone-sensitive count**: 14
* **Limitations of date-only matching**: High date match ambiguity due to potential overlaps, timezone shift variants, or multiple activities on the same calendar day.
* **Statement on canonical files**: No final canonical links were created (data/03_primary/ was not modified).
* **Statement on source files**: Source GPX and YAMAP Markdown files were not modified.
* **Next steps**: Run title-based matching and merge records into the confirmed link tables.

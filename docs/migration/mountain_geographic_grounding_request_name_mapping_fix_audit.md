# Mountain Geographic Grounding Request Name Mapping Fix Audit

This document audits and classifies all source fields, generated fields, and regenerated output paths for the Stage 20 name mapping fix.

## Source Fields Classification

| Field / Path | Classification | Target / Rationale |
|---|---|---|
| `mountain_no` | `migrated` | Target mountain unique identifier. |
| `name` | `migrated` | Primary name field from `ehime_mountain_source_rows.json`, migrated to all Stage 20 outputs. |
| `mountain_name` | `preserved as legacy reference` | Legacy name key in primary JSON, used only as a fallback. |
| `source_row_no` | `migrated` | Source row tracing. |
| `location.municipality_or_island` | `migrated` | Text location specifier from source. |
| `location.municipality` | `migrated` | Extracted source municipality. |
| `location.island` | `migrated` | Extracted source island (if any). |
| `coordinates.lat` | `migrated` | Source lat coordinate. |
| `coordinates.lon` | `migrated` | Source lon coordinate. |
| `elevation_m` | `migrated` | Source mountain official elevation. |
| `yamap_url` | `migrated` | Source YAMAP reference URL. |

## Generated Stage 20 Fields Classification

| Field / Path | Classification | Target / Rationale |
|---|---|---|
| `source_mountain.mountain_name` | `derived only` | Normalized mountain name in the `source_mountain` JSON block. |
| top-level `mountain_name` | `derived only` | Normalized mountain name at the top level of the request packet. |
| `external_agent_task.instruction` | `derived only` | Task instruction text including normalized mountain name. |
| `external_agent_task.prompt_text` | `derived only` | Prompt text prompt template containing normalized mountain name. |
| selection log `mountain_name` | `derived only` | Normalized mountain name in `review_required_grounding_request_selection.jsonl`. |
| submission queue `mountain_name` | `derived only` | Normalized mountain name in `review_required_grounding_submission_queue.csv`. |
| Markdown packet `Mountain Name` | `derived only` | Formatted name in the `## Target mountain` section. |
| Markdown packet task text | `derived only` | Instructed target name in the `## Task for geographic grounding agent` section. |
| index packet label | `derived only` | Linked name label in `index.md`. |
| hash / grounding_request_id input context | `derived only` | Hash context string used to calculate unique request ID. |

## Regenerated Output Paths Classification

| Output Path | Classification | Rationale |
|---|---|---|
| `data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_packets.jsonl` | `derived only` | Regenerated request packets JSONL. |
| `data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_selection.jsonl` | `derived only` | Regenerated selection log JSONL. |
| `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_submission_queue.csv` | `derived only` | Regenerated submission queue CSV. |
| `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_request_packets/*.md` | `derived only` | Regenerated Markdown request packets. |
| `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_request_packets/index.md` | `derived only` | Regenerated packets index markdown. |
| `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_summary.md` | `derived only` | Regenerated summary markdown. |
| `data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_manifest.json` | `derived only` | Regenerated stage manifest JSON. |
| `docs/migration/mountain_geographic_grounding_request_packet_report.md` | `derived only` | Regenerated stage report. |

## Audit Conclusions

* `name` from primary mountain JSON is migrated to all Stage 20 mountain-name outputs.
* `mountain_name` is treated only as a fallback for compatibility with downstream link rows or older records.
* No source fields are unclassified.
* Unmigrated gaps: none
* Needs decision items: none
* Existing source files modified: false
* Reverse-geocoding artifacts deleted or modified: false
* Stage 18/19 review artifacts modified: false
* DVC status: not active; no DVC command executed
* External API calls: none
* Final coordinate generation: out of scope
* Automatic candidate acceptance: out of scope
* Current flawed Stage 20 outputs are intentionally regenerated because they contain incorrect `undefined` / blank mountain names.

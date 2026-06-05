# Source-to-Target Mapping Audit (Template)

**WARNING:**
*   This is not yet a completed source-to-target mapping audit.
*   Physical directory restructuring remains blocked.
*   No data movement is authorized by this document.
*   Every current path and relevant field/artifact role must be classified before implementation.
*   Any "needs decision", "unmigrated gap", or unclassified item blocks movement.

## File/Directory Mapping

| current path | current role | current classification | reproducibility role | proposed target path | proposed target disposition | physical movement proposed? | remains Git-tracked? | DVC role, if any | provenance implication | references that must be updated | validation method | rollback strategy | blocker / needs-decision status | final disposition classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` | Primary source workbook | preserved_as_raw_snapshot | Raw received workbook file | `data/02_intermediate/activity_logs/csv_extracted/2026-05-18/*.csv` | Reproducible intermediate output | Yes | Yes | DVC dependency | Exact extraction of all sheets to CSV via `extract-excel-sheets` | N/A | extract-excel-sheets staged read-back | delete final extracted CSVs | resolved | preserved_as_raw_snapshot |
| `data/01_raw/as_received/` | Any received format | preserved as raw snapshot | Must be preserved | `data/01_raw/as_received/` | Preserved as received | Yes | Yes | DVC dependency candidate | Immutable primary source | N/A | N/A | N/A | resolved | preserved_as_raw_snapshot |
| `gpx/raw/` | Raw GPX source files | template placeholder | DVC-light source | `data/01_raw/gpx/` | template placeholder | template placeholder | Yes | DVC dependency | Immutable primary source | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `gpx/annotated/` | Legacy unvalidated artifacts | template placeholder | Legacy evidence | `data/99_work/` | template placeholder | template placeholder | Yes | None | Preserved as historical evidence | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `gpx/merged-by-year/` | Legacy reporting artifacts | template placeholder | Requires formal validation | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Needs validation | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `csv/` | Legacy operational input | template placeholder | Excel-derived source-equivalent CSV extracts (Note: 30 rows with a blank 'No' value are now in scope for the authoritative mountain source set and are assigned provisional mountain numbers) | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Excel-derived source-equivalent CSV extracts (Note: 30 rows with a blank 'No' value are now in scope for the authoritative mountain source set and are assigned provisional mountain numbers); operational canonical tabular representation for the legacy pipeline; no manual post-processing according to user-provided provenance; validation of extraction logic still required before regeneration or migration. | template placeholder | template placeholder | template placeholder | extraction-script/equivalent-logic validation still required | needs decision |
| `processed/` | Legacy processed-marker archive | template placeholder | Retained source snapshot archive | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Not a clean future raw-data layout | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `processed/えひめの山.xlsx` | Primary source workbook | preserved_as_raw_snapshot | Retained source snapshot | `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` | Preserved as received | Yes | Yes | None initially | Original activity log workbook | Previous references to `processed/` | validate-provider-received | git mv back | resolved | preserved_as_raw_snapshot |
| `processed/GPXファイル.zip` | Primary GPX export package | preserved_as_raw_snapshot | Retained source snapshot | `data/01_raw/as_received/2026-05-12/GPXファイル.zip` | Preserved as received | Yes | Yes | None initially | Original GPX export package | Previous references to `processed/` | validate-provider-received | git mv back | resolved | preserved_as_raw_snapshot |
| `processed/mountain_merged.json` | Generated artifact | template placeholder | Schema reference | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy schema reference, not a canonical future output. See Resolved Mountain JSON Schema Contract | template placeholder | template placeholder | template placeholder | misplaced_generated_output | legacy_schema_reference |
| `processed/mountain_link_mapping.json` | Generated artifact | template placeholder | Derived mapping evidence | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy generated artifact | template placeholder | template placeholder | template placeholder | misplaced_generated_output | legacy_mapping_evidence |
| `processed/mountain_summit_coordinates.json` | Generated artifact | template placeholder | Derived coordinate evidence | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy generated artifact | template placeholder | template placeholder | template placeholder | misplaced_generated_output | legacy_coordinate_evidence |
| `yamap/` | YAMAP Markdown activities | preserved_as_raw_snapshot | Raw YAMAP activity metadata | `data/01_raw/yamap_markdown/` | Preserved as raw snapshot | Yes | Yes | Future DVC dependency candidate, but no DVC initialization now | Raw source data | docs, scripts, skills, README/AGENTS where they refer to yamap/ as current location | file count comparison | git mv back to yamap/ | resolved | preserved_as_raw_snapshot |
| `yamap/yamap_all_activity_ids.txt` | YAMAP fetch log | preserved_as_legacy_reference | Metadata / Log | `data/01_raw/yamap_metadata/yamap_all_activity_ids.txt` | Preserved as legacy reference | Yes | Yes | Future DVC dependency candidate, but no DVC initialization now | Reference log | docs, scripts, skills, README/AGENTS where they refer to yamap/yamap_all_activity_ids.txt | file existence check | git mv back to yamap/ | resolved | preserved_as_legacy_reference |
| `reverse_geocoding/` | Reverse geocoding raw API response cache | `preserved_as_raw_snapshot` | Cached location enrichment | External API response snapshots; re-fetchable but potentially rate-limited / expensive | `data/01_raw/reverse_geocoding/` | Preserved as raw source snapshot/cache | Yes | Yes | Future DVC dependency candidate, but no DVC initialization now | Preserves raw reverse geocoding API responses for municipality-level location enrichment | docs, scripts, skills, README/AGENTS where they refer to reverse_geocoding/ as current location | file count comparison, checksum comparison, JSON parse / top-level key inspection, stale reference grep | git mv back to reverse_geocoding/ | resolved | preserved_as_raw_snapshot |
| `museum-yama-web/` | Web cache directory | template placeholder | Provisional cache | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Not the final semantic model | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `museum-yama-web/mountains.json` | Web cache artifact | template placeholder | Accumulated provisional list | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy evidence; supersedable. See legacy schema audit. | template placeholder | template placeholder | template placeholder | legacy_web_cache | legacy_evidence |
| `docs/` | Internal documentation | template placeholder | Canonical source of truth | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Policies and audits | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `site/` | Generated site | template placeholder | GitHub Pages presentation | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Deterministic output | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `data/08_reporting/gpx/summit_candidates/` | Summit candidate GPX files and manifest | resolved | Derived reporting artifacts | `data/08_reporting/gpx/summit_candidates/` | Preserved as reporting artifacts | No | Yes | None | Generated by generate-summit-candidate-gpx | N/A | N/A | N/A | resolved | derived_only |
| data/03_primary/summit_candidates/ | Summit candidate feature JSONL and manifest | resolved | Primary unresolved summit candidate dataset | data/03_primary/summit_candidates/ | Created as primary dataset | No | Yes | None | Extracted by extract-summit-candidate-features | N/A | N/A | N/A | resolved | migrated |
| data/04_feature/mountain_summit_candidate_links/ | Candidate links JSONL and manifest | resolved | Primary candidate links dataset | data/04_feature/mountain_summit_candidate_links/ | Created as primary candidate links | No | Yes | None | Generated by generate-mountain-summit-candidate-links | N/A | N/A | N/A | resolved | migrated |
| data/04_feature/mountain_summit_candidate_links/.../location_refined_candidate_links.jsonl | Refined candidate links JSONL | resolved | Location-refined candidate links | same | Refined candidate links dataset | No | Yes | None | Generated by refine-mountain-summit-candidate-links-by-location | N/A | N/A | N/A | resolved | derived_only |
| data/08_reporting/mountain_summit_candidate_review/ | Mountain summit candidate review files (CSV/Markdown) | resolved | Derived review artifacts | data/08_reporting/mountain_summit_candidate_review/ | Created as reporting artifacts | No | Yes | None | Generated by generate-mountain-summit-candidate-links | N/A | N/A | N/A | resolved | derived_only |
| data/08_reporting/mountain_summit_candidate_review/.../location_refined_review_queue.* | Refined review queue files (CSV/Markdown) | resolved | Prioritized review queue | same | Refined review queue files | No | Yes | None | Generated by refine-mountain-summit-candidate-links-by-location | N/A | N/A | N/A | resolved | derived_only |
| data/08_reporting/mountain_summit_candidate_review/.../compact_review_queue_* | Compact review queue files (CSV/Markdown/JSON) | resolved | Compacted review queues | same | Compacted review queues | No | Yes | None | Generated by generate-compact-mountain-summit-review-queues | N/A | N/A | N/A | resolved | derived_only |
| data/08_reporting/mountain_summit_candidate_review/.../conflict_groups_* | Conflict groups by GPX/Summit (CSV) | resolved | Conflict-focused review groups | same | Conflict-focused review groups | No | Yes | None | Generated by generate-compact-mountain-summit-review-queues | N/A | N/A | N/A | resolved | derived_only |
| data/08_reporting/mountain_summit_candidate_review/.../review_packets/ | Markdown review packets (GPX traverses and summit conflicts) | resolved | Review packets | same | Review packets | No | Yes | None | Generated by generate-mountain-summit-review-packets | N/A | N/A | N/A | resolved | derived_only |
| data/08_reporting/mountain_summit_candidate_review/.../review_decisions_template.csv | Prefilled human decision template (CSV) | resolved | Human decision template | same | Human decision template | No | Yes | None | Generated by generate-mountain-summit-review-packets | N/A | N/A | N/A | resolved | derived_only |


## Field Mapping


| source field/column | source file/table | target field | target dataset/model | role in target | notes / constraints | mapping status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `No` | `愛媛県の山.csv` | `csv_no` | `accepted_mountain_source_rows` | Original ID | migrated as `csv_no`; used directly as `mountain_no` when the non-empty `No` sequence validates; blank source `No` values are not preserved as blank effective `mountain_no` | migrated |
| CSV physical row number | `愛媛県の山.csv` | `source_row_no` | `accepted_mountain_source_rows` | Provenance | derived only / provenance; preserved as `source_row_no`; no longer used as the `mountain_no` fill value | derived_only |
| `max_existing_no` | (derived) | `max_existing_no` | `accepted_mountain_source_rows` (processing metadata) | Fill sequence base | derived only; used to determine the first sequence-filled provisional `mountain_no` | derived_only |
| sequence-filled `mountain_no` | (derived) | `mountain_no` | `accepted_mountain_source_rows` | Derived accepted key for blank `No` rows | generated in `source_row_no` order starting at `max_existing_no + 1` | derived |
| effective `mountain_no` | (derived) | `mountain_no` | `accepted_mountain_source_rows` | Accepted key | non-null integer required for every accepted row; uniqueness required; current expected set is `1..531` | derived/migrated |
| `GPS` | `愛媛県の山.csv` | `gps_raw` | `accepted_mountain_source_rows` | Raw coordinate evidence | migrated as `gps_raw` raw coordinate evidence; parsed latitude/longitude are future derived fields; original value must be preserved | migrated |
| `山名` | `愛媛県の山.csv` | `mountain_name` | `accepted_mountain_source_rows` | Source mountain name | migrated as source mountain name | migrated |
| `市町村・島` | `愛媛県の山.csv` | `municipality` | `accepted_mountain_source_rows` | Source municipality text | migrated as source municipality text | migrated |
| `標高` | `愛媛県の山.csv` | `elevation` | `accepted_mountain_source_rows` | Source elevation evidence | migrated as source elevation evidence | migrated |
| Other Columns | 愛媛県の山.csv | N/A | accepted_mountain_source_rows | Discarded | Classified and mapped in [mountain_source_json_field_mapping.md](mountain_source_json_field_mapping.md) | resolved |

## Provenance Findings

The repository appears to primarily target YAMAP activities associated with user ID 2437175. This is currently a repository-level working hypothesis based on the fetch-user-activities skill example and collection workflow, not a per-activity verified fact. Current `yamap/*.md` snapshots store activity IDs and activity metadata, but do not preserve activity owner/user IDs. A future audit should verify `activity_owner_user_id` for each YAMAP activity and identify any activities from other users. See `docs/migration/provenance_findings.md`.

## Future Audit Items

### GPX-to-YAMAP Activity Linking

*   **Requirement:** A future pipeline stage (e.g., `link_gpx_to_yamap_activity`) is required to definitively match `gpx/raw/*.gpx` files to `yamap/*.md` activities.
*   **Context:** Read-only inspection across the repository verified that GPX XML files do not embed the YAMAP activity ID directly. GPX-to-YAMAP linking should therefore be implemented as an explicit pipeline stage using filename timestamps, GPX track times, track names, and YAMAP Markdown metadata.
*   **Resolution of Unresolved Links:** A human-confirmed audit documented in `docs/migration/yamap_unresolved_activity_link_resolution.md` resolved a key candidate case (yamap_2022-07-10_07_25.gpx is mapped to activity 18371502) and formally accepted five files (伊之子山・左谷ノ森 on 2022-04-25, 二反山・青刈山 on 2024-05-19, 二反山 on 2024-06-14, 薬師山 on 2024-06-16, and 高縄山 on 2024-08-04) as accepted `missing_yamap_metadata` coverage gaps. These five GPX files are accepted YAMAP metadata coverage gaps. They remain valid immutable GPX source tracks and remain eligible for GPX parsing, elevation-profile analysis, and summit candidate detection. Only YAMAP activity metadata enrichment and YAMAP activity ID based joins should treat their activity link as missing or null.
*   **Evidence for Matching:**
    *   GPX filename timestamp
    *   GPX track start/end time
    *   GPX track name
    *   YAMAP Markdown activity date
    *   YAMAP Markdown title
    *   Distance/duration consistency where available
*   **Expected Output:** An intermediate link dataset (e.g., `gpx_yamap_activity_links` or `activity_source_links`) that preserves confidence/evidence fields rather than silently forcing one-to-one matches.
*   **Suggested Future Output Fields:**
    *   `gpx_path`
    *   `yamap_activity_id`
    *   `yamap_markdown_path`
    *   `match_status`
    *   `confidence`
    *   `evidence_fields`
    *   `time_delta_seconds`
    *   `title_similarity`
    *   `distance_consistency`
    *   `needs_review`
    *   `notes`
*   **Data Model Implication:** Final mountain list data does not require full route/trackpoint geometry. Route data is source evidence for candidate detection, validation, and provenance. The final semantic mountain dataset should focus on resolved mountain entities, waypoints, identity evidence, and activity links, not on retaining full route geometry.

### Summit Candidate Detection

*   **Requirement:** The `detect_summit_candidates` stage must produce unresolved candidate points strictly using GPX-derived evidence (e.g., elevation profiles, trackpoint traces).
*   **Legacy Context:** The existing `.agents/skills/yama-data-pipeline/commands/annotate.js` script is a legacy reference baseline.
    *   Its algorithmic baseline (smoothing, local maxima, minimum prominence) is useful but parameters require audit and tuning. The portable `detect-candidates` command provides the reusable baseline implementation for summit candidate detection experiments, but is not yet the final Kedro pipeline implementation. The legacy/reference detection parameters have a read-only baseline audit in `docs/migration/summit_candidate_detection_audit.md`. The audit evaluates candidate-count behavior and parameter sensitivity, but does not select final production parameters. The baseline audit has a follow-up outlier review in `docs/migration/summit_candidate_detection_outlier_review.md`, focusing on zero-candidate, high-candidate-count, low-elevation-range, few-trackpoint, and linking-unresolved cases. This review supports parameter tuning but does not select production parameters.
    *   Its legacy mountain-name assignment behavior (`assignPeakNames()`) must be explicitly excluded from candidate detection and moved to downstream identity resolution.
    *   Legacy annotated GPX files (`gpx/annotated/`) are evidence, not authoritative truth.
*   **Expected Output:** Unresolved candidate points with stable, non-semantic IDs. No final mountain identities or authoritative names should be assigned during this stage. Missing YAMAP metadata must not block `detect_summit_candidates`.

### Municipality Enrichment

*   **Requirement:** The `estimate_municipality` stage enriches location evidence for candidates.
*   **Granularity:** Enrichment is required only up to the city/county/town/village level. Detailed address components (e.g., district, aza, block number) should not be used as final structured fields.
*   **Ambiguity Preservation:** When ambiguity exists (e.g., overlapping boundaries), multiple municipality candidates must be preserved. The stage must not arbitrarily force a single municipality choice.

### GPX-derived Summit Candidate & Geocoding Mapping Audits

Detailed mapping audits for this stage are maintained in:
- [Summit Candidate Feature Mapping](summit_candidate_feature_mapping.md)
- [Reverse Geocoding Point Index Mapping](reverse_geocoding_point_index_mapping.md)
- [Summit Candidate Location Evidence Mapping](summit_candidate_location_evidence_mapping.md)
- [Mountain Geographic Grounding Request Packet Mapping](mountain_geographic_grounding_request_packet_mapping.md)


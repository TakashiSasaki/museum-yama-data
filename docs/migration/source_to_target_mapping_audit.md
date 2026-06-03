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
| `data/01_raw/provider_received/` | Any received format | preserved as raw snapshot | Must be preserved | `data/01_raw/provider_received/` | Preserved as received | No | Yes | DVC dependency candidate | Immutable primary source | N/A | N/A | N/A | N/A | preserved_as_raw_snapshot |
| `gpx/raw/` | Raw GPX source files | template placeholder | DVC-light source | `data/01_raw/gpx/` | template placeholder | template placeholder | Yes | DVC dependency | Immutable primary source | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `gpx/annotated/` | Legacy unvalidated artifacts | template placeholder | Legacy evidence | `data/99_work/` | template placeholder | template placeholder | Yes | None | Preserved as historical evidence | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `gpx/merged-by-year/` | Legacy reporting artifacts | template placeholder | Requires formal validation | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Needs validation | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `csv/` | Legacy operational input | template placeholder | Excel-derived source-equivalent CSV extracts (Note: 30 rows with a blank 'No' value are explicitly excluded from the authoritative mountain source set) | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Excel-derived source-equivalent CSV extracts (Note: 30 rows with a blank 'No' value are explicitly excluded from the authoritative mountain source set); operational canonical tabular representation for the legacy pipeline; no manual post-processing according to user-provided provenance; validation of extraction logic still required before regeneration or migration. | template placeholder | template placeholder | template placeholder | extraction-script/equivalent-logic validation still required | needs decision |
| `processed/` | Legacy processed-marker archive | template placeholder | Retained source snapshot archive | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Not a clean future raw-data layout | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `processed/えひめの山.xlsx` | Primary source workbook | preserved_as_raw_snapshot | Retained source snapshot | `data/01_raw/provider_received/yoshitomi/1980-01-01/えひめの山.xlsx` | Preserved as received | Yes | Yes | None initially | Original activity log workbook | Previous references to `processed/` | validate-provider-received | git mv back | resolved | preserved_as_raw_snapshot |
| `processed/GPXファイル.zip` | Primary GPX export package | preserved_as_raw_snapshot | Retained source snapshot | `data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip` | Preserved as received | Yes | Yes | None initially | Original GPX export package | Previous references to `processed/` | validate-provider-received | git mv back | resolved | preserved_as_raw_snapshot |
| `processed/mountain_merged.json` | Generated artifact | template placeholder | Schema reference | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy schema reference, not a canonical future output. See Resolved Mountain JSON Schema Contract | template placeholder | template placeholder | template placeholder | misplaced_generated_output | legacy_schema_reference |
| `processed/mountain_link_mapping.json` | Generated artifact | template placeholder | Derived mapping evidence | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy generated artifact | template placeholder | template placeholder | template placeholder | misplaced_generated_output | legacy_mapping_evidence |
| `processed/mountain_summit_coordinates.json` | Generated artifact | template placeholder | Derived coordinate evidence | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy generated artifact | template placeholder | template placeholder | template placeholder | misplaced_generated_output | legacy_coordinate_evidence |
| `yamap/` | YAMAP Markdown activities | template placeholder | Raw YAMAP activity metadata | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Raw source data | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `yamap/yamap_all_activity_ids.txt` | YAMAP fetch log | template placeholder | Metadata / Log | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Reference log | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `reverse_geocoding/` | Geocoding cache | template placeholder | Cached location enrichment | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Cached API responses | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `museum-yama-web/` | Web cache directory | template placeholder | Provisional cache | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Not the final semantic model | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `museum-yama-web/mountains.json` | Web cache artifact | template placeholder | Accumulated provisional list | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Legacy evidence; supersedable. See legacy schema audit. | template placeholder | template placeholder | template placeholder | legacy_web_cache | legacy_evidence |
| `docs/` | Internal documentation | template placeholder | Canonical source of truth | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Policies and audits | template placeholder | template placeholder | template placeholder | needs decision | needs decision |
| `site/` | Generated site | template placeholder | GitHub Pages presentation | template placeholder | template placeholder | template placeholder | template placeholder | template placeholder | Deterministic output | template placeholder | template placeholder | template placeholder | needs decision | needs decision |

## Field Mapping

| source field/column | source file/table | target field | target dataset/model | role in target | notes / constraints | mapping status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `No` | `csv/えひめの山_愛媛県の山.csv` | `mountain_no` | `mountains` | Authoritative Primary Key | 501 authoritative values (`1..501`). Blank-"No" records are explicitly excluded. | migrated |
| blank `No` row | `csv/えひめの山_愛媛県の山.csv` | N/A | `mountains` | Excluded | 30 rows preserved in source but excluded from target authoritative set. | excluded_from_authoritative_source |
| `山名` | `csv/えひめの山_愛媛県の山.csv` | `mountain_name` | `mountains` | Label/Evidence | Must not be used as primary key. Same-name records must not be merged. | migrated |
| `市町村・島` | `csv/えひめの山_愛媛県の山.csv` | `municipality` | `mountains` | Label/Evidence | Must not be used as primary key. | migrated |
| Row index | `csv/えひめの山_愛媛県の山.csv` | `source_row_index` | `mountains` | Provenance | May be preserved as provenance, but must not be used as the primary key. | migrated |

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

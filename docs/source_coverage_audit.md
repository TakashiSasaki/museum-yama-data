# Source Coverage Audit

This document serves as an audit of all top-level data areas in the repository.

**CRITICAL REQUIREMENT:** Any future data migration, schema change, normalization, import, backfill, or storage reorganization MUST first classify all relevant source files and fields. Migrations MUST NOT proceed if any item remains unclassified, "needs decision", or "unmigrated gap".

## Initial Audit Table

| Source Path | Source Type | Current Role | Known Writer/Producer | Known Reader/Consumer | Expected Target Path | Classification | Migration Status | Data Loss Risk | Needs Human Decision | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `data/01_raw/provider_received/` | Any | Source | N/A (Newly Created) | None | `data/01_raw/provider_received/` | preserved as raw snapshot | N/A | Low | No | Minimal new intake path for future provider-received raw source files. Does not authorize moving existing data. |
| `gpx/raw/` | `.gpx` | Source | Manual Upload / Intake Skill | yama-data-pipeline | TBD | needs decision | Pending | High | Yes | Exact target path pending Kedro layout decision |
| `gpx/annotated/` | `.gpx` | Artifact | yama-data-pipeline (annotate) | Web App | `data/99_work/legacy_annotated_gpx/` | needs decision | Pending | Medium (legacy evidence; future equivalent can be regenerated, exact historical output may not be) | Yes | Legacy experimental derived artifacts produced by the legacy `annotate` command. Preserved as legacy evidence; unvalidated derived artifact; not authoritative. Existing algorithm output and summit names are not trusted. Future pipeline output should generate summit-candidate waypoints separately; summit identity/name resolution is a separate downstream step. |
| `gpx/merged-by-year/` | `.gpx` | Artifact | yama-data-pipeline (merge) | Google My Maps | `data/08_reporting/gpx/merged_by_year/` | needs decision | Pending | Low (regenerable) | Yes | Legacy yearly merged GPX overview/reporting artifacts for whole-dataset browsing and Google My Maps import. Must be preserved until the merge pipeline and validation rules are formalized. |
| `csv/` | `.csv` | Intermediate / Operational Input | Python script (missing) | yama-data-pipeline | `data/02_intermediate/activity_logs/csv_extracted/` | needs decision | Pending | High | Yes | Direct script-generated extracts from four workbook sheets. The `No` column is the authoritative source key. 30 blank-"No" rows are excluded. Expected authoritative key set is `1..501`. No manual edits or post-processing after extraction, according to user-provided provenance. Migration remains blocked until the historical extraction script or equivalent extraction logic is validated (including sheet mapping, encoding, and target disposition). |
| `data/01_raw/provider_received/yoshitomi/1980-01-01/えひめの山.xlsx` | `.xlsx` | Primary Source | Manual/Original | Python extraction script (missing) | `data/01_raw/source_archives/` | preserved as raw snapshot | Pending | High | No | Retained source snapshot / primary source workbook. Moved into `processed/` as old workflow processed-marker state after extraction/handling. Source evidence for `csv/` (Note: 30 rows with a blank 'No' value are explicitly excluded from the authoritative mountain source set. Authoritative key set is `1..501`). |
| `data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip` | `.zip` | Primary Source | Manual/Original | Intake Skill | `data/01_raw/source_archives/` | preserved as raw snapshot | Pending | High | No | Original export package for GPX files. Historically, the old workflow moved it to `processed/` as a processed-marker state after intake. |
| `processed/*.json` | `.json` | Legacy Artifact | yama-data-pipeline | N/A | N/A | needs decision | Pending | Low | Yes | Generated-looking JSON files (e.g. `mountain_merged.json`) are legacy artifacts requiring audit. They are not valid future output destinations. For schema details, see the legacy schema audit. |
| `yamap/*.md` | `.md` | Source | fetch-yamap-data skill | Humans | `data/01_raw/yamap_markdown/` | preserved as raw snapshot | Pending | High | No | Fetched external source snapshots / YAMAP activity metadata associated with YAMAP activity IDs. Note: Extra YAMAP metadata not referenced by GPX is acceptable and must not be deleted automatically. |
| `yamap/yamap_all_activity_ids.txt` | `.txt` | Metadata / Log | fetch-yamap-data skill | Humans / Skills | `data/01_raw/yamap_metadata/` | preserved as legacy reference | Pending | Low | No | Activity ID index / fetch metadata file. |
| `museum-yama-web/` | `.json` | Web Cache Artifact | yama-data-pipeline | Front-end | `data/08_reporting/web_data/` | needs decision | Pending | Medium | Yes | For `mountains.json`: Currently used as an accumulated provisional list of identified mountains. Schema is temporary/provisional. May contain valuable manual or agent-assisted curation. Must be preserved as legacy evidence, but must not be treated as the final semantic data model. Future structured datasets and resolved mountain waypoint GPX should supersede it. |
| `reverse_geocoding/` | `.json` | Snapshot/Cache | reverse_geocode_points.js | extract_address_from_raw.js | `data/01_raw/reverse_geocoding/` | preserved as raw snapshot | Pending | Medium | No | Reverse geocoding result cache for municipality-level location enrichment. Preserved as raw snapshot, though reuse and downstream formalization logic are still pending and need decision. Derived outputs will go to `data/03_primary/municipalities/` and `data/04_feature/location_enrichment/`. |
| `docs/same_name_*.md`, `docs/missing_coordinates_*.md`, `docs/愛媛県内七山*.md` | `.md` | Curated Reference Source | Human/Agent | Mountain Identity Resolution | `docs/` (Git-tracked) | preserved as legacy reference | Pending | High | No | Human-curated research source / curated reference source for mountain identity resolution and same-name mountain disambiguation. Git-tracked curated research sources; future structured outputs may be derived into `data/04_feature/same_name_resolution/`, `data/04_feature/mountain_identity_evidence/`, and `data/04_feature/summit_identity_candidates/`. |
| `.agents/skills/yama-data-pipeline/test/fixtures/` | `.gpx`, `.csv` | Test Fixtures | Humans/Agents | Unit/Integration Tests | *Stays in test/fixtures* | preserved as legacy reference | N/A | None | No | Skill-specific test data. Kept in place and excluded from main data migration. |

## Data Preservation Principle for Unmatched Records

Do not delete or discard unmatched, extra, partial, or currently unlinked records merely because they do not join cleanly across datasets (GPX, YAMAP, Excel/CSV, reverse geocoding, web cache). Such records should be preserved and reported as coverage differences or `needs decision` items unless an explicit migration decision says otherwise. This principle applies to:
- GPX files without matching Excel/CSV activity rows
- Excel/CSV activity records without matching GPX files
- YAMAP metadata without matching GPX files
- GPX activity IDs without matching YAMAP metadata
- Reverse geocoding records whose source relationship is not yet clear
- `museum-yama-web/mountains.json` entries or fields whose full regeneration is not yet proven

These differences must not be normalized away. The future validation pipeline should report them as coverage categories.

*(Classification Options: migrated, partially migrated, derived only, preserved as legacy reference, preserved as raw snapshot, intentionally discarded, unmigrated gap, needs decision)*

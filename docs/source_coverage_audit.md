# Source Coverage Audit

This document serves as an audit of all top-level data areas in the repository.

**CRITICAL REQUIREMENT:** Any future data migration, schema change, normalization, import, backfill, or storage reorganization MUST first classify all relevant source files and fields. Migrations MUST NOT proceed if any item remains unclassified, "needs decision", or "unmigrated gap".

## Initial Audit Table

| Source Path | Source Type | Current Role | Known Writer/Producer | Known Reader/Consumer | Expected Target Path | Classification | Migration Status | Data Loss Risk | Needs Human Decision | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gpx/raw/` | `.gpx` | Source | Manual Upload / Intake Skill | yama-data-pipeline | TBD | needs decision | Pending | High | Yes | Exact target path pending Kedro layout decision |
| `gpx/annotated/` | `.gpx` | Artifact | yama-data-pipeline (annotate) | Web App | TBD | needs decision | Pending | Low (regenerable) | Yes | Generated waypoint data |
| `gpx/merged-by-year/` | `.gpx` | Artifact | yama-data-pipeline (merge) | Google My Maps | TBD | needs decision | Pending | Low (regenerable) | Yes | Yearly consolidated tracks |
| `csv/` | `.csv` | Intermediate / Operational Input | Python script (missing) | yama-data-pipeline | `data/02_intermediate/activity_logs/csv_extracted/` | derived only | Pending | High | Yes | Extracted from Excel. (provisional) Needs decision on manual edits and missing script. |
| `processed/えひめの山.xlsx` | `.xlsx` | Primary Source | Manual/Original | Python extraction script (missing) | `data/01_raw/source_archives/` | preserved as raw snapshot | Pending | High | No | Original workbook for activity logs |
| `processed/GPXファイル.zip` | `.zip` | Primary Source | Manual/Original | Intake Skill | `data/01_raw/source_archives/` | preserved as raw snapshot | Pending | High | No | Original export package for GPX files |
| `yamap/*.md` | `.md` | Source | fetch-yamap-data skill | Humans | `data/01_raw/yamap_markdown/` | preserved as raw snapshot | Pending | High | No | Markdown activity records from YAMAP |
| `yamap/yamap_all_activity_ids.txt` | `.txt` | Metadata / Log | fetch-yamap-data skill | Humans / Skills | `data/01_raw/yamap_metadata/` | preserved as legacy reference | Pending | Low | No | Reference index/log for YAMAP fetch |
| `museum-yama-web/` | `.json` | Web Cache Artifact | yama-data-pipeline | Front-end | `data/08_reporting/web_data/` | needs decision | Pending | Medium | Yes | Regeneration unproven; may contain manual curation |
| `reverse_geocoding/` | `.json` | Artifact/Source | reverse geocode skills | TBD | TBD | needs decision | Pending | Medium | Yes | Needs mapping to see if pure source or derived |
| `.agents/skills/yama-data-pipeline/test/fixtures/` | `.gpx`, `.csv` | Test Fixtures | Humans/Agents | Unit/Integration Tests | *Stays in test/fixtures* | intentionally discarded | N/A | None | No | (from migration) Skill-specific test data, not project dataset |

*(Classification Options: migrated, partially migrated, derived only, preserved as legacy reference, preserved as raw snapshot, intentionally discarded, unmigrated gap, needs decision)*

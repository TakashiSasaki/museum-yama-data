# Source Coverage Audit

This document serves as an audit of all top-level data areas in the repository.

**CRITICAL REQUIREMENT:** Any future data migration, schema change, normalization, import, backfill, or storage reorganization MUST first classify all relevant source files and fields. Migrations MUST NOT proceed if any item remains unclassified, "needs decision", or "unmigrated gap".

## Initial Audit Table

| Source Path | Source Type | Current Role | Known Writer/Producer | Known Reader/Consumer | Expected Target Path | Classification | Migration Status | Data Loss Risk | Needs Human Decision | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gpx/raw/` | `.gpx` | Source | Manual Upload / Intake Skill | yama-data-pipeline | TBD | needs decision | Pending | High | Yes | Exact target path pending Kedro layout decision |
| `gpx/annotated/` | `.gpx` | Artifact | yama-data-pipeline (annotate) | Web App | TBD | needs decision | Pending | Low (regenerable) | Yes | Generated waypoint data |
| `gpx/merged-by-year/` | `.gpx` | Artifact | yama-data-pipeline (merge) | Google My Maps | TBD | needs decision | Pending | Low (regenerable) | Yes | Yearly consolidated tracks |
| `csv/` | `.csv` | Source | Intake Skill / Manual | yama-data-pipeline | TBD | needs decision | Pending | High | Yes | Primary data source for web app metadata |
| `processed/` | `.zip`, `.xlsx` | Archive | Intake Skill | None (Cold Storage) | TBD | needs decision | Pending | Medium | Yes | Original raw files post-extraction |
| `yamap/` | `.md` | Source | fetch-yamap-data skill | Humans | TBD | needs decision | Pending | High | Yes | Markdown notes/metadata from YAMAP |
| `museum-yama-web/` | `.json` | Artifact | yama-data-pipeline | Front-end | TBD | needs decision | Pending | Low (regenerable) | Yes | Processed JSON datasets |
| `reverse_geocoding/` | `.json` | Artifact/Source | reverse geocode skills | TBD | TBD | needs decision | Pending | Medium | Yes | Needs mapping to see if pure source or derived |

*(Classification Options: migrated, partially migrated, derived only, preserved as legacy reference, preserved as raw snapshot, intentionally discarded, unmigrated gap, needs decision)*

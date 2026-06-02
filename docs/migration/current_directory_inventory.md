# Current Directory Inventory

**Note:** This document is an initial directory-level inventory only. It is not a completed source coverage audit and not yet a source-to-target mapping audit.

## Inventory Table

| Current path | Current role | Classification | Reproducibility role | Pipeline relevance | Movement status | Required before movement | Notes |
|---|---|---|---|---|---|---|---|
| `gpx/raw/` | Source | primary source snapshot | Must be preserved | Input | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `gpx/annotated/` | Legacy artifact | derived legacy evidence | Must be preserved | Legacy output | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `gpx/merged-by-year/` | Legacy artifact | legacy reporting artifact | Must be preserved | Legacy output | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `csv/` | Legacy Input | retained source snapshot | Must be preserved | Input | protected; no movement | Source coverage audit, Source-to-target mapping audit | Excel-derived legacy CSV extracts (Note: 30 rows with a blank 'No' value are explicitly excluded from the authoritative mountain source set), direct script-generated outputs, no manual post-processing. Must not be physically moved yet, nor normalized or regenerated. |
| `processed/` | Source Archive | primary source snapshot | Must be preserved | Archive | protected; no movement | Source coverage audit, Source-to-target mapping audit | Legacy processed-marker archive / retained source snapshot archive. Must not be physically moved yet, nor normalized or regenerated. |
| `processed/えひめの山.xlsx` | Source Workbook | primary source snapshot | Must be preserved | Archive | protected; no movement | Source coverage audit, Source-to-target mapping audit | Primary source workbook for CSV-derived activity records. Retained source snapshot. Must not be physically moved yet. |
| `yamap/` | Fetched Metadata | primary source snapshot | Must be preserved | Input | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `reverse_geocoding/` | Geocoding Cache | retained source snapshot | Must be preserved | Cache | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `museum-yama-web/` | Web Data Cache | provisional legacy cache | Must be preserved | Cache | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `museum-yama-web/mountains.json` | Mountains Data Cache | provisional legacy cache | Must be preserved | Cache | protected; no movement | Source coverage audit, Source-to-target mapping audit | Must not be physically moved yet, nor normalized or regenerated in this task. |
| `docs/` | Canonical Documentation | canonical documentation | Critical | None | no movement planned | N/A | |
| `docs/migration/` | Migration Documentation | canonical documentation | Critical | None | no movement planned | N/A | |
| `conf/` | Configuration | configuration | Critical | Configuration | no movement planned | N/A | |
| `src/museum_yama_data/` | Kedro Pipeline Scaffold | pipeline code/scaffold | Critical | Execution | no movement planned | N/A | |
| `src/museum_yama_data/pipelines/` | Pipeline Scaffold | pipeline code/scaffold | Critical | Execution | no movement planned | N/A | |
| `scripts/` | Tooling Scripts | pipeline code/scaffold | Critical | Execution | no movement planned | N/A | |
| `scripts/build_site.py` | Site Builder Script | pipeline code/scaffold | Critical | Execution | no movement planned | N/A | |
| `site/` | Generated Site | generated presentation artifact | Output only | Output | generated presentation artifact | N/A | |
| `site/assets/` | Site Assets | generated presentation artifact | Output only | Output | generated presentation artifact | N/A | |

## Migration readiness criteria

Physical directory restructuring is strictly blocked until all of the following are true:

- Every current source/artifact path has a documented target disposition.
- Every relevant source field, artifact role, and legacy evidence role is classified.
- No "needs decision" item remains for any path proposed for movement.
- No "unmigrated gap" remains.
- Clone-complete pipeline reproducibility is preserved.
- Git-primary source/retained-artifact availability is preserved.
- No default dependency on DVC remote storage, object storage, local-only paths, or undocumented external caches is introduced.
- All references in docs, config, scripts, generated site pages, and future pipeline metadata are either updated or intentionally preserved.
- Any moved path has a rollback/review strategy.
- Validation commands and expected outputs are defined before movement.
- Legacy evidence is not silently discarded or overwritten.

## Next audit artifact

The next document after this initial inventory should be a source-to-target mapping table:

`docs/migration/source_to_target_mapping_audit.md`

This future document should contain a table with columns like:

- current path
- current role
- source / derived / retained artifact / documentation / config classification
- reproducibility role
- target path candidate
- target disposition
- whether physical movement is proposed
- whether the item remains Git-tracked
- DVC role, if any
- provenance implication
- references that must be updated
- validation method
- rollback strategy
- blocker / needs-decision status
- final disposition classification (migrated, partially migrated, derived only, preserved as legacy reference, preserved as raw snapshot, intentionally discarded, unmigrated gap, needs decision)

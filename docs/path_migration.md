# Path Migration Plan

This document is a **planning record only**. It outlines the proposed mappings from the existing file layout to the future Kedro/DVC-managed structure.

**WARNING:** No data has been moved yet. Actual data movement will require completing the source coverage audit and formalizing this plan.

## Proposed Path Mappings

| Old Path | Proposed New Path | Data Role | Movement Safe Now? | Blocking Questions | Required Validation | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `data/01_raw/as_received/` | `data/01_raw/as_received/` | Source | N/A (Newly Created) | None | None | Minimal new intake path for received raw source files. Not for legacy data migration. |
| `gpx/raw/` | `data/01_raw/gpx/yamap/` | Source | No (Not yet performed) | Needs Kedro setup confirmation | DVC initialization | Raw track files |
| `gpx/annotated/` | `data/99_work/legacy_annotated_gpx/` | Generated | No (Not yet performed) | Pipeline recreation steps | Pipeline validation | Legacy experimental unvalidated annotated GPX files. Preserve as historical work evidence. |
| *future summit-candidate GPX* | `data/08_reporting/gpx/summit_candidates/` | Generated | N/A | Pipeline to be created | Pipeline validation | Future validated pipeline output containing detected summit candidates without authoritative name assignments. |
| *future summit-candidate table* | `data/04_feature/summit_candidates/` | Generated | N/A | Pipeline to be created | Pipeline validation | Future validated tabular pipeline output of summit candidates. |
| *future summit identity candidates* | `data/04_feature/summit_identity_candidates/` | Generated | N/A | Pipeline to be created | Pipeline validation | Future validated pipeline output where candidates are associated with resolved mountain identities. |
| `gpx/merged-by-year/` | `data/08_reporting/gpx/merged_by_year/` | Generated | No (Not yet performed) | Pipeline recreation steps | Pipeline validation | Overview/reporting artifact. Must be validated against raw GPX before being treated as reproducible pipeline output. |
| `csv/` | `data/02_intermediate/activity_logs/csv_extracted/` | Intermediate / Operational Input | No (Not yet performed) | Historical extraction script or equivalent extraction logic must be located/reconstructed and validated; sheet mapping, encoding, and exact extraction behavior must be confirmed. | Audit completion | Direct script-generated extracts from four workbook sheets. No manual edits or post-processing according to user-provided provenance. |
| `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` | `data/01_raw/source_archives/` | Source Archive | Yes (Movement completed) | | None | Primary activity log workbook. Git-primary retained source snapshot; legacy processed-marker archive location. Source for the four-sheet CSV extraction. Will be a DVC dependency candidate. |
| `data/01_raw/as_received/2026-05-12/GPXファイル.zip` | `data/01_raw/source_archives/` | Source Archive | Yes (Movement completed) | | None | Primary GPX export package. Git-primary retained source snapshot; legacy processed-marker archive location. Will be a DVC dependency candidate. |
| `yamap/*.md` | `data/01_raw/yamap_markdown/` | Source | Yes (Movement completed) | None | Checked file counts | Markdown files scraped from YAMAP. Will be a DVC dependency candidate. |
| `yamap/yamap_all_activity_ids.txt` | `data/01_raw/yamap_metadata/` | Metadata / Log | Yes (Movement completed) | None | Checked file existence | Reference index/log for YAMAP fetch |
| `museum-yama-web/` | `data/08_reporting/web_data/` | Generated Cache | No (Not yet performed) | Are these purely regenerable? | Pipeline validation | Target for web app. For `mountains.json`: provisional legacy cache to be superseded by structured feature datasets and waypoint exports. |
| `docs/same_name_*.md`, `docs/missing_coordinates_*.md` etc. | `docs/curated_research/` | Internal Docs / Reference | No (Not yet performed) | Should they remain at root of `docs/` or move to subfolder? | None | Git-tracked curated research sources. |
| *future same-name resolution features* | `data/04_feature/same_name_resolution/` | Generated | N/A | Pipeline to be created | Pipeline validation | Derived from curated research docs and other inputs. |
| *future mountain identity evidence* | `data/04_feature/mountain_identity_evidence/` | Generated | N/A | Pipeline to be created | Pipeline validation | Derived from curated research docs and other inputs. |
| *future resolved mountain waypoint GPX* | `data/08_reporting/gpx/mountain_waypoints/` | Generated | N/A | Pipeline to be created | Pipeline validation | Export representation of a resolved mountain in GPX/XML. |
| `reverse_geocoding/` | `data/01_raw/reverse_geocoding/` | Cache / Snapshot | Yes | What is the schema contract and reuse logic? | Audit completion | Cache for municipality-level enrichment. Derived outputs go to `data/03_primary/` and `data/04_feature/`. |
| `.agents/skills/yama-data-pipeline/test/fixtures/` | *Stays in test/fixtures* | Test Fixtures | Yes | None | None | Skill-specific test data, preserved as legacy reference. Kept in place and excluded from main data migration. |
| `docs/` | *Remains internal documentation* | Internal Docs | Yes | None | None | Stays as Git-tracked docs. Canonical source of truth. |
| `site/` | *Future GitHub Pages site* | Site Source | N/A | No workflow or site created yet. | Workflow test | Future GitHub Pages source directory. Must be updated from or traceable to `docs/`. |
| `site/docs/directory-structure.md` | *Future GitHub Pages site* | Site Source | N/A | No workflow or site created yet. | Workflow test | Planned as the human-facing directory structure explanation. |
| `site/docs/generated/` | *Future GitHub Pages site* | Site Source | N/A | No workflow or site created yet. | Workflow test | Planned for generated summaries derived from `docs/`. |
| `scratch/` | *Disposable work area* | Disposable | N/A | None | None | Already treated as a disposable ignored workspace. |

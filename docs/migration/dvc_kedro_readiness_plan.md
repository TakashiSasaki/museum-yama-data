# DVC and Kedro Readiness Plan

This document explains what conditions must be met before actual Data Version Control (DVC) and Kedro setup and initialization begins in the Yama Museum repository.

*Note: No data movement, initialization, or scaffolding has been executed yet. This plan defines the boundaries of the future initialization task.*

## 1. Prerequisites and Current Readiness

### Completed Planning Documents
The foundational planning policies are in place:
* Repository Site & Structure Policies (`docs/decisions/0001-repository-restructuring-policy.md`, `0002-repository-site-policy.md`)
* Source Coverage Audit (`docs/source_coverage_audit.md`)
* Path Migration Mapping (`docs/path_migration.md`)
* Provenance Findings (`docs/migration/provenance_findings.md`)
* Mountain Identity Resolution Policy (`docs/migration/mountain_identity_resolution_policy.md`)
* Waypoint Collection Output Policy (`docs/migration/waypoint_collection_output_policy.md`)
* Target Data Model (`docs/migration/target_data_model.md`)

Because the documentation is consistent, **initialization of DVC/Kedro scaffolding without data movement has been started.**

### Scaffolding Status (Current)
* **DVC Initialization:** DVC was *not* initialized because the `dvc` executable was unavailable in the environment. No `.dvc/` metadata or `.dvcignore` files were created.
* **DVC Tracking:** No actual data tracking has been performed. The first planned DVC tracking commands have been documented in `docs/migration/dvc_tracking_plan.md`.
* **Kedro Scaffolding:** Minimal placeholder files and a Python package structure (`src/museum_yama_data/`) have been added. `conf/base/catalog.yml` was populated with placeholders mapping to current legacy paths.
* **Data Movement:** **No data movement, deletion, or modification was performed.** The repository remains physically in its legacy layout.

### Blocking Items (Needs Decision)
There remain `needs decision` items in `docs/source_coverage_audit.md` (such as `museum-yama-web/mountains.json` and the legacy `csv/` extraction outputs).

* **Impact on DVC Initialization:** These items **do not** block the initialization of the DVC tracking system or the Kedro skeleton.
* **Impact on Data Movement:** These items **do** block the physical migration and architectural rewriting of those specific datasets. The physical data files must not be moved or replaced until their exact status and role in the target model is finalized.

## 2. Proposed First DVC Scope

- DVC initialization may still be useful later, but the immediate goal is not to move data out of Git.
- The next DVC use should be “pipeline metadata mode” rather than raw-data tracking mode.
- Raw/source data will initially remain Git-primary.
- DVC stage definitions, if introduced later, should use Git-tracked raw data as "deps".
- Generated outputs may be Git-tracked, DVC-tracked, or both only after explicit policy decision per path.
- Git LFS is not part of the current plan.
- The repository remains physically in legacy layout until a separate audited migration task.

The first actual DVC tracking (if any) should strictly cover immutable raw/source archives and snapshot data as pipeline dependencies. DVC initialization will track these assets in their *current* locations before any directory restructuring occurs.

Target scope for the first DVC run (as dependencies):
```text
processed/えひめの山.xlsx
processed/GPXファイル.zip
gpx/raw/
yamap/*.md
yamap/yamap_all_activity_ids.txt
reverse_geocoding/
```

## 3. Proposed First Kedro Scope

The first Kedro task will build the pipeline skeleton.

Target scope for the first Kedro run:
* Initialize the standard Kedro project skeleton.
* Define `catalog.yml` names mapping to the current paths of the raw datasets.
* Create placeholder pipeline structures.
* **Crucial limitation:** Do not rewrite processing logic (e.g., GPX parsing, annotating, reverse geocoding) during this skeleton phase. The logic rewrite is a separate, later task.

## 4. Strict Constraints (What Must Not Be Done Yet)

Until the initialization phase is explicitly triggered, the following actions remain prohibited:

* Do not run `dvc init`.
* Do not run `kedro new`.
* Do not move, rename, delete, or rewrite any existing data files.
* Do not implement the `data/` directory layout.

## 5. Next Recommended Task

The repository is now ready for a later task to perform pipeline implementation.
* Ensure DVC is installed when needed for pipeline stage definitions.
* Run `dvc init` when appropriate.
* DVC should be used for pipeline stage definitions and dependency tracking, but not for moving primary data out of Git.
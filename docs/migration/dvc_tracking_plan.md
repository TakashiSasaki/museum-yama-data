# DVC Dependency Candidate Plan

This document defines the first planned DVC stage dependency scope.

**IMPORTANT NOTE:**
- **DVC Initialization:** DVC was *not* initialized.
- **Data Migration:** Git-primary source snapshots may later be referenced as DVC stage dependencies *before* any physical directory reorganization. Physical data movement remains blocked until audit and path migration rules permit it.
- **Current Status:** No actual DVC metadata generation or data movement has been performed yet. The commands and dependencies below are for future execution.
- **Git LFS:** Current data sizes do not require Git LFS. Git LFS is intentionally not used.

## Clone-Complete Policy

* This repository is intended to be clone-complete. See `docs/migration/storage_reproducibility_policy.md`.
* A fresh Git clone should contain primary data and retained processed artifacts needed for normal use.
* Git LFS is intentionally not used.
* Primary data should remain ordinary Git-tracked files unless a future explicit decision changes this.
* Retained processed artifacts may also remain Git-tracked when they are useful without the processing environment.
* DVC must not be used by default to remove primary data or retained artifacts from Git.
* `dvc add` must not be run on raw/source paths by default.
* DVC, if used, should initially be used for:
  * pipeline stage metadata
  * dependency declarations
  * reproducibility checks
  * optional generated-output management only after explicit decision
* No DVC remote is required for ordinary repository use.

## Dependency Exceptions & Caveats
* `csv/` remains marked as `needs decision`. According to user-provided provenance, there were no manual edits or post-processing; however, it should not be treated as a clean reproducible intermediate until the historical extraction script or equivalent extraction logic is validated.
* `museum-yama-web/mountains.json` remains marked as `needs decision`. It should not be treated as the final semantic data model.

## Initial Git-Primary Dependency Candidates for DVC Stages

The current goal is to document DVC roles as dependency candidates, *not* as DVC-tracked outputs and *not* as the executable stage itself. Dependency candidates listed below are not automatically DVC-tracked outputs.
For the conceptual first executable DVC-light stage that will consume these dependencies, please see `docs/migration/dvc_first_stage_plan.md`.
For the policy on how generated outputs are placed, see `docs/migration/generated_output_path_policy.md`.

This document does not authorize `dvc add` on raw/source data. The listed paths remain Git-primary. No DVC remote is required for ordinary repository use. No data migration or data movement has occurred.

### 1. `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
* **Reason for dependency declaration:** It is the primary activity workbook archive.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`
* **Future conceptual target path:** `data/01_raw/source_archives/`
* **Timing:** Should be added as a dependency *before* physical migration.
* **Blocks:** No `needs decision` items block adding this as a dependency.

### 2. `data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip`
* **Reason for dependency declaration:** It is the primary GPX export package archive.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `data/01_raw/provider_received/yoshitomi/2026-05-12/GPXファイル.zip`
* **Future conceptual target path:** `data/01_raw/source_archives/`
* **Timing:** Should be added as a dependency *before* physical migration.
* **Blocks:** No `needs decision` items block adding this as a dependency.

### 3. `gpx/raw/`
* **Reason for dependency declaration:** Immutable source data containing individual extracted YAMAP GPX track files.
* **Source coverage audit classification:** needs decision (Note: the decision applies to its exact target path, not its status as immutable raw data, which is confirmed).
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `gpx/raw/`
* **Future conceptual target path:** `data/01_raw/gpx/yamap/`
* **Timing:** Should be added as a dependency *before* physical migration.
* **Blocks:** While its final target path needs a decision, adding the immutable source folder as a dependency in place is safe.

### 4. `yamap/*.md` (All Yamap Markdown Files)
* **Reason for dependency declaration:** Fetched external source snapshots (activity metadata).
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `yamap/*.md` (or the directory itself, depending on tracking granularity preference).
* **Future conceptual target path:** `data/01_raw/yamap_markdown/`
* **Timing:** Should be added as a dependency *before* physical migration.
* **Blocks:** No `needs decision` items block adding this as a dependency.

### 5. `yamap/yamap_all_activity_ids.txt`
* **Reason for dependency declaration:** Activity ID index and fetch metadata file.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `yamap/yamap_all_activity_ids.txt`
* **Future conceptual target path:** `data/01_raw/yamap_metadata/`
* **Timing:** Should be added as a dependency *before* physical migration.
* **Blocks:** No `needs decision` items block adding this as a dependency.

  *(Note: Might be declared as a dependency as part of the `yamap/` directory depending on execution).*

### 6. `reverse_geocoding/`
* **Reason for dependency declaration:** Raw cache and snapshots for municipality-level location enrichment.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `reverse_geocoding/`
* **Future conceptual target path:** `data/01_raw/reverse_geocoding/`
* **Timing:** Should be added as a dependency *before* physical migration.
* **Blocks:** The future schema/reuse logic needs decision, but adding the current raw snapshot cache as a dependency is unblocked.

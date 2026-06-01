# DVC Tracking Plan

This document defines the first planned DVC tracking scope.

**IMPORTANT NOTE:**
- **DVC Initialization:** DVC was *not* initialized because the executable was unavailable in the current environment.
- **Data Migration:** DVC tracking of existing immutable source snapshots is planned *before* any physical directory reorganization. Physical data movement remains blocked until audit and path migration rules permit it.
- **Current Status:** No actual DVC tracking or data movement has been performed yet. The commands below are for future execution.

## Clone-Complete Policy

* This repository is intended to be clone-complete.
* A fresh Git clone should contain primary data and retained processed artifacts needed for normal use.
* Git LFS is intentionally not used.
* Primary data should remain ordinary Git-tracked files unless a future explicit decision changes this.
* Retained processed artifacts may also remain Git-tracked when they are useful without the processing environment.
* DVC must not be used by default to remove primary data or retained artifacts from Git.
* `dvc add` must not be run on raw/source paths by default.
* DVC, if used, should initially be used for:
  * pipeline stage metadata
  * dependency tracking
  * reproducibility checks
  * optional generated-output management only after explicit decision
* DVC remote configuration is optional and should not be required for ordinary repository use at this stage.

## Tracking Exceptions & Caveats
* `csv/` remains marked as `needs decision`. It should not be treated as a clean reproducible intermediate until manual edit status and the missing extraction script are resolved.
* `museum-yama-web/mountains.json` remains marked as `needs decision`. It should not be treated as the final semantic data model.

## Initial DVC Tracking Candidates

The current goal is to document DVC roles as dependency candidates. DVC must NOT be used to move this data out of Git.

### 1. `processed/えひめの山.xlsx`
* **Reason for tracking:** It is the primary activity workbook archive.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `processed/えひめの山.xlsx`
* **Future conceptual target path:** `data/01_raw/source_archives/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking of this file.

### 2. `processed/GPXファイル.zip`
* **Reason for tracking:** It is the primary GPX export package archive.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `processed/GPXファイル.zip`
* **Future conceptual target path:** `data/01_raw/source_archives/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking of this file.

### 3. `gpx/raw/`
* **Reason for tracking:** Immutable source data containing individual extracted YAMAP GPX track files.
* **Source coverage audit classification:** needs decision (Note: the decision applies to its exact target path, not its status as immutable raw data, which is confirmed).
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `gpx/raw/`
* **Future conceptual target path:** `data/01_raw/gpx/yamap/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** While its final target path needs a decision, tracking the immutable source folder in place is safe.

### 4. `yamap/*.md` (All Yamap Markdown Files)
* **Reason for tracking:** Fetched external source snapshots (activity metadata).
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `yamap/*.md` (or the directory itself, depending on tracking granularity preference).
* **Future conceptual target path:** `data/01_raw/yamap_markdown/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking.

### 5. `yamap/yamap_all_activity_ids.txt`
* **Reason for tracking:** Activity ID index and fetch metadata file.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `yamap/yamap_all_activity_ids.txt`
* **Future conceptual target path:** `data/01_raw/yamap_metadata/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking.

  *(Note: Might be tracked as part of the `yamap/` directory depending on execution).*

### 6. `reverse_geocoding/`
* **Reason for tracking:** Raw cache and snapshots for municipality-level location enrichment.
* **Source coverage audit classification:** Git-primary source/snapshot data
* **DVC role:** dependency candidate, not DVC-tracked output
* **Current path:** `reverse_geocoding/`
* **Future conceptual target path:** `data/01_raw/reverse_geocoding/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** The future schema/reuse logic needs decision, but tracking the current raw snapshot cache is unblocked.

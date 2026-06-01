# DVC Tracking Plan

This document defines the first planned DVC tracking scope.

**IMPORTANT NOTE:**
- **DVC Initialization:** DVC was *not* initialized because the executable was unavailable in the current environment.
- **Data Migration:** DVC tracking of existing immutable source snapshots is planned *before* any physical directory reorganization. Physical data movement remains blocked until audit and path migration rules permit it.
- **Current Status:** No actual DVC tracking or data movement has been performed yet. The commands below are for future execution.

## Tracking Exceptions & Caveats
* `csv/` remains marked as `needs decision`. It should not be treated as a clean reproducible intermediate until manual edit status and the missing extraction script are resolved.
* `museum-yama-web/mountains.json` remains marked as `needs decision`. It should not be treated as the final semantic data model.

## Initial DVC Tracking Candidates

The goal is to track the immutable raw and primary source datasets in their current physical locations.

### 1. `processed/えひめの山.xlsx`
* **Reason for tracking:** It is the primary activity workbook archive.
* **Source coverage audit classification:** preserved as raw snapshot
* **Current path:** `processed/えひめの山.xlsx`
* **Future conceptual target path:** `data/01_raw/source_archives/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking of this file.
* **Expected command (do not run yet):**
  ```sh
  dvc add processed/えひめの山.xlsx
  ```

### 2. `processed/GPXファイル.zip`
* **Reason for tracking:** It is the primary GPX export package archive.
* **Source coverage audit classification:** preserved as raw snapshot
* **Current path:** `processed/GPXファイル.zip`
* **Future conceptual target path:** `data/01_raw/source_archives/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking of this file.
* **Expected command (do not run yet):**
  ```sh
  dvc add processed/GPXファイル.zip
  ```

### 3. `gpx/raw/`
* **Reason for tracking:** Immutable source data containing individual extracted YAMAP GPX track files.
* **Source coverage audit classification:** needs decision (Note: the decision applies to its exact target path, not its status as immutable raw data, which is confirmed).
* **Current path:** `gpx/raw/`
* **Future conceptual target path:** `data/01_raw/gpx/yamap/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** While its final target path needs a decision, tracking the immutable source folder in place is safe.
* **Expected command (do not run yet):**
  ```sh
  dvc add gpx/raw/
  ```

### 4. `yamap/*.md` (All Yamap Markdown Files)
* **Reason for tracking:** Fetched external source snapshots (activity metadata).
* **Source coverage audit classification:** preserved as raw snapshot
* **Current path:** `yamap/*.md` (or the directory itself, depending on tracking granularity preference).
* **Future conceptual target path:** `data/01_raw/yamap_markdown/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking.
* **Expected command (do not run yet):**
  ```sh
  dvc add yamap/
  ```

### 5. `yamap/yamap_all_activity_ids.txt`
* **Reason for tracking:** Activity ID index and fetch metadata file.
* **Source coverage audit classification:** preserved as legacy reference
* **Current path:** `yamap/yamap_all_activity_ids.txt`
* **Future conceptual target path:** `data/01_raw/yamap_metadata/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** No `needs decision` items block tracking.
* **Expected command (do not run yet):**
  ```sh
  dvc add yamap/yamap_all_activity_ids.txt
  ```
  *(Note: Might be tracked as part of the `yamap/` directory depending on execution).*

### 6. `reverse_geocoding/`
* **Reason for tracking:** Raw cache and snapshots for municipality-level location enrichment.
* **Source coverage audit classification:** preserved as raw snapshot
* **Current path:** `reverse_geocoding/`
* **Future conceptual target path:** `data/01_raw/reverse_geocoding/`
* **Timing:** Should be tracked *before* physical migration.
* **Blocks:** The future schema/reuse logic needs decision, but tracking the current raw snapshot cache is unblocked.
* **Expected command (do not run yet):**
  ```sh
  dvc add reverse_geocoding/
  ```

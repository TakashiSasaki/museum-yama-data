# Website and Directory Improvement Roadmap

## 1. Purpose

The project is entering a phase of improvement across two related but distinct areas: the generated public website and the repository's data directory structure.

These are separated into two distinct tracks because their risk profiles differ significantly. Website improvements represent low-risk, presentation-layer changes, while directory restructuring involves high-risk data migration, normalization, imports, backfills, or storage reorganization that must not compromise data provenance or reproducibility.

## 2. Clone-Complete Pipeline Reproducibility Requirement

The most critical requirement of this project is to maintain a clone-complete, Git-primary, and DVC-light architecture.

A fresh clone of the repository MUST contain the source data snapshots, retained artifacts, pipeline code, configuration, documentation, and provenance/audit information needed to understand, rerun, and validate the same data pipeline, subject only to ordinary software dependency installation.

The directory restructuring track is not a cosmetic cleanup. It is a fundamental structure improvement intended to preserve or improve reproducibility, provenance clarity, and auditability.

## 3. Website improvement track

This track focuses on low-risk, incremental improvements to the presentation layer. Work in this track should primarily touch:
- `scripts/build_site.py`
- `site/`
- `site/assets/`
- relevant canonical docs/config that feed the generated site

Website improvements should not silently change canonical data or source datasets. Work in this track includes:
- PWA polish (manifest, icons, caching)
- Visual design refinements
- Navigation improvements
- Data catalog page improvements
- Pipeline/status page improvements
- Provenance/lineage visualization
- Decisions/status dashboard
- Better indication that `site/` is generated presentation output
- Ensuring raw/private/full data contents are not published

### Pipeline graph visualization
A future generated site page will visually represent the intended data pipeline as a graph structure. This will make it easier to understand data lineage, transformations, and the relationships between different processing stages without needing to parse the codebase directly.

## 4. Directory-structure improvement track

This is a high-risk track involving migration, normalization, imports, backfills, or storage reorganization.

**No physical data movement may occur until a comprehensive source coverage audit and source-to-target mapping audit are complete.**

The audit must classify every source path and relevant field as one of:
- migrated
- partially migrated
- derived only
- preserved as legacy reference
- preserved as raw snapshot
- intentionally discarded
- unmigrated gap
- needs decision

Any unclassified field, needs-decision item, or unmigrated gap blocks implementation of data movement.

## 5. Current protected directories

The following directories are strictly protected and MUST NOT be deleted, moved, renamed, overwritten, normalized, regenerated, or format-converted during this roadmap task:
- `gpx/`
- `csv/`
- `processed/`
- `data/01_raw/yamap_markdown/`
- `data/01_raw/yamap_metadata/`
- `data/01_raw/reverse_geocoding/`
- `museum-yama-web/`

Additionally, `museum-yama-web/mountains.json` must not be modified.

## 6. Proposed target-structure planning

Implementation of a new directory structure is deferred. Future proposals for a new structure must contain detailed planning for each element, including:
- current path
- current role
- source/derived/artifact classification
- target path candidate
- whether physical movement is proposed
- whether legacy preservation is required
- provenance implications
- validation method
- blocker status
- decision owner or decision note

The first safe step in the directory-structure track may be defining future output locations for new pipeline products, rather than immediately moving existing data.

## 7. Interaction between the two tracks

The website serves as a valuable tool to expose the ongoing work in the repository, including:
- current repository structure
- planned target structure
- migration blockers
- needs-decision items
- lineage/provenance model
- data catalog summaries

However, the website must not become the canonical source of truth. The canonical source remains in `docs/`, `conf/`, `src/`, and relevant policy files.

## 8. Suggested phased plan

*   **Phase 1:** Document roadmap and risk separation.
*   **Phase 2:** Improve website pages that summarize current state and pending decisions.
*   **Phase 3:** Create current-directory audit and source inventory.
*   **Phase 4:** Draft target directory proposal.
*   **Phase 5:** Create source-to-target mapping audit.
*   **Phase 6:** Only after audit completion, consider small, reversible, reviewed migration steps.

## 9. Explicit non-goals for this task

This current roadmap definition task explicitly MUST NOT:
- move files
- rename directories
- normalize data
- regenerate GPX/CSV/YAMAP/reverse-geocoding artifacts
- convert `museum-yama-web/mountains.json`
- implement Kedro pipelines
- run DVC
- run legacy yama-data-pipeline commands

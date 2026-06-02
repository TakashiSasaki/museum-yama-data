# Storage and Reproducibility Policy

## Purpose

This document serves as the compact canonical reference for storage and reproducibility policy in this repository. It defines how data, artifacts, and pipeline components are stored and tracked to ensure safe, auditable, and reproducible workflows.

## Clone-Complete Reproducibility

* A fresh Git clone should contain primary/source snapshots, retained artifacts, documentation, configuration, and pipeline code required to understand, rerun, and validate the pipeline.
* **Agent Skill Portability Policy (Conceptual):** To maintain reproducibility and support DVC-light pipeline execution, reusable data-processing tools should be implemented as agent skills in `.agents/skills/`. Portable skill commands must accept explicit input/output paths (e.g., `--input`, `--out`) and avoid hardcoded repository root paths. The `scripts/` directory is reserved for repository-specific audits, site generation, or one-off tasks. Pipeline-relevant logic from `scripts/` should eventually be promoted into portable agent skills.
* No ordinary user should need an unconfigured DVC remote, object store, private local path, Git LFS object download, or undocumented cache to understand or reproduce the intended pipeline state.

## Git-Primary Storage

* Raw/source data and retained legacy artifacts remain ordinary Git-tracked files by default.
* Current data sizes do not require Git LFS.

## Git LFS Policy

* Git LFS is intentionally not used.
* Do not run `git lfs install`, `git lfs track`, or introduce `.gitattributes` LFS filters.
* Reconsidering Git LFS requires a future explicit policy decision and a reproducibility impact assessment.

## DVC-Light Policy

* DVC may later be used for `dvc.yaml`, stage metadata, dependency declarations, `dvc.lock`, and reproducibility checks.
* DVC stage dependencies may refer to Git-tracked raw/source paths.
* DVC remote storage must not be required for ordinary repository use at this stage.
* `dvc add` must not be run on raw/source paths or retained-artifact paths unless explicitly approved after audit.
* DVC must not silently replace Git storage for source snapshots or retained artifacts.
* Note: The `processed/` directory encodes legacy workflow state (it acts as a legacy processed-marker archive and retained source snapshot archive) and should not be confused with a future target raw-data layout.

## DVC Permitted Uses

* Pipeline stage metadata and definition (`dvc.yaml`).
* Dependency declarations (using Git-tracked files as inputs).
* Reproducibility checks.
* Optional generated-output management (only after an explicit per-path decision is documented and approved).

## DVC Prohibited Uses

* Do not run `dvc add` on raw/source paths or retained-artifact paths by default.
* Do not use DVC to silently replace Git storage for source snapshots or retained artifacts.
* Do not configure a DVC remote that is required for ordinary repository use.

## Generated Outputs Policy

* Generated outputs require an explicit per-path decision regarding their tracking mode.
* No output should be moved out of Git merely because DVC exists.
* The formal generated-output paths and tracking modes are defined in `docs/migration/generated_output_path_policy.md` and related plans such as `docs/migration/dvc_first_stage_plan.md`.
* `artifacts/generated/` is the recommended interim root for formal generated pipeline outputs before final `data/` layout migration.
* Documentation preview artifacts may remain under `docs/migration/`.
* Source data and retained artifacts remain Git-primary. DVC-light does not imply moving source data into DVC.

For clarity, differentiate between the following concepts when making output tracking decisions:
* **Git-tracked source data:** Immutable primary input data, committed directly to Git.
* **Git-primary retained artifacts:** Historically generated legacy artifacts preserved in Git as evidence or for reuse.
* **DVC stage dependencies:** Inputs to a DVC stage, often Git-tracked source data or retained artifacts.
* **DVC-tracked generated outputs:** Formal outputs of a DVC stage, managed by DVC, generating `.dvc` or lock metadata (not necessarily Git-tracked).
* **Git-tracked generated preview/audit artifacts:** Small, conceptually generated outputs explicitly committed to Git for human review and auditing (e.g., `docs/migration/summit_candidates_skill_preview.csv`), not acting as the canonical DVC stage output.
* **Regenerated-on-demand outputs:** Data generated dynamically by the pipeline and deliberately ignored by both Git and DVC caches.

## Directory Restructuring Gate

* Physical movement of data or directories remains blocked until the source coverage audit and source-to-target mapping audit are complete.
* Any proposed movement or restructuring must preserve clone-complete reproducibility.

## Current Status

* The repository uses standard Git for all storage.
* Git LFS is not used.
* DVC is not currently tracking large data or raw/source files.
* Physical restructuring is pending audit completion.

## Terminology

* **clone-complete**: A repository state where a standard `git clone` provides all necessary data, configuration, code, and documentation to understand, run, and validate the pipeline without requiring extra object stores or untracked caches.
* **Git-primary**: The policy of keeping data, including raw/source data and retained artifacts, committed directly to Git rather than offloaded to another storage backend.
* **DVC-light**: Using DVC purely for pipeline metadata, stage definitions, and reproducibility checks, rather than as a bulk storage replacement for Git.
* **raw/source data**: The original, immutable input data entering the repository (e.g., GPX files, Excel workbooks, fetched metadata).
* **source snapshot**: A captured point-in-time state of external or raw data, preserved exactly as it was acquired.
* **retained artifact**: A historically generated or derived file that is preserved as evidence or for reuse.
* **legacy artifact**: An older retained artifact from previous pipeline iterations or manual processes that must be preserved until fully replaced or deprecated.
* **generated output**: New data artifacts produced by running the data pipeline.
* **DVC stage dependency**: An input file or directory declared in `dvc.yaml` that a pipeline stage requires. This may be (and often is) an ordinary Git-tracked file.
* **DVC-tracked output**: An output artifact explicitly managed by DVC (using `dvc add` or stage outputs), resulting in `.dvc` or lock metadata, and potentially stored in a DVC remote cache rather than directly in Git. In this repository, raw/source data and retained artifacts should remain Git-primary and should not become DVC-tracked outputs by default.
* **DVC remote**: An external storage location (like S3 or a shared directory) used by DVC to store large tracked files. Not required for ordinary use here.
* **Git LFS**: Git Large File Storage, an extension to handle large files. Intentionally not used in this repository.
* **source coverage audit**: A comprehensive review identifying and classifying all existing source data to ensure nothing is lost during migration.
* **source-to-target mapping audit**: A detailed plan mapping every current data path to its future location in a new directory structure.
* **needs decision**: A classification for data or artifacts where the migration path, retention policy, or schema is currently unresolved and blocks physical restructuring.
* **unmigrated gap**: A part of the legacy pipeline or data that has not yet been accounted for in the target data model or migration plan.
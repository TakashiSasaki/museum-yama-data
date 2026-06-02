# Generated Output Path Policy

## Purpose

This document defines the recommended policy for placing generated outputs before the final physical `data/` directory layout is fully implemented. It clarifies the distinction between source data, retained legacy artifacts, documentation preview artifacts, and future generated pipeline outputs.

## Path Classifications

*   **Source Data Paths:** (e.g., `gpx/raw/`, `yamap/*.md`, `processed/えひめの山.xlsx`)
    *   Remain Git-primary. Do not modify or run `dvc add` on these paths by default.
*   **Retained Legacy Artifacts:** (e.g., `processed/GPXファイル.zip`, `csv/`)
    *   Remain Git-primary. Preserved as historical evidence or for reuse.
*   **Documentation/Audit Preview Artifacts:** (e.g., `docs/migration/summit_candidates_skill_preview.csv`)
    *   Small, conceptually generated outputs explicitly committed to Git for human review and auditing.
    *   **Crucially:** `docs/migration/` should not be used as the canonical long-term generated-output directory.
*   **Disposable Scratch Outputs:** (e.g., `scratch/` or similar ignored temporary locations)
    *   May be used for disposable local experiments.
*   **Formal Generated Pipeline Outputs:** (e.g., outputs of a DVC-light stage)
    *   Must use a dedicated generated-output root distinct from source data and documentation.

## Recommended Generated-Output Root: `artifacts/generated/`

The recommended interim root for formal generated pipeline outputs is **`artifacts/generated/`**.

### Rationale:
*   It avoids overloading the `docs/migration/` directory, which is reserved for planning, audits, and documentation.
*   It avoids prematurely implementing the future `data/` layout before all migration path mapping audits are complete.
*   It clearly communicates that the contents are generated artifacts and not primary source data.
*   It can later be seamlessly reconciled with or migrated to the final `data/` layout (e.g., `data/08_reporting/`, `data/04_feature/`) once migration decisions are complete.
*   The contents can be Git-ignored, DVC-tracked, Git-tracked, or regenerated-on-demand based on an explicit path decision.

## Specific Output Path Example: First Executable DVC-light Stage

The first executable DVC-light stage candidate (see `docs/migration/dvc_first_stage_plan.md`) uses the `detect-candidates` skill.
*   **Recommended Formal Output Path:** `artifacts/generated/summit_candidates/summit_candidates.csv`
*   **Documentation Preview Artifact:** `docs/migration/summit_candidates_skill_preview.csv` (remains committed for human inspection)

*Note: The physical final `data/` layout remains a separate future migration decision. Do not implement the `data/` layout or move existing files based on this policy.*

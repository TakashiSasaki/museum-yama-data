# Documentation Consistency Audit

## 1. Context

- **Branch checked**: `museum-yama-data`
- **HEAD commit checked**: `627c379 Stage 22-24: Grounding-assisted reprocessing of mountain-summit candidate pipeline`

## 2. Files Inspected

*   `docs/migration/mountain_summit_coordinate_resolution_plan.md`
*   `docs/migration/target_data_model.md`
*   `docs/migration/source_to_target_mapping_audit.md`
*   `docs/source_coverage_audit.md`
*   `docs/path_migration.md`
*   `docs/migration/dvc_tracking_plan.md`
*   `docs/migration/dvc_first_stage_plan.md`
*   `docs/migration/generated_output_path_policy.md`
*   `docs/migration/obsolete_review_artifact_cleanup_report.md`
*   `AGENTS.md`
*   `.agents/skills/yama-data-pipeline/SKILL.md`
*   `docs/migration/current_processing_state_audit.md`

## 3. Search Patterns Used

```sh
grep -RIn \
  -e 'provider_received/yoshitomi' \
  -e 'data/01_raw/provider_received' \
  -e 'gpx/raw' \
  -e 'yamap/\*.md' \
  -e 'yamap/' \
  -e 'review_packets/' \
  -e 'review_decisions_template.csv' \
  -e 'compact_review_queue_top1.csv' \
  -e 'compact_review_queue_top3.csv' \
  -e 'compact_review_queue_conflicts.csv' \
  -e 'No physical directories or data files' \
  -e 'No data has been moved yet' \
  -e 'artifacts/generated' \
  -e 'Current Review Entry Point' \
  -e 'location_stability_review_packets/index.md' \
  -e 'generate-grounding-assisted' \
  -e 'normalize-grounding-responses' \
  docs AGENTS.md .agents/skills/yama-data-pipeline/SKILL.md
```

## 4. Summary of Current Implemented Pipeline State

The data processing pipeline has executed up to **Stage 24**.

## 5. Current Review-Entry Ambiguity

*   **Stage 21**: Reduced review-required mountains to 280 using late grounding projection, based on the full 11,372-link candidate universe.
*   **Stage 22–24**: Reduced the candidate-link volume to 6,079 (Stage 23) but Stage 24 currently leaves 530 mountains review-required.
*   **Stage 25**: This is planned / the next intended improvement. It aims to combine the strengths of Stage 21 (review burden reduction) with Stage 23 (reduced candidate universe). It is not yet implemented in the current HEAD.

## 6. Stale or Inconsistent Documents Identified and Resolved

### `docs/migration/mountain_summit_coordinate_resolution_plan.md`
*   **Stale Claim**: Old review artifacts (`compact_review_queue_top1.csv`, `review_packets/`, etc.) were listed as expected outputs of current stages.
*   **Why Stale**: Stage 17/18/19 location-stability artifacts and Stage 22-24 grounding artifacts superseded the older Stage 6c/Stage 8 Nominatim-based ones.
*   **Correction**: Retained Stage 1-10 as historical/conceptual. Added a new section for the explicitly numbered implemented stages (Stage 18-24) and planned Stage 25.

### `docs/migration/target_data_model.md`
*   **Stale Claim**: "No physical directories or data files for this model have been created yet."
*   **Why Stale**: The `data/` layers are populated with intermediate, feature, and reporting files.
*   **Correction**: Updated the notice to explain it's a logical model with physical data now existing. Added logical targets for grounding features.

### `docs/migration/source_to_target_mapping_audit.md`
*   **Stale Claim**: Read as a global authoritative map with unresolved items blocking all work.
*   **Why Stale**: Stage-specific audits have been completed.
*   **Correction**: Added a prominent header noting it is a global physical template and does not supersede stage-specific audits like `grounding_assisted_reprocessing_source_mapping.md`.

### `docs/source_coverage_audit.md`
*   **Stale Claim**: Retained older paths like `provider_received/yoshitomi`.
*   **Why Stale**: Migration to the simplified `as_received` path has occurred.
*   **Correction**: Added a "Current status note" pointing to `as_received_path_migration_audit.md`.

### `docs/path_migration.md`
*   **Stale Claim**: "No data has been moved yet."
*   **Why Stale**: Actual physical data movement to `as_received` layout has occurred.
*   **Correction**: Added a prominent supersession note and treated the table explicitly as historical/superseded planning.

### `docs/migration/dvc_tracking_plan.md`
*   **Stale Claim**: Used `provider_received/yoshitomi/` paths for dependencies.
*   **Why Stale**: New `as_received` and `data/01_raw/gpx/2026-05-12/` paths exist.
*   **Correction**: Updated paths where the latest repository state confirms the shift.

### `docs/migration/dvc_first_stage_plan.md`
*   **Stale Claim**: Proposed execution command used `gpx/raw`.
*   **Why Stale**: Candidate inputs should come from the simplified GPX target paths.
*   **Correction**: Added a note that the historical proposal used `gpx/raw` and future efforts should use current target paths.

### `docs/migration/generated_output_path_policy.md`
*   **Stale Claim**: Suggested `artifacts/generated/` is the formal generated-output path.
*   **Why Stale**: Executed pipelines already use Git-tracked outputs under the `data/` directory.
*   **Correction**: Clarified that `artifacts/generated/` is a future formal DVC-light generated-output recommendation, and does not invalidate existing `data/` layer outputs.

### `docs/migration/obsolete_review_artifact_cleanup_report.md`
*   **Stale Claim**: Pointed to location-stability review packets as the absolute "Current Review Entry Point".
*   **Why Stale**: Stage 24 has produced grounding-assisted artifacts.
*   **Correction**: Added a historical note indicating this was current at the time of cleanup.

### `AGENTS.md`
*   **Stale Claim**: Listed only older pipeline commands (`intake`, `merge`, `annotate`, `validate`).
*   **Why Stale**: The CLI contains many more stages (Stage 10-24).
*   **Correction**: Added a pointer to `SKILL.md` and `cli.js`, along with a list of high-level command categories.

### `.agents/skills/yama-data-pipeline/SKILL.md`
*   **Stale Claim**: Missing documentation for Stage 21 and Stages 22-24 commands.
*   **Why Stale**: Pipeline was extended but skill docs lagged.
*   **Correction**: Added sections for `refine-mountain-summit-candidate-links-by-grounding`, `normalize-grounding-responses`, `generate-grounding-assisted-summit-candidate-links`, and `generate-grounding-assisted-review-queues`.

### `docs/migration/current_processing_state_audit.md`
*   **Stale Claim**: Didn't clearly describe the difference in review entry point usefulness between Stage 21 and Stage 24.
*   **Why Stale**: Stage 24 actually increased the review-required mountain count back to 530 compared to Stage 21's 280.
*   **Correction**: Added a "Current Interpretation" section explaining this dynamic and pointing to the planned Stage 25.


## 7. Remaining Intentional Historical References

The following file paths still appear in text searches, but they have been reviewed and classified as either intentional historical notes, raw skill arguments, or deliberately preserved legacy state:

*   **`gpx/raw`**: Retained in `AGENTS.md` and `SKILL.md` to document the legacy source requirements of `merge` and `annotate`. Retained in audits to reflect its historical/needs-decision status.
*   **`data/01_raw/provider_received`**: Retained in policies and skill tests (e.g., `validate-provider-received`) as the accepted intake directory for *future* provider drops.
*   **`review_decisions_template.csv` / `review_packets/`**: Retained in structural mapping documentation (`mountain_summit_candidate_review_packet_mapping.md`) and marked as "Historical/Superseded" in resolution plans.
*   **`compact_review_queue_top1.csv`**: Retained in reports documenting its cleanup (`obsolete_review_artifact_cleanup_report.md`).

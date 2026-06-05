# Current Processing State Audit

This document inventories and verifies the current execution state of the data-processing steps in this repository.

## DVC Setup Audit
* **Does `.dvc/` exist?**: `False`
* **Does root `dvc.yaml` exist?**: `False`
* **Does root `params.yaml` exist?**: `False`
* **Does root `dvc.lock` exist?**: `False`

*DVC tracking is not yet active. Any DVC pipeline descriptions remain proposed-only.*

---

## Stage-Specific Inventories & Statuses

### 1. GPX Archive Extraction (`extract_gpx_archive`)
* **Status**: `executed_verified`
* **GPX ZIP source file exists?**: Yes, at `data/01_raw/as_received/2026-05-12/GPXファイル.zip` (9,790,030 bytes).
* **Extracted GPX output directory exists?**: Yes, at `data/01_raw/gpx/2026-05-12` (historically extracted to `data/01_raw/gpx/yoshitomi/2026-05-12` and relocated to the simplified layout).
* **Extracted GPX file count**: 293 files (after deduplicating 19 suffix copies).
* **Execution Evidence**: [`yoshitomi_gpx_archive_intake_report.md`](yoshitomi_gpx_archive_intake_report.md)

### 2. Excel Sheet CSV Extraction (`extract_excel_sheets`)
* **Status**: `executed_verified`
* **Excel workbook source file exists?**: Yes, at `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` (77,458 bytes).
* **Extracted CSV output directory exists?**: Yes, at `data/02_intermediate/activity_logs/csv_extracted/2026-05-18` (historically extracted to `data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18` and relocated).
* **CSV files discovered**:
  - `愛媛県の山.csv`
  - `難易度ランクの根拠.csv`
  - `百名山.csv`
  - `PH数の推移.csv`
  - `島根県の山.csv`
* **Execution Evidence**: [`yoshitomi_excel_sheet_extraction_report.md`](yoshitomi_excel_sheet_extraction_report.md)

### 3. Summit Candidate GPX Generation (`generate_summit_candidate_gpx`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-summit-candidate-gpx.js` and registered in `cli.js`.
* **Output directory exists?**: Yes, at `data/08_reporting/gpx/summit_candidates/2026-05-12/`.
* **Output GPX file count**: 293 GPX files.
* **Manifest file exists?**: Yes, at `data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/summit_candidate_gpx_generation_report.md`.
* **Execution Evidence**: [`summit_candidate_gpx_generation_report.md`](summit_candidate_gpx_generation_report.md).

### 4. Summit Candidate Feature Extraction (`extract_summit_candidate_features`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/extract-summit-candidate-features.js` and registered in `cli.js`.
* **Output file exists?**: Yes, at `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`.
* **Manifest file exists?**: Yes, at `data/03_primary/summit_candidates/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/summit_candidate_feature_extraction_report.md`.
* **Execution Evidence**: [`summit_candidate_feature_extraction_report.md`](summit_candidate_feature_extraction_report.md).

### 5. Reverse Geocoding Point Index Extraction (`extract_reverse_geocoding_point_index`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/extract-reverse-geocoding-point-index.js` and registered in `cli.js`.
* **Output file exists?**: Yes, at `data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl`.
* **Manifest file exists?**: Yes, at `data/02_intermediate/reverse_geocoding/extracted/nominatim/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/reverse_geocoding_point_index_report.md`.
* **Execution Evidence**: [`reverse_geocoding_point_index_report.md`](reverse_geocoding_point_index_report.md).

### 6. Summit Candidate Location Evidence Enrichment (`enrich_summit_candidates_with_reverse_geocoding`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/enrich-summit-candidates-with-reverse-geocoding.js` and registered in `cli.js`.
* **Output file exists?**: Yes, at `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl`.
* **Manifest file exists?**: Yes, at `data/04_feature/location_enrichment/summit_candidates/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/summit_candidate_location_evidence_report.md`.
* **Execution Evidence**: [`summit_candidate_location_evidence_report.md`](summit_candidate_location_evidence_report.md).


---

### 7. GPX-to-YAMAP Date Linking (`link-gpx-yamap-by-date`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/link-gpx-yamap-by-date.js` and registered in `cli.js`.
* **Output files exist?**: Yes, at `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/date_candidate_links.jsonl` and others.
* **Manifest file exists?**: Yes, at `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/gpx_yamap_date_linking_report.md`.
* **Execution Evidence**: [`gpx_yamap_date_linking_report.md`](gpx_yamap_date_linking_report.md).

### 8. GPX-to-YAMAP Title-Similarity Enrichment (`enrich-gpx-yamap-links-by-title`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/enrich-gpx-yamap-links-by-title.js` and registered in `cli.js`.
* **Output files exist?**: Yes, at `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`, `data/08_reporting/activity_linking/gpx_yamap_review_queue/2026-05-12/title_enriched_review_queue.csv` and `title_enriched_review_queue.md`.
* **Manifest file exists?**: Yes, at `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/gpx_yamap_title_enriched_linking_report.md`.
* **Execution Evidence**: [`gpx_yamap_title_enriched_linking_report.md`](gpx_yamap_title_enriched_linking_report.md).

### 9. Mountain-to-Summit Candidate Linking (`generate-mountain-summit-candidate-links`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-mountain-summit-candidate-links.js` and registered in `cli.js`.
* **Output files exist?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl`, `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_queue.csv`, and `review_queue.md`.
* **Manifest file exists?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-05-12/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/mountain_summit_candidate_linking_report.md`.
* **Execution Evidence**: [`mountain_summit_candidate_linking_report.md`](mountain_summit_candidate_linking_report.md).
* **Execution Summary Counts**:
  - Mountain source records: 531
  - Summit candidate records: 496
  - Candidate link records: 11372 (11372 real links, 0 no-candidate rows)
  - Mountains with candidates: 531
  - Mountains without candidates: 0
  - High confidence links: 0
  - Medium confidence links: 1481
  - Low confidence links: 4753
  - Weak/none confidence links: 5138
  - Ambiguous mountains: 531
  - Summit candidates linked to multiple mountains: 496
  - Needs human review: 11372
* **Note**: This stage generates candidate links only (to be reviewed by a human validator), not final accepted summit coordinates or final resolved identities.


### 10. Mountain Summit Candidate Location Refinement (`refine-mountain-summit-candidate-links-by-location`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/refine-mountain-summit-candidate-links-by-location.js` and registered in `cli.js`.
* **Output files exist?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl`, `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_refined_review_queue.csv`, and `location_refined_review_queue.md`.
* **Manifest file exists?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/mountain_summit_candidate_location_refinement_report.md`.
* **Execution Evidence**: [`mountain_summit_candidate_location_refinement_report.md`](mountain_summit_candidate_location_refinement_report.md).
* **Execution Summary Counts**:
  - Input candidate link records: 11,372
  - Output refined candidate link records: 11,372
  - Review queue rows: 9,732
  - Exact municipality matches: 2,608
  - Island text matches: 100
  - Local text matches: 43
  - Weak admin matches: 7
  - Boundary tolerated mismatches: 8,614
  - Top-1 per mountain coverage: 531 / 531
  - High review priority links: 9,516
  - Medium review priority links: 588
  - Low review priority links: 1,238
  - Deprioritized links: 30
* **Note**: This stage refines the candidate links using detailed Nominatim municipality/island information to prioritize and re-rank them, producing a reduced review queue. It does not generate final coordinates or resolve identities.

### 11. Mountain Summit Candidate Review Queue Compression (`generate-compact-mountain-summit-review-queues`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-compact-mountain-summit-review-queues.js` and registered in `cli.js`.
* **Output files exist?**: Yes, at:
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top1.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top3.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_conflicts.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_gpx.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_summit_candidate.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_summary.md`
* **Manifest file exists?**: Yes, at `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/mountain_summit_candidate_review_queue_compression_report.md`.
* **Execution Evidence**: [`mountain_summit_candidate_review_queue_compression_report.md`](mountain_summit_candidate_review_queue_compression_report.md).
* **Execution Summary Counts**:
  - Input location-refined candidate link records: 11,372
  - Top-1 review queue rows: 531
  - Top-3 review queue rows: 1,593
  - Conflict-only prioritized queue rows: 5,747
  - GPX groups (traverses): 268
  - Summit candidate conflict groups: 496
  - Score gap threshold: 0.03
* **Note**: This stage compresses the location-refined mountain-to-summit candidate links into compact review queues and conflict-group reports to reduce human review workload. It does not resolve links automatically or create final coordinates.

---


## Action Plan Before Active DVC Initialization
Before running `dvc init` and creating active root configuration pipelines, the following must occur:
1. Finalize directory structures and path mapping agreements.
2. Complete downstream stages (such as geocoding cache enrichment and identity resolution).
3. Validate parameters inside `docs/migration/proposed_params.yaml`.
4. Ensure all pipeline tools accept standard stdin/stdout or parameter-driven inputs.

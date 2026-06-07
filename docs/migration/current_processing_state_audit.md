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

* **Status**: `superseded_deleted`
* **Superseded by**: Stage 18 `generate-location-stability-compact-review-queues`
* **Deletion reason**: Outputs were generated under the previous Nominatim-based review criteria. Human review had not started. The files were intentionally removed to keep the repository focused on the current location-stability review workflow.
* **Deleted outputs**:
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top1.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top3.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_conflicts.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_gpx.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_summit_candidate.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_summary.md`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_manifest.json`
  - `docs/migration/mountain_summit_candidate_review_queue_compression_report.md`
* **Preserved upstream feature artifacts**:
  - `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl`
  - `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_manifest.json`
* **Replacement outputs**:
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/`

### 12. Mountain Summit Candidate Review Packets and Decision Template Generation (`generate-mountain-summit-review-packets`)

* **Status**: `superseded_deleted`
* **Superseded by**: Stage 19 `generate-location-stability-review-packets`
* **Deletion reason**: Outputs were generated under the previous review criteria. Human review had not started. The files were intentionally removed to avoid maintaining two competing review packet sets.
* **Deleted outputs**:
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_decisions_template.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packet_manifest.json`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/`
  - `docs/migration/mountain_summit_candidate_review_packet_report.md`
* **Replacement outputs**:
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packet_manifest.json`

### 13. KSJ N03 Ehime Administrative Area Reference Data Ingestion
* **Status**: `executed_verified`
* **Raw ZIP path**: `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/N03-20260101_38_GML.zip`
* **Raw ZIP manifest path**: `data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json`
* **Extracted directory path**: `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/`
* **Extracted manifest path**: `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json`
* **Audit path**: `docs/migration/ksj_n03_ehime_reference_data_ingestion_audit.md`
* **Report path**: `docs/migration/ksj_n03_ehime_reference_data_ingestion_report.md`
* **Raw ZIP SHA-256**: `88061f7ae784bbdd7b81f514ea904dcef853645b6d477691c1ba31091ab41dbf`
* **Raw ZIP size**: `12542884` bytes
* **Extracted file count**: `8`
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Note**: Ingests Kokudo Suchi Joho (MLIT) N03 administrative area ZIP data for Ehime Prefecture.

### 14. Ehime Municipality Land-Adjacency Reference Generation (`generate-ehime-municipality-adjacency`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-ehime-municipality-adjacency.js` and registered in `cli.js`.
* **Output files exist?**: Yes, at:
  - `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json`
  - `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency_pair_validation.csv`
  - `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_land_adjacency_edges.csv`
* **Manifest file exists?**: Yes, at `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/ksj_n03_ehime_municipality_adjacency_validation_report.md`.
* **Execution Evidence**: [`ksj_n03_ehime_municipality_adjacency_validation_report.md`](ksj_n03_ehime_municipality_adjacency_validation_report.md).
* **Execution Summary Counts**:
  - Municipality count: 20
  - Pair count: 190
  - Confirmed land-boundary pairs: 33
  - Point-contact-only pairs: 0
  - Not-adjacent pairs: 157
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Note**: Generates and validates topological land adjacency for the 20 municipalities in Ehime Prefecture.

---


### 15. KSJ N03 Ehime Municipality Point Lookup

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `lookup-ehime-municipality-by-point` — implemented at `.agents/skills/yama-data-pipeline/commands/lookup-ehime-municipality-by-point.js`
  - `lookup-ehime-municipalities-for-points` — implemented at `.agents/skills/yama-data-pipeline/commands/lookup-ehime-municipalities-for-points.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/municipality_point_lookup.js`
* **Input N03 GeoJSON**: `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson`
* **Input point dataset**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
* **Output JSONL**: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`
* **Manifest**: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/manifest.json`
* **Report**: `docs/migration/ksj_n03_ehime_summit_candidate_municipality_lookup_report.md`
* **Audit**: `docs/migration/ksj_n03_ehime_municipality_point_lookup_audit.md`
* **Boundary tolerance**: 20 m
* **Execution Summary Counts**:
  - Input point records: 496
  - single_municipality: 362
  - boundary_ambiguous: 122
  - outside_prefecture: 12
  - invalid_coordinate: 0
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Reverse-geocoding artifacts**: retained; not deleted or modified
* **Policy**: Reverse-geocoding outputs remain preserved as historical/contextual evidence. For future municipality-level lookup, use KSJ/N03 polygon lookup. Reverse geocoding is still useful only when street address, place names, roads, facilities, island labels, or other human-readable locality context is required.
* **Note**: Uses point-in-polygon (ray-casting) and local-planar boundary distance approximation. No external API calls.

---


### 16. Summit Candidate Municipality Stability Classification

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `classify-summit-candidate-municipality-stability` — implemented at `.agents/skills/yama-data-pipeline/commands/classify-summit-candidate-municipality-stability.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/municipality_stability.js`
* **Input N03 GeoJSON**: `data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson`
* **Input point lookup**: `data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`
* **Input summit candidates**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
* **Output JSONL**: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`
* **Manifest**: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/manifest.json`
* **Report**: `docs/migration/ksj_n03_ehime_summit_candidate_municipality_stability_report.md`
* **Audit**: `docs/migration/ksj_n03_ehime_municipality_stability_audit.md`
* **Parameters**:
  - Offset distance: 1000 m
  - Boundary tolerance: 20 m
  - Stable interior threshold: 1000 m
* **Execution Summary Counts**:
  - Input candidate records: 496
  - stable_interior: 204
  - stable_cardinal_1km_same: 20
  - near_boundary: 138
  - offset_inconsistent: 0
  - boundary_ambiguous: 122
  - outside_prefecture: 12
  - invalid_coordinate: 0
  - all_cardinal_1km_same: 224
  - distance_stable_interior: 204
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Reverse-geocoding artifacts**: retained; not deleted or modified
* **Note**: Classifies the geographic stability of each candidate relative to municipality boundaries by evaluating 1 km offsets in the four cardinal directions. No external API calls.

---


### 17. Location-Stability Refinement of Mountain-Summit Candidate Links

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `refine-mountain-summit-candidate-links-by-location-stability` — implemented at `.agents/skills/yama-data-pipeline/commands/refine-mountain-summit-candidate-links-by-location-stability.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/location_stability_refinement.js`
* **Input candidate links**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl`
* **Input mountains**: `data/03_primary/mountains/ehime_mountain_source_rows.json`
* **Input municipality adjacency**: `data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json`
* **Input municipality stability**: `data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`
* **Output JSONL**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl`
* **Review CSV**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_refined_review_queue.csv`
* **Review MD**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_refined_review_queue.md`
* **Manifest**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_manifest.json`
* **Report**: `docs/migration/mountain_summit_candidate_location_stability_refinement_report.md`
* **Execution Summary Counts**:
  - Input candidate links: 11372
  - Output refined links: 11372
  - location_strong_match: 2155
  - boundary_plausible: 635
  - municipality_incompatible_strong: 2647
  - adjacent_but_deep_inside: 1155
  - location_uncertain_keep: 3878
  - missing_location_evidence: 902
  - deprioritized_by_location_stability: 6933
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Reverse-geocoding artifacts**: retained; not deleted or modified
* **Note**: Refines the candidates' scores and ranks by comparing the mountain's expected municipality with the candidate's stability status and topological land adjacency. Existing Nominatim-based Stage 10 outputs are fully preserved.

---


### 18. Location-Stability Compact Review Queue Generation

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `generate-location-stability-compact-review-queues` — implemented at `.agents/skills/yama-data-pipeline/commands/generate-location-stability-compact-review-queues.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/location_stability_review_queue_compression.js`
* **Input refined links**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl`
* **Output directory**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/`
* **Manifest**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/manifest.json`
* **Report**: `docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md`
* **Execution Summary Counts**:
  - Top-1 queue rows: 531
  - Top-3 queue rows: 1593
  - Conflict queue rows: 4301
  - GPX groups: 268
  - Summit candidate conflict rows: 496
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Reverse-geocoding artifacts**: retained; not deleted or modified
* **Note**: Regenerates compact review queues using the location-stability refinement bucket classifications. Non-compatible links are deprioritized. Existing compact review queues are preserved.

---


### 19. Location-Stability Review Packets and Decision Template Generation

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `generate-location-stability-review-packets` — implemented at `.agents/skills/yama-data-pipeline/commands/generate-location-stability-review-packets.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/location_stability_review_packets.js`
* **Input paths**:
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top1.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_top3.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/compact_review_queue_conflicts.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/conflict_groups_by_gpx.csv`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/conflict_groups_by_summit_candidate.csv`
  - `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl`
* **Output directory**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/`
* **Decision template CSV**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv`
* **Manifest**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packet_manifest.json`
* **Report**: `docs/migration/mountain_summit_candidate_location_stability_review_packet_report.md`
* **Execution Summary Counts**:
  - Top-1 queue rows: 531
  - Top-3 queue rows: 1593
  - Conflict queue rows: 4301
  - GPX group rows: 268
  - Summit candidate group rows: 496
  - Decision template rows: 531
  - Initial pending review decisions: 531
  - Accepted candidate prefilled count: 0
  - GPX group packet count: 268
  - Summit candidate packet count: 496
  - Mountain packet count: 531
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Existing Stage 12 outputs overwritten**: `false`
* **Note**: This stage creates human review artifacts and decision templates based on location-stability queues. No final accepted summit coordinates or automatic candidates are accepted.

---


### 20. Geographic Grounding Request Preparation Stage

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `generate-review-required-geographic-grounding-requests` — implemented at `.agents/skills/yama-data-pipeline/commands/generate-review-required-geographic-grounding-requests.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/mountain_geographic_grounding_requests.js`
* **Input paths**:
  - `data/03_primary/mountains/ehime_mountain_source_rows.json`
  - `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl`
  - `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/` (top1, top3, conflicts, GPX group and summit candidate conflict CSVs)
* **Output directories**:
  - `data/04_feature/mountain_geographic_grounding/2026-05-12/` (request packets JSONL, selection log JSONL)
  - `data/08_reporting/mountain_geographic_grounding/2026-05-12/` (Markdown packets, submission queue CSV, summary Markdown)
* **Manifest**: `data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_manifest.json`
* **Report**: `docs/migration/mountain_geographic_grounding_request_packet_report.md`
* **Execution Summary Counts**:
  - Selected mountains: 366
  - Excluded mountains: 165
  - Machine request packets: 366
  - Selection log records: 366
  - Markdown packets: 366
  - Submission queue rows: 366
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Note**: This stage identifies mountains requiring external geographic grounding support based on location stability queues and compiles machine-readable and human-readable request packets. It does not call the external agent, create raw external responses, or fill final coordinate/decision layers. Stage 20 was regenerated after fixing primary mountain name mapping from `name` to Stage 20 `mountain_name` outputs. No source data was modified.

---


### 21. Grounding-Based Refinement of Mountain-Summit Candidate Links

* **Status**: `executed_verified`
* **Subcommand(s)**:
  - `refine-mountain-summit-candidate-links-by-grounding` — implemented at `.agents/skills/yama-data-pipeline/commands/refine-mountain-summit-candidate-links-by-grounding.js`
  - Library: `.agents/skills/yama-data-pipeline/lib/grounding_response_refinement.js`
* **Input candidate links**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl`
* **Input grounding responses**: `data/01_raw/mountain_geographic_grounding/external_agent/2026-06-06/gemini_grounding_responses_raw.json`
* **Output JSONL**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/grounding_refined_candidate_links.jsonl`
* **Review CSV**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/grounding_refined_review_queue.csv`
* **Review MD**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/grounding_refined_review_queue.md`
* **Manifest**: `data/04_feature/mountain_summit_candidate_links/2026-05-12/grounding_refined_manifest.json`
* **Report**: `docs/migration/mountain_summit_candidate_grounding_refinement_report.md`
* **Execution Summary Counts**:
  - Input candidate links: 11,372
  - Output refined links: 11,372
  - Raw grounding records: 387
  - Unique mountains with grounding: 337
  - Mountains with coordinate clusters: 333
  - Single-cluster consensus: 294
  - Conflicting clusters: 36
  - Grounding supported links: 7
  - Grounding weakly supported links: 59
  - Grounding neutral links: 4,711
  - Grounding weakened links: 6,595
  - Upgraded links (priority reduced): 5
  - Downgraded links (priority increased): 1,683
* **Review Burden Reduction**:
  - Links needing review (high/medium): 3,002 → 1,314 (reduction: 1,688)
  - Mountains needing review: 531 → 280 (reduction: 251)
  - Top-1 links needing review: 527 → 253 (reduction: 274)
* **DVC status**: not active; no DVC commands run
* **Git LFS**: not used
* **Source files modified**: `false`
* **Existing Stage 17 outputs overwritten**: `false`
* **Note**: This stage projects raw Gemini-derived geographic grounding coordinates as auxiliary distance-based evidence onto the existing candidate links. Grounding responses are consolidated by deduplication and coordinate clustering (100m radius). Candidates within 250m of the best grounding cluster are marked "supported"; those beyond 2km are "weakened". No final coordinates are generated and no candidates are automatically accepted.

---

### 22. Normalize Grounding Responses (`normalize-grounding-responses`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/normalize-grounding-responses.js`.
* **Output file exists?**: Yes, at `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`.
* **Manifest file exists?**: Yes, at `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/grounding_reference_index_report.md`.
* **Key metrics**:
  - Total mountains: 531
  - Mountains with grounding: 337, usable coordinates: 333
  - Coordinate conflicts: 38, single cluster: 295
  - Insufficient evidence: 4
* **Source files modified**: `false`

### 23. Grounding-Assisted Summit Candidate Link Generation (`generate-grounding-assisted-summit-candidate-links`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-grounding-assisted-summit-candidate-links.js`.
* **Output file exists?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-06-06/grounding_assisted_candidate_links.jsonl`.
* **Pruned log file exists?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-06-06/grounding_assisted_pruned_candidate_log.jsonl`.
* **Manifest file exists?**: Yes, at `data/04_feature/mountain_summit_candidate_links/2026-06-06/grounding_assisted_candidate_links_manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/grounding_assisted_candidate_link_generation_report.md`.
* **Key metrics**:
  - Total candidate links: 6,079 (baseline Stage 9: 11,372; reduction: 46.5%)
  - Strict grounding matches: 1
  - Mountains auto-supported: 1
  - Mountains with no candidates: 43 (included as marker rows)
  - Pruned far candidates: 495
* **Source files modified**: `false`
* **Existing Stage 9 outputs overwritten**: `false`

### 24. Grounding-Assisted Review Queue Generation (`generate-grounding-assisted-review-queues`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-grounding-assisted-review-queues.js`.
* **Output directory exists?**: Yes, at `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review/`.
* **Output files**:
  - `auto_supported_candidates.csv` (1 mountain)
  - `review_required_mountains.csv` (530 mountains)
  - `review_required_candidates.csv` (6,078 candidate links)
  - `grounding_conflicts.csv` (38 mountains)
  - `summary.md`
* **Manifest file exists?**: Yes, at `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review/manifest.json`.
* **Report file exists?**: Yes, at `docs/migration/grounding_assisted_review_queue_report.md`.
* **Key metrics**:
  - All 531 mountains covered (1 auto-supported + 530 review-required)
  - Coverage gap: 0
* **Source files modified**: `false`
* **Existing Stage 11-21 review outputs overwritten**: `false`

---



### 25. Grounding-Assisted Review Reduction v2 (`generate-grounding-assisted-review-queues-v2`)
* **Status**: `executed_verified`
* **Subcommand exists?**: Yes, implemented at `.agents/skills/yama-data-pipeline/commands/generate-grounding-assisted-review-queues-v2.js`.
* **Output directory exists?**: Yes, at `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/`.
* **Output files**:
  - `immediate_review_required_mountains.csv` (376 mountains)
  - `review_deferred_mountains.csv` (154 mountains)
  - `auto_supported_candidates.csv` (1 mountain)
  - `map_check_recommended.csv` (0 mountains)
  - `conflict_cases.csv` (134 mountains)
  - `no_candidate_mountains.csv` (0 mountains)
  - `stage21_stage23_disagreements.csv` (0 mountains)
  - `immediate_review_required_candidates.csv`
  - `review_deferred_candidates.csv`
  - `summary.md`
* **Manifest file exists?**: Yes, at `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/manifest.json`.
* **Note**: Stage 25 improves over Stage 24 by deferring review for candidates strongly supported by Stage 21 or new grounding tiers. Stage 25 is now the recommended entry point for human review.

---

### 26. Mountain-Summit Candidate Linking v3 Audit

* **Status**: `audit_created_implementation_not_started`
* **Scope**: v3 source coverage audit and source-to-target mapping audit only.
* **Audit documents**:
  - `docs/migration/mountain_summit_candidate_linking_v3_source_coverage_audit.md`
  - `docs/migration/mountain_summit_candidate_linking_v3_source_to_target_mapping.md`
* **Implementation status**: not started.
* **Note**: Existing Stage 9–25 outputs remain preserved as legacy/baseline artifacts and are not overwritten.

---

### 27. Gemini-Grounded Mountain Summit Assignment Execution

* **Status**: `executed_verified`
* **Stage**: `mountain_summit_coordinate_assignment`
* **Method ID**: `gemini_grounded_summit_assignment`
* **Run ID**: `2026-06-07_gemini_grounded_summit_assignment`
* **Scope**: One-record-per-mountain proposed summit coordinate assignment method.
* **Plan document**:
  - `docs/migration/mountain_summit_assignment_gemini_grounded_plan.md`
* **Audit documents**:
  - `docs/migration/mountain_summit_assignment_gemini_grounded_source_coverage_audit.md`
  - `docs/migration/mountain_summit_assignment_gemini_grounded_source_to_target_mapping.md`
* **Implementation status**: executed.
* **Assignment outputs generated**: true.
* **Review outputs generated**: true.
* **Current review entry point replacement**: false.
* **Previous v3 implementation attempt**: PR #93 is closed/unmerged and treated as reference-only; it is not the active implementation path for this method.
* **Note**: This method is distinct from the older v3 candidate-linking audit and from any closed/unmerged v3 implementation PR. Existing Stage 9–25 outputs remain preserved as legacy/baseline artifacts and are not overwritten. Proposed assignments are generated under `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_summit_assignment/` for review planning only, but do not replace Stage 25.

---

### 28. Gemini-Grounded Balanced Mountain Summit Assignment Execution

* **Status**: `executed_verified`
* **Stage**: `mountain_summit_coordinate_assignment`
* **Method ID**: `gemini_grounded_balanced_summit_assignment`
* **Run ID**: `2026-06-07_gemini_grounded_balanced_summit_assignment`
* **Scope**: One-record-per-mountain proposed summit coordinate assignment method with relaxed review rules.
* **Progress document**:
  - `docs/migration/mountain_summit_assignment_gemini_grounded_balanced_progress.md`
* **Audit documents**:
  - `docs/migration/mountain_summit_assignment_gemini_grounded_balanced_source_coverage_audit.md`
  - `docs/migration/mountain_summit_assignment_gemini_grounded_balanced_source_to_target_mapping.md`
* **Report document**:
  - `docs/migration/mountain_summit_assignment_gemini_grounded_balanced_report.md`
* **Implementation status**: executed.
* **Assignment outputs generated**: true.
* **Review outputs generated**: true.
* **Current review entry point replacement**: false.
* **Note**: This method is a less conservative alternative to `gemini_grounded_summit_assignment`, utilizing boundary-compatible municipality checks and activity-title name evidence to reduce the review burden. Existing Stage 9–25 outputs, and Stage 27 outputs, remain preserved and are not overwritten. Proposed assignments do not replace Stage 25 as the human review entry point.

---

### 29. Summit Candidate Extraction Refinement Planning

* **Status**: `analysis_complete_implementation_not_started`
* **Stage**: `summit_candidate_extraction_refinement_planning`
* **Recommended Method ID**: `gemini_near_gpx_supplemental_candidate_expansion`
* **Scope**: Analysis and planning for improving summit candidate extraction and shared-candidate ambiguity after the balanced Gemini-grounded assignment run.
* **Plan document**:
  - `docs/migration/mountain_summit_assignment_candidate_extraction_refinement_plan.md`
* **Progress document**:
  - `docs/migration/gemini_near_gpx_supplemental_candidate_expansion_progress.md`
* **Analysis outputs**:
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/shared_candidate_deep_dive.csv`
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/traverse_track_peak_coverage.csv`
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/name_missing_gpx_supported_cases.csv`
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/candidate_extraction_gap_hypotheses.csv`
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/refinement_policy_options.csv`
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/summary.md`
  - `data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis/manifest.json`
* **Source coverage audit**: completed (see `docs/migration/gemini_near_gpx_supplemental_candidate_expansion_source_coverage_audit.md`).
* **Source-to-target mapping audit**: completed (see `docs/migration/gemini_near_gpx_supplemental_candidate_expansion_source_to_target_mapping.md`).
* **Implementation status**: not started.
* **Supplemental candidate outputs generated**: false.
* **Assignment outputs regenerated**: false.
* **Current review entry point replacement**: false.
* **Next step**: implementation prompt may be prepared.
* **Note**: This stage does not change the current Stage 25 human review entry point. It only records the conclusion that threshold relaxation alone is insufficient and that candidate extraction / supplemental candidate generation should be audited before implementation.

---

### 30. Gemini-Near GPX Supplemental Candidate Expansion Execution

* **Status**: `executed_verified`
* **Stage**: `summit_candidate_extraction_refinement_execution`
* **Method ID**: `gemini_near_gpx_supplemental_candidate_expansion`
* **Run ID**: `2026-06-07_gemini_near_gpx_supplemental_candidate_expansion`
* **Scope**: Generate supplemental, non-canonical summit candidate points near Gemini grounding anchors by reading raw GPX trackpoints.
* **Progress document**:
  - `docs/migration/gemini_near_gpx_supplemental_candidate_expansion_progress.md`
* **Report document**:
  - `docs/migration/gemini_near_gpx_supplemental_candidate_expansion_report.md`
* **Implementation status**: executed.
* **Supplemental candidate outputs generated**: true.
* **Assignment outputs regenerated**: false.
* **Current review entry point replacement**: false.
* **Note**: All generated candidates are marked as non-canonical evidence for review planning only (`supplemental_candidate_type = supplemental_gemini_near_gpx_point`), with `needs_human_review = true`. They do not overwrite existing summit candidates and proposed assignments, and do not replace Stage 25.

---


## Current Human Review Entry Points

Current human review entry point remains Stage 25 `grounding_assisted_review_v2`.

Stages 27–30 are review-planning, assignment, and candidate-extraction-refinement experiments. They do not yet replace Stage 25.

Human reviewers should use the grounding-assisted review artifacts v2 (Stage 25) as the latest entry point:

- Auto-supported candidates: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/auto_supported_candidates.csv`
- Review deferred mountains: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/review_deferred_mountains.csv`
- Immediate review required mountains: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/immediate_review_required_mountains.csv`
- Immediate review required candidates: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/immediate_review_required_candidates.csv`
- Conflict cases: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/conflict_cases.csv`
- Review summary: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/summary.md`

The prior review artifacts (Stages 11–24) remain available as legacy/baseline reference but are superseded by the v2 grounding-assisted review artifacts.

The old Stage 11/12 review artifacts were intentionally deleted before review began.

---


## Action Plan Before Active DVC Initialization
Before running `dvc init` and creating active root configuration pipelines, the following must occur:
1. Finalize directory structures and path mapping agreements.
2. Complete downstream stages (such as geocoding cache enrichment and identity resolution).
3. Validate parameters inside `docs/migration/proposed_params.yaml`.
4. Ensure all pipeline tools accept standard stdin/stdout or parameter-driven inputs.

# Obsolete Review Artifact Cleanup Audit

This document audits and classifies all obsolete review/reporting artifacts generated under the previous Nominatim-based review criteria, as well as the active location-stability-based review artifacts to be retained.

## Deletion Targets (Intentionally Discarded)

The following old Stage 11 and Stage 12 review/reporting artifacts were generated under Nominatim-based location refinement criteria. No human review had started on them, and they are now completely superseded by location-stability-based Stage 18 and Stage 19 artifacts. They are classified as `intentionally discarded`.

| Path | Stage | Classification | Rationale |
|---|---|---|---|
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top1.csv` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/compact_review_queue_top1.csv`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top3.csv` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/compact_review_queue_top3.csv`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_conflicts.csv` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/compact_review_queue_conflicts.csv`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_gpx.csv` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/conflict_groups_by_gpx.csv`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_summit_candidate.csv` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/conflict_groups_by_summit_candidate.csv`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_summary.md` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/compact_review_summary.md`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_manifest.json` | 11 | `intentionally discarded` | Superseded by Stage 18 `location_stability_compact_review/manifest.json`. |
| `docs/migration/mountain_summit_candidate_review_queue_compression_report.md` | 11 | `intentionally discarded` | Superseded by `docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_decisions_template.csv` | 12 | `intentionally discarded` | Superseded by Stage 19 `location_stability_review_decisions_template.csv`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packet_manifest.json` | 12 | `intentionally discarded` | Superseded by Stage 19 `location_stability_review_packet_manifest.json`. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/` | 12 | `intentionally discarded` | Superseded by Stage 19 `location_stability_review_packets/`. |
| `docs/migration/mountain_summit_candidate_review_packet_report.md` | 12 | `intentionally discarded` | Superseded by `docs/migration/mountain_summit_candidate_location_stability_review_packet_report.md`. |

---

## Retained Artifacts (Preserved)

The following datasets are active review materials or feature/provenance references and must be retained.

### 1. Current Review Materials (Stage 18/19 Location-Stability-Based)

These are derived human-review aids generated using administrative area polygon stability features. They are classified as `derived only` and are the active entry points for manual verification.

| Path | Stage | Classification | Notes |
|---|---|---|---|
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/` | 18 | `derived only` | Contains Stage 18 compact review queues and manifests. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/` | 19 | `derived only` | Contains Stage 19 traverse and mountain review packets. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv` | 19 | `derived only` | Active decisions template for reviewer choices. |
| `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packet_manifest.json` | 19 | `derived only` | Stated file checksums mapping for Stage 19. |
| `docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md` | 18 | `derived only` | Stage 18 run report. |
| `docs/migration/mountain_summit_candidate_location_stability_review_packet_report.md` | 19 | `derived only` | Stage 19 run report. |

### 2. Feature & Ingestion Reference Artifacts (Stage 9/10/15/16/17)

These are stored primary, intermediate, or geocoding datasets that act as the structural pipeline features or historical geocoding references. They are classified as `preserved as raw snapshot` or `preserved as legacy reference`.

| Path | Classification | Notes |
|---|---|---|
| `data/01_raw/` | `preserved as raw snapshot` | Source GPX, YAMAP markdown, and raw reference intake. |
| `data/02_intermediate/` | `preserved as raw snapshot` | Extracted and normalized reference reference sets. |
| `data/03_primary/` | `preserved as raw snapshot` | Authoritative mountains and summit candidate database layers. |
| `data/04_feature/location_reference/` | `preserved as raw snapshot` | Municipality point lookups, stability, and adjacency datasets. |
| `data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl` | `preserved as raw snapshot` | Stage 9 raw link matches. |
| `data/04_feature/mountain_summit_candidate_links/2026-05-12/manifest.json` | `preserved as raw snapshot` | Stage 9 manifest. |
| `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl` | `preserved as legacy reference` | Stage 10 Nominatim-refined links, preserved for context. |
| `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_manifest.json` | `preserved as legacy reference` | Stage 10 manifest. |
| `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_candidate_links.jsonl` | `preserved as raw snapshot` | Stage 17 refined candidate links. |
| `data/04_feature/mountain_summit_candidate_links/2026-05-12/location_stability_refined_manifest.json` | `preserved as raw snapshot` | Stage 17 manifest. |

---

## Status and Verification Declarations

* **Unmigrated gaps**: none
* **Needs decision items**: none
* **Existing source files modified**: false
* **Reverse-geocoding artifacts deleted or modified**: false (nominatim caches and indexes are fully preserved as legacy reference)
* **Current Stage 18/19 artifacts retained**: true
* **Old Stage 11/12 review artifacts deleted only because no human review had started**: true
* **DVC status**: not active; no DVC command executed
* **Final coordinate generation**: out of scope
* **Automatic candidate acceptance**: out of scope

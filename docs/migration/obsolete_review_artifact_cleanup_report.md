# Obsolete Review Artifact Cleanup Report

This report documents the cleanup of obsolete Nominatim-based review and reporting artifacts, verifying that only the correct location-stability review queues, packets, templates, and reports remain active.

## Verification Details

- **Branch checked**: `museum-yama-data`
- **HEAD commit checked**: `3aaf2b7b3af784ca06974dcc9ba0778446c0b549`
- **Cleanup Goal**: Remove old review/reporting artifacts generated under the previous Nominatim-based review criteria, retain the location-stability-based Stage 18/19 review artifacts, and update paths and documentation consistency.

---

## Deleted Files & Directories (Obsolete Review Artifacts)

The following files were generated under old criteria and have been deleted using `git rm` (or `git rm -r`):

- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top1.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_top3.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_queue_conflicts.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_gpx.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/conflict_groups_by_summit_candidate.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_summary.md`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_manifest.json`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_decisions_template.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packet_manifest.json`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets/` (Directory deleted)
- `docs/migration/mountain_summit_candidate_review_queue_compression_report.md`
- `docs/migration/mountain_summit_candidate_review_packet_report.md`

---

## Retained Files & Directories

### 1. Stage 18/19 Location-Stability-Based Review Artifacts
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_compact_review/`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv`
- `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packet_manifest.json`
- `docs/migration/mountain_summit_candidate_location_stability_review_queue_report.md`
- `docs/migration/mountain_summit_candidate_location_stability_review_packet_report.md`

### 2. Feature, Primary, Intermediate, and Raw Source Artifacts
- `data/04_feature/mountain_summit_candidate_links/` (Includes all `candidate_links.jsonl`, `location_refined_candidate_links.jsonl`, and `location_stability_refined_candidate_links.jsonl` files)
- `data/04_feature/location_reference/`
- `data/03_primary/`
- `data/02_intermediate/`
- `data/01_raw/`

---

## Human Review Entry Points

**Historical Note:** At the time of this cleanup, location-stability review packets were the current entry point. Later Stage 22-24 grounding-assisted artifacts were generated. The current review entry point must be determined from `current_processing_state_audit.md`.

Human reviewers should use only these location-stability-based artifacts (at the time of writing):

- **Current Review Entry Point**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_packets/index.md`
- **Current Decision Template**: `data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_stability_review_decisions_template.csv`

---

## Safety & Invariant Confirmations

- **Why deleted?**: Old review artifacts were deleted only because human review had not yet started, and they are now completely superseded to avoid reviewer confusion between different versions.
- **Stage 18/19 preserved**: Confirmed.
- **Stage 10 feature/Nominatim geocoding preserved**: Confirmed.
- **No raw/source file modifications**: Confirmed.
- **DVC status**: DVC is not active; no DVC commands were run.
- **No external API calls**: Confirmed. No Nominatim, YAMAP, or other external endpoints were contacted.
- **Path leakage check**: A repository-wide check was performed. Fixed matches in `docs/migration/location_stability_review_packet_generation_audit.md` and `docs/migration/ksj_n03_ehime_municipality_stability_audit.md` where obsolete `file:///data/` or `file:///docs/` links existed, replacing them with code blocks containing repo-relative paths.

---

## Validation Commands Run

The Node.js test suite and verification logic was run:

```sh
npm test
```

Validation scripts for template line counts and manifest integrity were executed via Node:

- `node -e` validation scripts confirmed that `location_stability_review_decisions_template.csv` contains exactly 531 rows, is in a `pending_review` status, has empty decisions, and contains relative packet paths.
- `location_stability_review_packet_manifest.json` parses as valid JSON.
- Obsolete old review artifacts are completely absent.
- Required location-stability artifacts are present.

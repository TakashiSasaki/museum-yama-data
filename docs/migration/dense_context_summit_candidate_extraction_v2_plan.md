# Dense Context Summit Candidate Extraction v2 Plan

## 1. Context and Problem Statement
The current canonical candidate set relies on "clear elevation-profile peaks". This approach detects prominent geographical peaks effectively, but it is insufficient for the task of assigning mountain numbers derived from CSV records. Some mountains exist on smaller peaks, ridges, or specific named locations along traverse tracks that do not pass the strict prominence thresholds.

## 2. Objective
Implement `dense_context_summit_candidate_extraction_v2` to extract summit candidates that incorporate the dense context of named tracks, traverse tracks, and nearby geographical anchors without overwriting the original candidates.

## 3. Method Identity
```text
stage     = summit_candidate_extraction
method_id = dense_context_summit_candidate_extraction_v2
run_id    = 2026-06-07_dense_context_summit_candidate_extraction_v2
```

## 4. Input Datasets
- Raw GPX files: `data/01_raw/gpx/2026-05-12/`
- Mountain source rows: `data/03_primary/mountains/ehime_mountain_source_rows.json`
- Canonical candidates: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
- Canonical manifest: `data/03_primary/summit_candidates/2026-05-12/manifest.json`
- Stage 30 candidates: `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates.jsonl`
- Stage 30 manifest: `data/03_primary/summit_candidates/2026-06-07_gemini_near_gpx_supplemental_candidate_expansion/supplemental_summit_candidates_manifest.json`
- Grounding Reference: `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`
- Activity links: `data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`
- Stage 32 assignments: `data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment/proposed_summit_assignments.jsonl`

## 5. Output Namespaces
- `data/03_primary/summit_candidates/2026-06-07_dense_context_summit_candidate_extraction_v2/`
- `data/08_reporting/summit_candidates/2026-06-07_dense_context_summit_candidate_extraction_v2/`

## 6. Policies
- Non-overwrite policy: Canonical candidates, Stage 30, and Stage 32 outputs must NOT be modified.
- Source immutability policy: Raw/source data (GPX, Yamap) remain immutable.
- Repository-relative path policy: All generated artifacts must output repository-relative paths.

## 7. Candidate Classes
Priority:
1. prominent_local_peak
2. gemini_near_trackpoint_peak
3. csv_near_trackpoint_peak
4. named_track_context_candidate
5. traverse_split_candidate
6. minor_local_peak

## 8. Deduplication
If candidates are within 30m, keep the one with highest priority, retaining all evidence.

## 9. Implementation Phases
1. Core Logic implementations.
2. Script/Command integration.
3. Execution and Generation.
4. Validation and Reporting.

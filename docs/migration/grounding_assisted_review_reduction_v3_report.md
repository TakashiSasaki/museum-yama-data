# Grounding-Assisted Review Reduction v3 Report

## Baseline Metrics

Before implementing Stage 26 / v3 Review Queue, the following baseline metrics were established from the actual checked-in repository files and manifests:

* **Stage 9 candidate links**: 11,372
* **Stage 21 review-required mountains**: 280
* **Stage 23 candidate links**: 6,079
* **Stage 24 review-required mountains**: 530
* **Stage 25 active review-required mountains**: 376
* **Stage 25 deferred mountains**: 154
* **Stage 25 auto-supported mountains**: 1
* **Stage 25 map-check mountains**: 0
* **Stage 25 no-candidate mountains**: 0
* **Stage 25 conflict mountains**: 134

*Note on baseline discrepancy:* Previous planning documents contained a stale estimate of "about 520" for the Stage 25 active review-required mountains. The actual baseline extracted from `data/08_reporting/mountain_summit_candidate_review/2026-06-06/grounding_assisted_review_v2/manifest.json` is **376**.

The goal of Stage 26 / v3 is to analyze the gap between the Stage 21 reduced baseline (280) and the current Stage 25 baseline (376), and safely transition more mountains out of the immediate active review queue without compromising data integrity. Gemini evidence is auxiliary only, and no candidates are automatically accepted as canonical.

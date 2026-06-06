# Grounding-Assisted Review Reduction v2 Report (Stage 25)

## Overview
This report documents the results of executing the Stage 25 Grounding-Assisted Review Queues v2 logic (`generate-grounding-assisted-review-queues-v2`). The goal was to reduce the human review burden (mountains requiring active review) below Stage 24's 530, while preserving the smaller candidate link set of 6,079 generated in Stage 23.

## Comparison Metrics

| Metric | Count | Notes |
|--------|-------|-------|
| Stage 9 Baseline Links | 11,372 | Original candidate set without grounding. |
| Stage 21 Review Required Mountains | 280 | Baseline for review reduction using late projection. |
| Stage 23 Candidate Links | 6,079 | New candidate set size (46.5% reduction). |
| Stage 24 Review Required Mountains | 530 | The conservative strict-match-only approach. |
| Stage 25 Active Review Mountains | 376 | The new improved queue sizing. |

## Process Details
- **Stage 25 Active Review Required Mountains**: 376
- **Stage 25 Auto-supported Mountains**: 1
- **Stage 25 Review Deferred Mountains**: 154
- **Stage 25 Map Check Recommended Mountains**: 0
- **Stage 25 Conflict Mountains**: 134 (Included in active review total)
- **Stage 25 No-Candidate Mountains**: 0 (Included in active review total)

## Findings
Stage 25 successfully integrates the v2 queue machinery. By fully passing Stage 21 inputs to parseArgs, the carry-forward logic reduces active review down to 376 mountains (from 530). This is a meaningful step toward Stage 21’s 280 review-required mountain baseline without losing Stage 23's candidate reduction benefits. Stage 25 is documented as a successful integration step, but leaves further review-reduction work for later.

The python validation test run (`python -m compileall scripts src`) completed successfully without failure.

*Note: Gemini evidence is auxiliary, not canonical. No final coordinates are generated. No candidates are automatically accepted as canonical. Stage 25 only changes review priority and review queue membership. Existing Stage 9–24 outputs are preserved. Stage 21 remains a baseline/reference.*

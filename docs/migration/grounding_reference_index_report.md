# Grounding Reference Index Report

- **Stage**: 22 — normalize-grounding-responses
- **Created at**: `2026-06-06T10:06:00.949Z`
- **Git commit**: `552ce11303fed6af58c2c4f3b810d7addbf949b8`

## Input

| Source | Path | Count |
|---|---|---|
| Mountains | `data/03_primary/mountains/ehime_mountain_source_rows.json` | 531 |
| Raw Grounding | `data/01_raw/mountain_geographic_grounding/external_agent/2026-06-06/gemini_grounding_responses_raw.json` | 387 |

## Output

| Output | Path | Count |
|---|---|---|
| Reference Index | `data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl` | 531 |

## Summary

| Metric | Count |
|---|---|
| Total mountains | 531 |
| Mountains with grounding | 337 |
| Mountains without grounding | 194 |
| Mountains with usable coordinate | 333 |
| Mountains without usable coordinate | 4 |
| Single cluster | 295 |
| Coordinate conflict | 38 |
| Name exact match | 328 |
| Name normalized match | 0 |
| Name mismatch | 9 |
| Municipality exact match | 307 |
| Municipality normalized match | 0 |
| Municipality mismatch | 29 |
| Insufficient evidence | 4 |

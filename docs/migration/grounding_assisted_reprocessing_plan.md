# Grounding-Assisted Reprocessing Plan

## Motivation

The original Stage 9 candidate-link generation paired every mountain (531) with every summit candidate (496), producing 11,372 candidate links. The filter (name OR elevation OR CSV coordinate match) was too permissive because:

1. Most mountains lack CSV coordinates (GPS column is empty).
2. Many mountains share elevation ranges (e.g., 300–800m), so elevation within 50m matches broadly.
3. Without spatial constraint, the Cartesian product is only weakly pruned.

All 11,372 links required review, making human validation impractical.

## Design: Grounding-Early Candidate Generation

External geographic grounding responses provide auxiliary coordinate evidence for 333 of 531 mountains. Instead of applying grounding as a late-stage filter (which still generates 11,372 links first), this design uses grounding coordinates **during candidate generation** to spatially constrain the search.

### Key principle

For mountains with grounding coordinates, search summit candidates within a 500m spatial radius first. If a strict high-confidence match is found (distance ≤50m, elevation ≤10m, name match, municipality match), generate a narrow candidate set and classify the mountain as auto-supported.

### Pipeline Stages

| Stage | Command | Description |
|---|---|---|
| 22 | `normalize-grounding-responses` | Convert raw Gemini responses to mountain-level grounding reference index |
| 23 | `generate-grounding-assisted-summit-candidate-links` | Generate candidate links with grounding-early spatial search |
| 24 | `generate-grounding-assisted-review-queues` | Split candidates into auto-supported vs review-required |

### Reused stages (not re-executed)

Stages 1–8 produce stable source inputs that do not change. These outputs are consumed directly:
- Mountain source JSON (Stage 3a)
- Summit candidate JSONL (Stage 4)
- Location evidence JSONL (Stage 6) — fallback only
- Activity links JSONL (Stage 8) — fallback only
- Raw grounding responses (external, ingested)

### Superseded stages

Stages 9–21 are preserved as baseline comparison. The new Stages 22–24 supersede them as the primary review path for candidate link generation and review queue production.

## Strict High-Confidence Match Rules

A candidate qualifies as `strict_grounding_match` only when ALL conditions hold:

1. Source mountain name matches grounding mountain name after NFKC normalization
2. Source municipality matches grounding municipality after NFKC normalization
3. Grounding coordinate to summit candidate distance ≤ 50m
4. Grounding elevation to summit candidate elevation difference ≤ 10m (when grounding elevation is available)
5. No competing candidates within the strict 50m neighborhood, or competitors are coordinate duplicates within 5m

## Fallback Rules

Mountains without grounding coordinates, or with conflicting/insufficient grounding evidence, fall back to the existing evidence-based candidate generation logic (name, elevation, CSV coordinate, location, activity link scoring).

## Source Data Immutability

- Raw GPX files are not modified
- YAMAP Markdown files are not modified
- Mountain source JSON is not modified
- Summit candidate JSONL is not modified
- Raw grounding responses are not modified
- Existing Stage 9–21 outputs are not modified or deleted

## Output Layers

All outputs use the `2026-06-06` date namespace:

- Feature layer: `data/04_feature/mountain_geographic_grounding/2026-06-06/`
- Feature layer: `data/04_feature/mountain_summit_candidate_links/2026-06-06/`
- Review layer: `data/08_reporting/mountain_summit_candidate_review/2026-06-06/`

## Grounding Data Policy

- Gemini responses are auxiliary evidence, not canonical
- Missing coordinates (4 mountains) are handled as unavailable evidence
- Duplicate records (50 mountains with 2 records) are consolidated by coordinate clustering
- Conflicting clusters (>250m apart) force review
- No final coordinates or identities are created

## Review Entry Points

After execution:
- `auto_supported_candidates.csv` — mountains excluded from immediate review
- `review_required_mountains.csv` — mountains requiring human review
- `review_required_candidates.csv` — individual candidate links for review
- `grounding_conflicts.csv` — mountains with conflicting grounding

## Validation Expectations

- All 531 mountains appear in either auto_supported or review_required
- Strict matches satisfy distance ≤50m and elevation ≤10m
- All candidate link scores are in [0, 1]
- Source files are not modified

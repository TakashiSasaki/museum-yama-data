# Mountain Summit Review Decision Policy

This document defines the policy, rules, and workflows for human review of mountain-to-summit candidate links.

## 1. Purpose of Human Review

Manually validating GPX track coordinates against historical database records is the final gating step before accepting summit coordinates. Since mountains frequently share names, are located on ridge lines with multiple candidates, or lack coordinates in source CSVs, algorithmic score matching cannot make final assertions. Human review validates context evidence to establish unambiguous coordinate provenance.

## 2. Review Packets vs. Final Decisions

- **Review Packets**: Dynamically generated markdown documents grouping candidates by GPX tracks (traverses) and summit conflicts. They present evidence (elevation, location, title matching) as a reading aid to assist the reviewer. They do *not* contain or infer final choices.
- **Final Decisions**: Explicit choices recorded by a reviewer in a structured table. The primary decision table is separate from the review packets.

## 3. Storage Policy for Completed Decisions

The generated decision template is a blank template for review. The actual filled decisions must be recorded and stored under:
```text
data/03_primary/mountain_summit_candidate_decisions/2026-05-12/review_decisions.csv
```
This primary CSV must remain Git-tracked to keep a permanent, auditable record of all human judgments.

## 4. Allowed Decision Statuses

Every row in the decision table must have one of these statuses:

1. `pending_review`: Initial state. The row has not yet been reviewed.
2. `accepted`: The suggested candidate (or another candidate) is accepted as the definitive summit coordinate.
3. `accepted_with_caution`: The candidate is accepted, but note/flag calls for caution (e.g. slight elevation discrepancy or boundary mismatch).
4. `rejected_all_candidates`: All candidates inside the top-3 queue are incorrect. The mountain has GPX logs, but none of them passed over the true summit.
5. `unresolved`: The reviewer inspected the data but cannot conclusively make a decision.
6. `needs_external_map_check`: Requires checking GIS, Google My Maps, or Ehime local geographical maps to resolve.
7. `needs_redetection`: Requires re-running peak detection with different parameters.
8. `not_visited_by_available_gpx`: The mountain is a valid source record, but no GPX track in the dataset covers this region.
9. `duplicate_or_ambiguous`: The mountain record is a duplicate of another record or cannot be disambiguated.

## 5. Required Decision Fields

For any decision marked as reviewed (status other than `pending_review`), the following fields must be completed:
- `decision_status`: The chosen status.
- `accepted_summit_candidate_id`: The ID of the accepted summit candidate (blank if none).
- `rejected_summit_candidate_ids`: Pipe-separated list (`ID1|ID2`) of explicitly rejected candidate IDs.
- `needs_external_map_check`: `true` or `false`.
- `needs_redetection`: `true` or `false`.
- `decision_basis`: Brief reason (e.g. `exact_name_match`, `closest_elevation`, `manual_gsi_check`).
- `reviewer_note`: Custom note detailing observations.
- `reviewed_at`: ISO 8601 datetime string.
- `reviewer`: Identifier of the reviewer (e.g. `takas`).

## 6. Guidelines for Specific Cases

- **Accepted**: Must have a matching `accepted_summit_candidate_id`. The candidate's coordinates will become the final accepted coordinates.
- **Accepted with Caution**: Used when coordinates are accepted despite minor warnings (e.g., location mismatch where the summit is right on a municipality boundary, or elevation offset of 15–30 meters). The reason must be documented in `decision_basis`.
- **Needs External Map Check**: Used when name or elevation is highly ambiguous, or when multiple tracks show conflicting peaks. Set `needs_external_map_check` to `true` and detail what to check.
- **Needs Redetection**: Set `needs_redetection` to `true` if GPS logs exist but the peak detection algorithm clearly missed a prominent summit.

## 7. Validation Rules Before Final Coordinate Generation

Before compiling final summit coordinates (Stage 9):
1. **No Pending Rows**: No row in the decision table can have a status of `pending_review`.
2. **Key Consistency**: The `accepted_summit_candidate_id` must match a valid ID from the summit candidates dataset (unless status is not accepted).
3. **No Unresolved Blocks**: All `needs_external_map_check` and `needs_redetection` flags must be resolved.
4. **Row Count Constraint**: The final decision table must contain exactly 531 rows, representing the full set of ehime mountains.

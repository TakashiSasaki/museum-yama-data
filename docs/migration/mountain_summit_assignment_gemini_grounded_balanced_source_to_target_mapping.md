# Mountain Summit Assignment (Gemini-Grounded Balanced) Source-to-Target Mapping

## 1. Source-to-Target Mapping for Balanced Method

This table records how the fields from the input files are mapped to the target proposed summit assignment schema, including the new title enrichment activity links.

### `title_enriched_candidate_links` (`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `gpx_basename` | (N/A) | derived only | Key for joining with GPX candidates. |
| `gpx_track_name` | (N/A) | derived only | Used for reference name similarity matching. |
| `title_enriched_candidate_activities[].title` | `evidence.activity_link.titles` | partially migrated | Linked YAMAP activity titles, parsed for name evidence checking. |
| `best_candidate.title` | `evidence.activity_link.best_title` | partially migrated | Best linked YAMAP activity title, used to check for name containment. |

All other mappings from the baseline `docs/migration/mountain_summit_assignment_gemini_grounded_source_to_target_mapping.md` remain valid and are preserved.

## 2. Derived / Target Fields (Revisions for Balanced Method)

The target schema maps one-to-one to the baseline schema, with the following additions inside the `evidence` object:

* `evidence.name.name_evidence_tier`: `string` representing the name evidence classification tier (`name_exact_track_contains`, `name_exact_activity_title_contains`, `name_token_containment_strong`, `name_weak`, `name_missing`, `name_contradiction`).
* `evidence.name.name_evidence_sources`: `array of strings` listing the source fields that provided name support (e.g. `gpx_track_name`, `yamap_activity_title`).
* `evidence.municipality.compatibility`: `string` representing the municipality compatibility check classification (`municipality_exact`, `municipality_boundary_compatible`, `municipality_adjacent`, `municipality_unknown`, `municipality_mismatch`, `municipality_outside_prefecture`).
* `evidence.activity_link`: `object` containing:
  * `evidence.activity_link.best_title`: `string | null`
  * `evidence.activity_link.titles`: `array of strings`

## 3. Resolution Status
* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Blockers**: None.

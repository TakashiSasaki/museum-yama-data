# Mountain-Summit Candidate Linking v3 Source-to-Target Mapping

## 1. Classification Legend

Every field is assigned exactly one of the following classifications:

* **migrated**: The source field value is directly preserved in the v3 candidate-link record, review artifact, or manifest with the same meaning, possibly under a clearer target field name. "migrated" does not mean that the value is canonical truth. It only means the value is carried forward as a value.
* **partially migrated**: The source field value is carried forward only under defined conditions, or only in a subset of output records, or only inside a specific evidence object. Use this for fields such as Gemini grounding coordinates if they are preserved as auxiliary evidence only when usable.
* **derived only**: The source field is used to compute scores, distances, tiers, review reason codes, candidate generation strategy, ranking, or other derived fields, but the original field value is not carried forward as a primary value with the same meaning.
* **preserved as legacy reference**: The field belongs to historical or provenance context and remains available in existing source or legacy artifacts, but it is not actively carried into v3 output as a primary field.
* **preserved as raw snapshot**: The field remains preserved in immutable raw or source files and may be referenced for traceability, but v3 does not parse or semantically rely on it.
* **intentionally discarded**: The field is explicitly not used in v3, with a reason. Do not use this label to hide uncertainty.
* **unmigrated gap**: A field appears to be relevant but has no target treatment yet. This is a blocker.
* **needs decision**: The correct treatment is unclear. This is a blocker.

---

## 2. Source-to-Target Mapping

### `mountains` (`data/03_primary/mountains/ehime_mountain_source_rows.json`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `No` | `evidence.legacy_context` | preserved as legacy reference | Preserved for traceability. Replaced operationally by `mountain_no`. |
| `area` | `evidence.legacy_context` | preserved as legacy reference | Informational context only. Not used for geographic calculation. |
| `book_page` | `evidence.legacy_context` | preserved as legacy reference | Informational context only. Not used for calculation. |
| `coordinates.lat` | `mountain_csv_lat`, `evidence.csv_coordinate` | migrated | Core anchor coordinate for the mountain. |
| `coordinates.lon` | `mountain_csv_lon`, `evidence.csv_coordinate` | migrated | Core anchor coordinate for the mountain. |
| `elevation_m` | `mountain_elevation_m`, `evidence.elevation` | migrated | Core anchor elevation for the mountain. |
| `gps_raw` | `evidence.csv_coordinate` | preserved as legacy reference | Original coordinate text, preserved for provenance. |
| `mountain_no` | `mountain_no` | migrated | Primary join key for the mountain. |
| `mountain_no_source` | `evidence.legacy_context` | preserved as legacy reference | Context about the derivation of `mountain_no`. |
| `mountain_no_status` | `evidence.legacy_context` | preserved as legacy reference | Context about the status of `mountain_no`. |
| `name` | `mountain_name`, `evidence.name` | migrated | Core identifying name for the mountain. |
| `notes` | `evidence.legacy_context` | preserved as legacy reference | Contextual notes from CSV. |
| `source_row_no` | `mountain_source_row_no` | migrated | Lineage/provenance mapping back to source row. |
| `yomi` | `evidence.legacy_context` | preserved as legacy reference | Pronunciation context only. |

### `summit_candidates` (`data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `ele_m` | `candidate_ele_m`, `evidence.elevation` | migrated | Primary elevation of the summit candidate. |
| `lat` | `candidate_lat`, `evidence.summit_candidate_coordinate` | migrated | Primary latitude of the summit candidate. |
| `lon` | `candidate_lon`, `evidence.summit_candidate_coordinate` | migrated | Primary longitude of the summit candidate. |
| `source_gpx_basename` | `source_gpx_basename` | migrated | Retained for file-level provenance. |
| `source_gpx_path` | `source_gpx_path` | migrated | Retained for file-level provenance. |
| `summit_candidate_gpx_path` | `evidence.legacy_context` | preserved as legacy reference | Pre-v3 intermediate output path, not used operationally in v3. |
| `summit_candidate_id` | `summit_candidate_id` | migrated | Primary join key for the summit candidate. |
| `track_name` | `track_name`, `evidence.name` | migrated | Key naming evidence for matching. |

### `activity_links` (`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `best_candidate` | `evidence.activity_link` | partially migrated | Preserved if relevant to the final review context as auxiliary evidence. |
| `best_candidate.confidence` | `evidence.activity_link` | partially migrated | Auxiliary evidence; does not create links on its own. |
| `best_candidate.mountain_name` | `evidence.activity_link` | partially migrated | Auxiliary naming evidence. |
| `best_candidate.reason` | `evidence.activity_link` | partially migrated | Auxiliary matching context. |
| `best_candidate.title` | `evidence.activity_link` | partially migrated | Auxiliary naming evidence. |
| `best_candidate.yamap_activity_id` | `evidence.activity_link` | partially migrated | Auxiliary linkage evidence. |
| `source_gpx_basename` | (N/A) | derived only | Used for matching/joining to `summit_candidates`. Migrated via `summit_candidates` directly. |
| `source_gpx_path` | (N/A) | derived only | Used for matching/joining to `summit_candidates`. Migrated via `summit_candidates` directly. |
| `title_enriched_candidate_activities` | `evidence.activity_link` | partially migrated | Preserved as auxiliary arrays if relevant to the final candidate review. |
| `title_enriched_candidate_activities[].confidence` | `evidence.activity_link` | partially migrated | Auxiliary evidence for linking. |
| `title_enriched_candidate_activities[].matched_dates` | `evidence.activity_link` | partially migrated | Auxiliary evidence for linking. |
| `title_enriched_candidate_activities[].mountain_names` | `evidence.activity_link` | partially migrated | Auxiliary naming evidence. |
| `title_enriched_candidate_activities[].reason` | `evidence.activity_link` | partially migrated | Auxiliary matching context. |
| `title_enriched_candidate_activities[].title` | `evidence.activity_link` | partially migrated | Auxiliary naming evidence. |
| `title_enriched_candidate_activities[].yamap_activity_id` | `evidence.activity_link` | partially migrated | Auxiliary linkage evidence. |

### `grounding_reference` (`data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `grounding_evidence` | `evidence.grounding` | partially migrated | Full set of responses is auxiliary. Preserved when providing useful evidence. |
| `grounding_evidence[].confidence_score` | `evidence.grounding` | partially migrated | Auxiliary evidence confidence. |
| `grounding_evidence[].grounded_elevation_m` | `evidence.grounding` | partially migrated | Auxiliary evidence coordinates/metrics. |
| `grounding_evidence[].grounded_lat` | `evidence.grounding` | partially migrated | Auxiliary evidence coordinates/metrics. |
| `grounding_evidence[].grounded_lon` | `evidence.grounding` | partially migrated | Auxiliary evidence coordinates/metrics. |
| `grounding_evidence[].grounded_municipality` | `evidence.grounding` | partially migrated | Auxiliary evidence location context. |
| `grounding_evidence[].grounding_type` | `evidence.grounding` | partially migrated | Auxiliary evidence context. |
| `grounding_evidence[].index` | `evidence.grounding` | partially migrated | Auxiliary evidence list context. |
| `grounding_evidence[].mountain_name` | `evidence.grounding` | partially migrated | Auxiliary evidence matching name context. |
| `grounding_evidence[].source` | `evidence.grounding` | partially migrated | Auxiliary evidence source context. |
| `grounding_status` | `review_reason_codes` | derived only | Status is parsed into specific v3 review or scoring codes. |
| `has_conflicting_clusters` | `review_reason_codes` | derived only | Flag is parsed into review warnings or penalty codes. |
| `mountain_no` | (N/A) | derived only | Primary join key; already migrated from mountain source. |
| `reason` | `review_reason_codes` | derived only | Used to generate specific review logic/codes. |
| `reference_generation_date` | `evidence.legacy_context` | preserved as legacy reference | Timestamp for legacy run context. |
| `selected_grounding_elevation_m` | `evidence.grounding` | partially migrated | Best-available grounding elevation (auxiliary). |
| `selected_grounding_lat` | `evidence.grounding` | partially migrated | Best-available grounding coordinate (auxiliary). |
| `selected_grounding_lon` | `evidence.grounding` | partially migrated | Best-available grounding coordinate (auxiliary). |
| `selected_grounding_municipality` | `evidence.grounding` | partially migrated | Best-available grounding location text (auxiliary). |
| `source_mountain_name` | `evidence.legacy_context` | preserved as legacy reference | Legacy lookup term, true mountain name comes from `mountains`. |
| `source_municipality` | `evidence.legacy_context` | preserved as legacy reference | Legacy lookup term, true location info derived elsewhere. |
| `usable_coordinate_record_count` | `review_reason_codes` | derived only | Used to generate review support levels. |

### `municipality_lookup` (`data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `boundary_matches` | `evidence.municipality` | partially migrated | Copied to evidence.municipality if required for context. |
| `boundary_matches[].code` | `evidence.municipality` | partially migrated | Standard municipality code context. |
| `boundary_matches[].name` | `evidence.municipality` | partially migrated | Standard municipality name context. |
| `boundary_tolerance_m` | `review_reason_codes` | derived only | Tolerance used to generate codes, not directly preserved. |
| `data_reference_date` | `evidence.legacy_context` | preserved as legacy reference | Snapshot date. |
| `lat` | (N/A) | derived only | Join/context key, handled via summit candidate. |
| `lon` | (N/A) | derived only | Join/context key, handled via summit candidate. |
| `lookup_status` | `review_reason_codes` | derived only | Parsed into stability warnings. |
| `municipality_matches` | `evidence.municipality` | migrated | Core administrative context for the candidate. |
| `municipality_matches[].code` | `evidence.municipality` | migrated | Core administrative context. |
| `municipality_matches[].distance_to_boundary_m` | `evidence.municipality` | migrated | Core administrative boundary context. |
| `municipality_matches[].name` | `evidence.municipality` | migrated | Core administrative context. |
| `municipality_matches[].relationship` | `evidence.municipality` | migrated | Core administrative boundary context. |
| `notes` | `review_reason_codes` | derived only | Parsed for warnings or issues. |
| `prefecture` | `evidence.municipality` | partially migrated | Context. |
| `prefecture_code` | `evidence.municipality` | partially migrated | Context. |
| `primary_municipality_code` | `evidence.municipality` | migrated | Core administrative location. |
| `primary_municipality_name` | `evidence.municipality` | migrated | Core administrative location. |
| `source_dataset` | `evidence.municipality` | partially migrated | Provenance context for the lookup. |
| `source_record_id` | (N/A) | derived only | Used for joining (`summit_candidate_id`). |

### `municipality_stability` (`data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl`)

| Source Field | Target Field / Section | Classification | Reason / Usage |
| :--- | :--- | :--- | :--- |
| `all_cardinal_1km_same` | `review_reason_codes` | derived only | Boolean parsed into stability scoring/warnings. |
| `boundary_tolerance_m` | (N/A) | derived only | Used to calculate stability. |
| `center_distance_to_boundary_m` | `evidence.municipality` | partially migrated | Available via lookup, used occasionally. |
| `center_lookup_status` | (N/A) | derived only | Passed to stability logic. |
| `center_municipality_code` | (N/A) | derived only | Duplicate of lookup primary code. |
| `center_municipality_name` | (N/A) | derived only | Duplicate of lookup primary name. |
| `data_reference_date` | `evidence.legacy_context` | preserved as legacy reference | Snapshot date. |
| `distance_stable_interior` | `review_reason_codes` | derived only | Boolean parsed into stability scoring/warnings. |
| `east_lookup` | `evidence.municipality` | partially migrated | Offset context. |
| `lat` | (N/A) | derived only | Search coordinate context. |
| `lon` | (N/A) | derived only | Search coordinate context. |
| `municipality_stability` | `review_reason_codes` | derived only | String value parsed into stability codes. |
| `municipality_stability_reason_codes` | `review_reason_codes` | derived only | Array mapped to new v3 review codes. |
| `north_lookup` | `evidence.municipality` | partially migrated | Offset context. |
| `notes` | `review_reason_codes` | derived only | Parsed for stability warnings. |
| `offset_m` | `evidence.legacy_context` | preserved as legacy reference | Static configuration of the run. |
| `prefecture` | `evidence.municipality` | partially migrated | Context. |
| `prefecture_code` | `evidence.municipality` | partially migrated | Context. |
| `source_dataset` | `evidence.municipality` | partially migrated | Provenance context. |
| `south_lookup` | `evidence.municipality` | partially migrated | Offset context. |
| `stable_interior_threshold_m` | `evidence.legacy_context` | preserved as legacy reference | Static configuration of the run. |
| `summit_candidate_id` | (N/A) | derived only | Join key, already handled. |
| `west_lookup` | `evidence.municipality` | partially migrated | Offset context. |

*(Note: Nested properties under directional lookups like `east_lookup.lat`, `east_lookup.lookup_status`, `east_lookup.municipality_matches[].name`, etc. follow the classification of their parent `east_lookup` as `partially migrated` when used in context, or `derived only` when used to verify stability.)*

---

## 3. Derived / Target Fields

The following fields in the v3 target schema are generated solely during the execution of the candidate-linking process and have no single one-to-one source field mapping, but represent aggregations, computations, or cross-references across multiple inputs.

| Target Field | Classification | Derivation Source |
| :--- | :--- | :--- |
| `combined_candidate_score` | derived only | Calculated during execution using location distance, elevation diff, and textual evidence. |
| `candidate_rank_for_mountain` | derived only | Computed after candidate generation by grouping links by `mountain_no` and sorting by `combined_candidate_score`. |
| `candidate_rank_for_summit_candidate` | derived only | Computed after candidate generation by grouping links by `summit_candidate_id` and ranking candidate mountains deterministically by score and tie-breakers. |
| `candidate_generation_strategy` | derived only | Strategy metadata assigned during the processing step. |
| `match_status` | derived only | Assigned based on scoring and review policies. |
| `confidence` | derived only | Aggregated text/value representing the overall quality of the match. |
| `needs_human_review` | derived only | Flag assigned if specific `review_reason_codes` are generated indicating uncertainty or boundary conditions. |

---

## 4. Resolution Status

* **Unmigrated Gaps**: 0
* **Needs Decision**: 0
* **Blockers**: None.
* **Confirmation Statement**: Every source field identified in the input data has been assigned exactly one classification. No field remains "needs decision" or "unmigrated gap".

# GPX-YAMAP Title-Enriched Linking Mapping

This document details the source-to-target field mapping classifications for enriching GPX-YAMAP candidate links with title similarity evidence.

## Field Classifications

Every source field from the input datasets is classified here to ensure full traceability and accountability during this processing stage.

### From `date_candidate_links.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `gpx_path` | `gpx_path` | `migrated` | Path to the original raw GPX file. |
| `gpx_basename` | `gpx_basename` | `migrated` | Basename of the original raw GPX file. |
| `gpx_sha256` | `gpx_sha256` | `migrated` | SHA256 of the original raw GPX file. |
| `gpx_filename_datetime_raw` | `gpx_filename_datetime_raw` | `migrated` | Raw datetime string from filename. |
| `candidate_dates_jst` | `candidate_dates_jst` | `migrated` | Inferred candidate dates under timezone assumptions. |
| `candidate_yamap_activities` | N/A | `intentionally discarded` | Replaced by structured `title_enriched_candidate_activities` and `best_candidate` arrays. |
| `candidate_yamap_activities[].yamap_activity_id` | `title_enriched_candidate_activities[].yamap_activity_id` | `migrated` | YAMAP activity ID. |
| `candidate_yamap_activities[].yamap_markdown_path` | `title_enriched_candidate_activities[].yamap_markdown_path` | `migrated` | Path to YAMAP markdown file. |
| `candidate_yamap_activities[].yamap_markdown_sha256` | `title_enriched_candidate_activities[].yamap_markdown_sha256` | `migrated` | SHA256 of YAMAP markdown file. |
| `candidate_yamap_activities[].activity_date` | `title_enriched_candidate_activities[].activity_date` | `migrated` | Activity date from YAMAP. |
| `candidate_yamap_activities[].title` | `title_enriched_candidate_activities[].title` | `migrated` | Activity title from YAMAP. |
| `candidate_yamap_activities[].matched_gpx_date_assumptions` | `title_enriched_candidate_activities[].matched_gpx_date_assumptions` | `migrated` | Matching date assumptions. |
| `candidate_count` | N/A | `intentionally discarded` | Replaced by `date_candidate_count`. |
| `match_status` | N/A | `intentionally discarded` | Replaced by `date_match_status` and `enriched_match_status`. |
| `confidence` | N/A | `intentionally discarded` | Replaced by `enriched_confidence`. |
| `timezone_ambiguity` | `timezone_ambiguity` | `migrated` | Flag indicating timezone parsing ambiguity. |
| `timezone_sensitive` | `timezone_sensitive` | `migrated` | Flag indicating timezone sensitivity. |
| `evidence` | N/A | `intentionally discarded` | Replaced by detailed enriched evidence. |
| `needs_review` | N/A | `intentionally discarded` | Replaced by enriched `needs_review` logic. |
| `notes` | N/A | `intentionally discarded` | Replaced by enriched notes. |

### From `gpx_filename_index.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `gpx_path` | N/A | `preserved as raw snapshot` | Already mapped in baseline date links. |
| `gpx_basename` | N/A | `preserved as raw snapshot` | Already mapped in baseline date links. |
| `gpx_sha256` | N/A | `preserved as raw snapshot` | Already mapped in baseline date links. |
| `gpx_filename_datetime_raw` | N/A | `preserved as raw snapshot` | Already mapped in baseline date links. |
| `filename_as_jst` | N/A | `intentionally discarded` | Not needed for title enrichment features. |
| `filename_as_utc_to_jst` | N/A | `intentionally discarded` | Not needed for title enrichment features. |
| `candidate_dates_jst` | N/A | `intentionally discarded` | Already mapped in baseline date links. |
| `timezone_ambiguity` | N/A | `intentionally discarded` | Already mapped in baseline date links. |
| `timezone_sensitive` | N/A | `intentionally discarded` | Already mapped in baseline date links. |
| `inference_method` | N/A | `intentionally discarded` | Not needed. |
| `filename_pattern` | N/A | `intentionally discarded` | Not needed. |
| `parse_status` | N/A | `intentionally discarded` | Not needed. |
| `notes` | N/A | `intentionally discarded` | Not needed. |

### From `yamap_activity_index.jsonl`

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `yamap_activity_id` | N/A | `preserved as raw snapshot` | Mapped in baseline date links. |
| `yamap_markdown_path` | N/A | `preserved as raw snapshot` | Mapped in baseline date links. |
| `yamap_markdown_sha256` | N/A | `preserved as raw snapshot` | Mapped in baseline date links. |
| `activity_date` | N/A | `preserved as raw snapshot` | Mapped in baseline date links. |
| `title` | N/A | `preserved as raw snapshot` | Mapped in baseline date links. |
| `parse_status` | N/A | `intentionally discarded` | Not needed. |
| `notes` | N/A | `intentionally discarded` | Not needed. |

### From GPX manifest.json (Files list)

| Source Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `source_gpx_path` | N/A | `derived only` | Used to join with date links record. |
| `output_gpx_path` | N/A | `intentionally discarded` | Not needed in enrichment output. |
| `track_name` | `gpx_track_name` | `migrated` | Extracted GPX track name. |
| `summit_candidate_count` | N/A | `intentionally discarded` | Summit candidate count not needed here. |
| `candidate_ids` | N/A | `intentionally discarded` | Summit candidate IDs not needed here. |

### Derived Fields

| Derived Field | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `gpx_track_name` | `gpx_track_name` | `migrated` | The name of the track extracted from GPX. |
| `normalized_gpx_track_name` | `normalized_gpx_track_name` | `derived only` | Unicode normalized and cleaned track name. |
| `normalized_yamap_title` | `title_enriched_candidate_activities[].normalized_yamap_title` | `derived only` | Unicode normalized and cleaned activity title. |
| `title_similarity_score` | `title_enriched_candidate_activities[].title_similarity_score` | `derived only` | Computed text similarity score (0..1). |
| `title_exact_match` | `title_enriched_candidate_activities[].title_exact_match` | `derived only` | Boolean exact match flag on normalized strings. |
| `title_token_overlap` | `title_enriched_candidate_activities[].title_token_overlap` | `derived only` | Jaccard index overlap ratio. |
| `shared_title_tokens` | `title_enriched_candidate_activities[].shared_title_tokens` | `derived only` | Delimiter-split tokens present in both names. |
| `gpx_only_title_tokens` | `title_enriched_candidate_activities[].gpx_only_title_tokens` | `derived only` | Tokens present only in GPX. |
| `yamap_only_title_tokens` | `title_enriched_candidate_activities[].yamap_only_title_tokens` | `derived only` | Tokens present only in YAMAP. |
| `date_candidate_rank` | `title_enriched_candidate_activities[].candidate_rank` | `derived only` | Sorted candidate rank. |
| `title_evidence_level` | `title_enriched_candidate_activities[].title_evidence` | `derived only` | Summary of title overlap evidence. |
| `date_evidence_level` | `title_enriched_candidate_activities[].date_evidence` | `derived only` | Summary of date overlap evidence. |
| `combined_activity_link_score` | `combined_activity_link_score` | `derived only` | Summary score for best match. |
| `enriched_match_status` | `enriched_match_status` | `derived only` | The final status code after title matching. |
| `enriched_confidence` | `enriched_confidence` | `derived only` | The confidence tier assigned (high, medium, low, none). |
| `review_reason_codes` | `review_reason_codes` | `derived only` | Detailed codes detailing manual review triggers. |

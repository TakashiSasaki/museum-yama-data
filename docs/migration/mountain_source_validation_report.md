# Mountain Source Validation Report

> **Supersession note:**
> This report records a historical validation run under the previous 501-only invariant. That invariant has been superseded for future target modeling. The subsequent policy that used physical CSV row numbers for fill values is also superseded. Future validation must verify the latest sequence-fill acceptance rule: existing non-empty `No` values must be contiguous from 1, blank source `No` rows are filled sequentially after max existing `No`, and duplicate/non-contiguous effective values are fatal. See `docs/migration/mountain_numbering_and_coordinate_policy.md` and `docs/migration/mountain_source_full_rows_validation_plan.md`.

## Summary
- **overall_status**: PASS_WITH_WARNINGS
- **generated_by_command**: validate-mountain-sources
- **authoritative_record_count**: 501 (Satisfied)
- **expected_key_set**: 1..501 (Satisfied)
- **blank_no_excluded_count**: 30
- **key conclusion**: The required CSV invariant is assessable, but a documented design decision blocks future conversion until all fields are classified.

## Inputs
- **CSV path**: Provided, status: PASS
- **Legacy merged JSON**: Provided
- **Legacy link mapping JSON**: Provided
- **Legacy summit coordinates JSON**: Provided
- **Web mountains JSON**: Provided

## CSV Authoritative Source Validation
- **total data rows**: 531
- **non-empty No count**: 501
- **blank No count**: 30
- **integer No count**: 501
- **uniqueness**: Yes
- **expected range coverage**: Yes
- **status**: PASS

## Legacy JSON Schema References
### processed/mountain_merged.json
- **top-level type**: array
- **item count**: 531
- **No presence summary**: 501 integer, 30 blank
- **mountain_no presence summary**: Not present
- **field inventory summary**: GPXファイル名, No, YAMAPアクティビティID, ele_diff, ele_gps, lat, lon, match_method, エントリーコースお勧め山, 備考, 山名, 市町村, 標高, 標高_official, 難易度ランク
- **status / notes**: PASS_WITH_WARNINGS (Legacy schema). Adaptation from No to mountain_no is required.

### processed/mountain_link_mapping.json
- **top-level type**: array
- **item count**: 531
- **No presence summary**: 501 integer, 30 blank
- **mountain_no presence summary**: Not present
- **field inventory summary**: GPXファイル名, No, YAMAPアクティビティID, エントリーコースお勧め山, 備考, 山名, 市町村, 標高, 難易度ランク
- **status / notes**: PASS_WITH_WARNINGS (Legacy schema). Schema/evidence reference only.

### processed/mountain_summit_coordinates.json
- **top-level type**: array
- **item count**: 531
- **No presence summary**: 501 integer, 30 blank
- **mountain_no presence summary**: Not present
- **field inventory summary**: GPXファイル名, No, ele_diff, ele_gps, lat, lon, match_method, 山名, 標高_official
- **status / notes**: PASS_WITH_WARNINGS (Legacy schema). Schema/evidence reference only.

## Legacy Web Cache
### museum-yama-web/mountains.json
- **top-level type**: object
- **key count**: 523
- **key style**: name-like strings
- **field inventory summary**: activities, agent_survey_data, csv_gps_data, gpx_summit_data, municipalities
- **status / notes**: PASS_WITH_WARNINGS (Legacy web cache). Legacy web cache/evidence only, not primary-key source.

## Conclusions
- **whether CSV authoritative invariant is satisfied**: Yes
- **whether legacy No can be adapted to mountain_no**: Yes, by adapting non-empty legacy No.
- **whether blank/null No records are excluded**: Yes, they are present but logically excluded from authoritative count.
- **blockers before canonical resolved JSON generation**: Field classifications for legacy references and sources must be fully decided ('needs_decision', etc). Canonical output cannot be generated until this is completed. *(Note: see supersession note above regarding the 501-only invariant)*.

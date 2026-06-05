---
name: yama-data-pipeline
description: Consolidated skill for local mountaineering data processing including intake, merging, annotating, validation, tracking missing YAMAP files, and GPX track consistency verification.
---

# yama-data-pipeline

This skill provides a unified CLI for managing local GPX and CSV data in the Yama Museum repository.

## Installation

Ensure dependencies are installed before running:

```sh
cd .agents/skills/yama-data-pipeline
npm install
```

## Usage

The skill provides a single CLI entrypoint: `cli.js`.

Legacy repository-layout commands require `--root`: `merge`, `annotate`, `validate`, `find-missing`, and `verify`.
The portable commands (`intake`, `detect-candidates`, `validate-mountain-sources`, `validate-provider-received`, `complete-mountain-source-no`) do not require `--root` and instead take explicit input and output paths.

### Commands

*   `intake`: Portable GPX archive extraction.
*   `extract-excel-sheets`: Portable Excel sheet extraction.

#### 1. `intake` (Portable)
Portable GPX archive extraction command. Safely extracts GPX files from a ZIP archive into an explicit directory.
- Requires `--input` (path to input ZIP archive) and `--out-dir` (path to output directory).
- Optionally accepts `--report` (path to output markdown report file).
- Extracts only `.gpx` entries from the archive and ignores other files (e.g. XLSX) and directories.
- Flattens internal ZIP paths by basename. Duplicate flattened GPX basenames are fatal.
- Output filename collisions are fatal. It never renames or overwrites existing files.
- Extraction is all-or-nothing (atomic). On any failure, no partial output remains in the output directory.
- Does not move source files to `processed/` or create CSV files.
- For repository conventions, Yoshitomi outputs should be routed to `data/01_raw/gpx/yoshitomi/<date>/`.

```sh
node cli.js intake \
  --input ../../../data/01_raw/provider_received/yoshitomi/1980-01-01/GPXファイル.zip \
  --out-dir ../../../data/01_raw/gpx/yoshitomi/1980-01-01 \
  --report ../../../docs/migration/yoshitomi_gpx_archive_extraction_report.md
```

#### 2. `merge`
Merges raw GPX tracks in `gpx/raw/` by year.
- Preserves all `<trk>` elements using XML parsing (requires `@xmldom/xmldom`).
- Outputs merged files to `gpx/merged-by-year/`.
- Does not modify source files in `gpx/raw/`.

```sh
node cli.js merge --root ../../..
```

#### 3. `detect-candidates` (Portable)
Detects unverified summit candidates algorithmically from GPX tracks and outputs them as a CSV, using only GPX-derived evidence. **Note: This is the preferred modern command for summit candidate detection.**
- Accepts either a single GPX file or a directory containing GPX files via `--input`.
- Does not recursively scan subdirectories unless a future option is added.
- Writes unresolved candidates to the specified `--out` CSV file.
- Outputs unresolved candidates only; it does not assign mountain names.
- Does not require or use CSVs, YAMAP markdown, or reverse geocoding data.
- Does not modify input GPX files or write annotated GPX files.
- Generates stable non-semantic `summit_candidate_id` hashes based on the GPX basename, trackpoint index, and detection parameters.

```sh
node cli.js detect-candidates --input ../../../gpx/raw --out ../../../docs/migration/summit_candidates_skill_preview.csv
node cli.js detect-candidates --input ./test/fixtures/sample.gpx --out ./tmp/candidates.csv
```

#### 3b. `generate-summit-candidate-gpx` (Portable)
Generates a valid summit-candidate GPX file for each source GPX file, preserving track coordinates and adding unresolved candidate waypoints.
- Accepts either a single GPX file or a directory containing GPX files via `--input`.
- Writes output GPX files to `--out-dir`.
- Requires `--report` and `--manifest` paths.
- All-or-nothing atomicity. Target collision checks fail by default.
- Outputs unresolved candidates only; it does not assign mountain names.
- Restricts GPX changes to `<metadata>` updates, `<wpt>` additions, and `creator`.

```sh
node cli.js generate-summit-candidate-gpx \
  --input "data/01_raw/gpx/2026-05-12" \
  --out-dir "data/08_reporting/gpx/summit_candidates/2026-05-12" \
  --report "docs/migration/summit_candidate_gpx_generation_report.md" \
  --manifest "data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json"
```

#### 3c. `link-gpx-yamap-by-date` (Portable)
Links GPX tracks to YAMAP activity Markdown records using timezone-aware datetimes.
- Resolves raw GPX filename datetimes under both JST and UTC-to-JST conversions to explicitly handle calendar date boundary offsets.
- Generates file indexes, candidate links, review queues (CSV/Markdown), and status reports.
- Creating final canonical links in `data/03_primary/` is out of scope for this command.
- Requires `--gpx-dir`, `--yamap-dir`, `--out-dir`, `--intermediate-dir`, `--review-dir`, and `--report`.

```sh
node cli.js link-gpx-yamap-by-date \
  --gpx-dir "data/01_raw/gpx/2026-05-12" \
  --yamap-dir "data/01_raw/yamap_markdown" \
  --out-dir "data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12" \
  --intermediate-dir "data/02_intermediate/activity_linking" \
  --review-dir "data/08_reporting/activity_linking/gpx_yamap_review_queue/2026-05-12" \
  --report "docs/migration/gpx_yamap_date_linking_report.md"
```

#### 3d. `annotate` (Legacy)
Detects peaks and annotates tracks with `<wpt>` elements. **Note: This command is legacy because it assigns mountain names and writes annotated GPX. The portable `detect-candidates` command is the preferred modern alternative for detection.**
- Reads files from `gpx/raw/`.
- Uses mountain databases in `csv/` to map detected elevations to known peaks.
- Outputs annotated files to `gpx/annotated/`.
- Does not modify source files in `gpx/raw/`.

```sh
node cli.js annotate --root ../../..
```

#### 4. `validate-mountain-sources` (Portable)
Validates the current CSV and legacy JSON artifacts against schema invariants.
- Requires `--csv` (path to source CSV) and `--out` (path to output validation report markdown file).
- Optionally accepts paths to legacy JSON artifacts for schema reference: `--legacy-merged`, `--legacy-link-mapping`, `--legacy-summit-coordinates`, `--web-mountains`.
- Reports status and structural findings into the specified markdown file without throwing on validation issues (only throws on hard IO or arg parsing errors).

```sh
node cli.js validate-mountain-sources \
  --csv ../../../csv/えひめの山_愛媛県の山.csv \
  --legacy-merged ../../../processed/mountain_merged.json \
  --out ../../../docs/migration/mountain_source_validation_report.md
```

#### 4b. `validate-provider-received` (Portable)
Audits the provider-received raw source intake area and generates an inventory report.
- Requires `--input` (path to provider_received directory) and `--out` (path to output report markdown file).
- Optionally accepts `--manifest-dir` (path to directory containing manifest files).
- Checks directory layout constraints (`<provider_slug>/<received_date>/<original_filename>`).
- Calculates checksums and verifies them against manifests if provided.
- Generates a markdown report summarizing the findings.
- Exits successfully (0) even if warnings or validation failures are found, but throws on hard execution errors like missing input paths.

```sh
node cli.js validate-provider-received \
  --input ../../../data/01_raw/provider_received \
  --manifest-dir ../../../docs/migration/provider_received_manifests \
  --out ../../../docs/migration/provider_received_inventory_report.md
```

#### 4c. `complete-mountain-source-no` (Portable)
Completes blank No values in a mountain source CSV file.
- Requires `--input` (path to extracted mountain source CSV).
- Requires `--out` (path to output completed CSV).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report markdown).

```sh
node cli.js complete-mountain-source-no \
  --input data/02_intermediate/activity_logs/csv_extracted/2026-05-18/愛媛県の山.csv \
  --out data/02_intermediate/mountain_source/no_completed/2026-05-18/ehime_mountain_source_rows_no_completed.csv \
  --manifest data/02_intermediate/mountain_source/no_completed/2026-05-18/manifest.json \
  --report docs/migration/mountain_source_no_completion_report.md
```

#### 4d. `normalize-mountain-source-json` (Portable)
Normalizes a No-completed mountain source CSV into structured JSON.
- Requires `--input` (path to No-completed CSV).
- Requires `--out` (path to output JSON).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report markdown).

```sh
node cli.js normalize-mountain-source-json \
  --input data/02_intermediate/mountain_source/no_completed/2026-05-18/ehime_mountain_source_rows_no_completed.csv \
  --out data/03_primary/mountains/ehime_mountain_source_rows.json \
  --manifest data/03_primary/mountains/manifest.json \
  --report docs/migration/mountain_source_json_normalization_report.md
```

#### 4e. `extract-summit-candidate-features` (Portable)
Extracts summit candidate waypoints from generated GPX files into a structured JSONL feature dataset.
- Requires `--gpx-dir` (path to directory containing summit-candidate GPX files).
- Requires `--input-manifest` (path to input manifest.json).
- Requires `--out` (path to output JSONL).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report markdown).

```sh
node cli.js extract-summit-candidate-features \
  --gpx-dir "data/08_reporting/gpx/summit_candidates/2026-05-12" \
  --input-manifest "data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json" \
  --out "data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl" \
  --manifest "data/03_primary/summit_candidates/2026-05-12/manifest.json" \
  --report "docs/migration/summit_candidate_feature_extraction_report.md"
```

#### 4f. `extract-reverse-geocoding-point-index` (Portable)
Extracts raw Nominatim JSON cache responses into an intermediate geocoded point index JSONL dataset.
- Requires `--input-dir` (path to directory containing raw Nominatim JSON cache files).
- Requires `--out` (path to output JSONL).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report markdown).

```sh
node cli.js extract-reverse-geocoding-point-index \
  --input-dir "data/01_raw/reverse_geocoding/raw/nominatim" \
  --out "data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl" \
  --manifest "data/02_intermediate/reverse_geocoding/extracted/nominatim/manifest.json" \
  --report "docs/migration/reverse_geocoding_point_index_report.md"
```

#### 4g. `enrich-summit-candidates-with-reverse-geocoding` (Portable)
Enriches summit candidates with nearby reverse geocoding point evidence.
- Requires `--summit-candidates` (path to summit_candidates.jsonl).
- Requires `--geocoded-points` (path to geocoded_points_index.jsonl).
- Requires `--out` (path to output enriched JSONL).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report markdown).
- Optionally accepts `--radius-m` (default 1000).

```sh
node cli.js enrich-summit-candidates-with-reverse-geocoding \
  --summit-candidates "data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl" \
  --geocoded-points "data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl" \
  --out "data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl" \
  --manifest "data/04_feature/location_enrichment/summit_candidates/2026-05-12/manifest.json" \
  --report "docs/migration/summit_candidate_location_evidence_report.md" \
  --radius-m 1000
```

#### 4h. `enrich-gpx-yamap-links-by-title` (Portable)
Enriches GPX-YAMAP date candidate links with Japanese-safe title similarity features (exact matching, Jaccard token overlap, substring containment), proposes the best candidate, and creates review queues.
- Requires `--date-links` (path to date-only candidate links JSONL).
- Requires `--gpx-manifest` (path to GPX manifest JSON).
- Requires `--out-dir` (path to output directory).
- Requires `--review-dir` (path to output review queue directory).
- Requires `--report` (path to output report markdown file).

```sh
node cli.js enrich-gpx-yamap-links-by-title \
  --date-links "data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/date_candidate_links.jsonl" \
  --gpx-manifest "data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json" \
  --out-dir "data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12" \
  --review-dir "data/08_reporting/activity_linking/gpx_yamap_review_queue/2026-05-12" \
  --report "docs/migration/gpx_yamap_title_enriched_linking_report.md"
```

#### 4i. `generate-mountain-summit-candidate-links` (Portable)
Generates candidate links between mountain_no records and summit candidates, incorporating name token matching, elevation offsets, distance between CSV/GPX coordinates, reverse-geocoding administrative locations, and activity linking.
- Requires `--mountains` (path to mountains primary JSON).
- Requires `--summit-candidates` (path to summit candidates JSONL).
- Requires `--location-evidence` (path to location evidence JSONL).
- Requires `--activity-links` (path to title-enriched activity links JSONL).
- Requires `--out` (path to output candidate links JSONL).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--review-csv` (path to output review queue CSV).
- Requires `--review-md` (path to output review queue Markdown).
- Requires `--report` (path to output report Markdown).
- All-or-nothing behavior: performs safety collision checks, staging directory verification, and post-write parse validations.
- Non-goals: Does not make final identity assignments, does not generate final summit coordinates, and does not alter input datasets.
- Review Semantics: Produces review CSV/Markdown focusing on ambiguous cases (summit candidates matched to multiple mountains) and rows requiring manual review.

```sh
node cli.js generate-mountain-summit-candidate-links \
  --mountains "data/03_primary/mountains/ehime_mountain_source_rows.json" \
  --summit-candidates "data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl" \
  --location-evidence "data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl" \
  --activity-links "data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl" \
  --out "data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl" \
  --manifest "data/04_feature/mountain_summit_candidate_links/2026-05-12/manifest.json" \
  --review-csv "data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_queue.csv" \
  --review-md "data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_queue.md" \
  --report "docs/migration/mountain_summit_candidate_linking_report.md"
```

#### 4j. `refine-mountain-summit-candidate-links-by-location` (Portable)
Refines existing candidate links using detailed reverse-geocoding municipality/island evidence, re-ranks them, and produces a prioritized review queue.
- Requires `--mountains` (path to mountain source JSON).
- Requires `--candidate-links` (path to candidate links JSONL).
- Requires `--location-evidence` (path to location evidence JSONL).
- Requires `--out` (path to output candidate links JSONL).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--review-csv` (path to output review queue CSV).
- Requires `--review-md` (path to output review queue Markdown).
- Requires `--report` (path to output report Markdown).
- Re-scores candidates using: `location_refined_candidate_score = 0.85 * combined_candidate_score + 0.15 * location_refinement_score`.
- Re-ranks candidates within both mountain and summit candidate scopes.
- Classifies review priority as `high`, `medium`, `low`, or `deprioritized`.

```sh
node cli.js refine-mountain-summit-candidate-links-by-location \
  --mountains "data/03_primary/mountains/ehime_mountain_source_rows.json" \
  --candidate-links "data/04_feature/mountain_summit_candidate_links/2026-05-12/candidate_links.jsonl" \
  --location-evidence "data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl" \
  --out "data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl" \
  --manifest "data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_manifest.json" \
  --review-csv "data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_refined_review_queue.csv" \
  --review-md "data/08_reporting/mountain_summit_candidate_review/2026-05-12/location_refined_review_queue.md" \
  --report "docs/migration/mountain_summit_candidate_location_refinement_report.md"
```

#### 4k. `generate-compact-mountain-summit-review-queues` (Portable)
Generates compact review queues and conflict-group reports from the location-refined candidate links.
- Requires `--refined-links` (path to location-refined candidate links JSONL).
- Requires `--out-dir` (path to output directory).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report Markdown).
- Performs safety checks, row count validation (exactly 531 rows in Top-1), and relative path verification.

```sh
node cli.js generate-compact-mountain-summit-review-queues \
  --refined-links "data/04_feature/mountain_summit_candidate_links/2026-05-12/location_refined_candidate_links.jsonl" \
  --out-dir "data/08_reporting/mountain_summit_candidate_review/2026-05-12" \
  --manifest "data/08_reporting/mountain_summit_candidate_review/2026-05-12/compact_review_manifest.json" \
  --report "docs/migration/mountain_summit_candidate_review_queue_compression_report.md"
```

#### 4l. `generate-mountain-summit-review-packets` (Portable)
Generates conflict-group review packets (GPX traverse groups and summit conflicts) and a human decision template from the compact review queues.
- Requires `--review-dir` (path to compact review queue directory).
- Requires `--out-dir` (path to output directory for packets).
- Requires `--decision-template` (path to output decision template CSV).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report Markdown).
- Performs all-or-nothing staging checks, row count validation (exactly 531 rows), index link checks, and relative path verification.

```sh
node cli.js generate-mountain-summit-review-packets \
  --review-dir "data/08_reporting/mountain_summit_candidate_review/2026-05-12" \
  --out-dir "data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packets" \
  --decision-template "data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_decisions_template.csv" \
  --manifest "data/08_reporting/mountain_summit_candidate_review/2026-05-12/review_packet_manifest.json" \
  --report "docs/migration/mountain_summit_candidate_review_packet_report.md"
```

#### 4m. `generate-ehime-municipality-adjacency` (Portable)
Validates and generates topological land-adjacency data for the 20 municipalities in Ehime Prefecture from intermediate N03 GeoJSON data.
- Requires `--n03-geojson` (path to intermediate GeoJSON file).
- Requires `--raw-manifest` (path to raw ingestion manifest).
- Requires `--extracted-manifest` (path to intermediate extracted manifest).
- Requires `--out-dir` (path to output directory).
- Requires `--manifest` (path to output manifest JSON).
- Requires `--report` (path to output report markdown).
- Performs all-or-nothing temporary staging, output collision prevention, data validation, and relative path checks.

```sh
node cli.js generate-ehime-municipality-adjacency \
  --n03-geojson "data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/extracted/N03-20260101_38_GML/N03-20260101_38.geojson" \
  --raw-manifest "data/01_raw/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json" \
  --extracted-manifest "data/02_intermediate/reference/geospatial/ksj_administrative_area/N03/2026-01-01/manifest.json" \
  --out-dir "data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01" \
  --manifest "data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/manifest.json" \
  --report "docs/migration/ksj_n03_ehime_municipality_adjacency_validation_report.md"
```

#### 5. `validate` (Legacy)
Validates all processed GPX (`raw/`, `merged-by-year/`, `annotated/`) and CSV files.
- Checks for well-formed XML and geospatial elements.
- Checks coordinate bounds, elevations, and times.
- Elevation `<ele>` tags are strictly required on all trackpoints. Although GPX itself may allow trackpoints without elevation, this repository requires `<ele>` on all trackpoints because elevation profiles are used for validation and peak annotation. Missing or non-numeric elevation tags will result in validation failure.
- Verifies CSV row structure and mountain altitude parsing. Note: The CSV parser fully supports reading embedded newlines within quoted fields.
- Exits with a non-zero status code if invalid files are found.
- Note: The `--strict` option has been removed, as the pipeline now naturally requires elevation data and strictly checks all directories.

```sh
node cli.js validate --root ../../..
```

#### 6. `find-missing`
Finds YAMAP activities referenced in CSV files that do not have a corresponding Markdown file in the `yamap/` directory.
- Reads and parses all `.csv` files under the `csv/` directory to extract YAMAP activity URLs (`https://yamap.com/activities/[ID]`).
- Compares those IDs with the files in the `yamap/` directory (`[ID].md`).
- Lists all missing activity IDs for easy downloading.

```sh
node cli.js find-missing --root ../../..
```

#### 7. `verify`
Verifies consistent matching between GPX files in `gpx/annotated/` and YAMAP activity Markdown records in `yamap/`.
- Parses dates and titles from the YAMAP markdown files.
- Extracts names and dates from the GPX files (using the XML DOM and JST time conversion, with filename fallback).
- Matches files based on exact, partial/substring, and date-only fallback logic.
- Displays match counts and details of unmatched tracks.

```sh
node cli.js verify --root ../../..
```

#### 8. `test`
Runs the internal test suite against synthetic fixtures.

```sh
node cli.js test
```

## Directory Assumptions

- `gpx/raw/`: The main source of truth for individual unedited GPX tracks.
- `gpx/merged-by-year/`: Automatically generated year-based consolidated tracks.
- `gpx/annotated/`: Automatically generated GPX files with detected waypoints.
- `csv/`: Data tables containing summit definitions and other metadata.
- `yamap/`: Markdown records of fetched YAMAP activities containing title, date, description, etc.
- `processed/`: Historical archive containing original files processed by the old workflow.

## Safety Guarantees
- No data loss during collisions: During ZIP `intake`, entries are flattened by basename. If two ZIP entries would map to the same basename, or if a basename already exists in the target directory, `intake` fails instead of renaming. This prevents silent overwrite and ambiguous data provenance. `intake` is an all-or-nothing portable command.
- Path traversal protection: Safe extraction ensures ZIP entries don't write outside intended directories.
- No source modifications: `merge` and `annotate` never edit `gpx/raw/`.

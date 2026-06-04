# Yama Museum - Agent & Collaborator Guide

This repository contains tools and data for analyzing mountaineering location data obtained from the **YAMAP** app, based on the records of **Professor Yoshitomi of Ehime University**.

## Repository Purpose
The goal is to build a web application that visualizes and analyzes GPX tracks and activity logs. 
- **Visualization Link**: [Google My Maps](https://www.google.com/maps/d/edit?mid=1-hJRCtAmD6DF9-nMQOwftdz7v5vVTWo&usp=sharing)
- This is a private repository used as a data workspace. The goal is to preserve work progress, build an auditable dataset, and prepare for a reproducible data pipeline.

## Human/Agent Shared Operating Contract

This contract bounds the decisions and behaviors of humans and AI coding agents operating in this repository.

### Rules & Responsibilities

- **Data Preservation Rules:**
  - **MUST NOT** delete, move, rename, overwrite, deduplicate, or regenerate existing data unless a source coverage audit has been completed and the migration plan explicitly covers the affected paths.
  - **MUST** treat existing raw/source data as historical evidence. Raw data is immutable.
  - **MUST** preserve manually curated records unless explicitly classified and mapped.
  - **MUST** document old path to new path mappings before any future file relocation.
  - **Resolved Mountain JSON Schema**: The authoritative primary key is `mountain_no`. The future output filename is undecided, and no generated resolved JSON exists yet. See `docs/migration/resolved_mountain_json_schema_contract.md` and `docs/migration/mountain_source_validation_report.md` for the canonical schema references and validation report.
  - **MUST** classify every source field or source file before migration as one of:
    - migrated
    - partially migrated
    - derived only
    - preserved as legacy reference
    - preserved as raw snapshot
    - intentionally discarded
    - unmigrated gap
    - needs decision
  - **MUST NOT** proceed with migration if any item remains unclassified, "needs decision", or "unmigrated gap".
  - **MUST NOT** commit plaintext credentials, cookies, API keys, browser session data, or private tokens.
  - **MUST** ensure generated website pages do not accidentally publish sensitive or private data.

- **Storage and Reproducibility Policy:**
  - **MUST** follow the canonical policy defined in `docs/migration/storage_reproducibility_policy.md`.
  - **MUST** preserve a clone-complete repository state. Primary data and retained artifacts remain ordinary Git-tracked files by default.
  - **MUST NOT** use Git LFS. It is intentionally not used because current data sizes do not require it. Do not run `git lfs` commands.
  - **MUST** use DVC in DVC-light mode only (pipeline metadata, stage dependency tracking using Git-tracked files, and reproducibility checks).
  - **MUST NOT** run `dvc add` on raw/source paths or retained-artifact paths by default.
  - **MUST NOT** use DVC to silently replace Git storage for source snapshots or retained artifacts.
  - **SHOULD** track generated outputs based on explicit per-path policy decisions.

- **Workspace Boundaries:**
  - **MUST** treat `site/` as future GitHub Pages source and `docs/` as the canonical documentation and research source.
  - **SHOULD** keep truly disposable files only under `scratch/` or equivalent ignored temporary locations.

## Documentation and Site Consistency Policy

- `docs/` is the canonical source of truth for internal documentation.
- Some files under `docs/` are also curated research/reference sources used for mountain identity resolution.
- These curated research docs must not be deleted or rewritten casually.
- If structured machine-readable data is later derived from them, the source document and derivation must be recorded.
- `site/` will be the GitHub Pages presentation layer.
- `site/` must not introduce independent facts that contradict `docs/`.
- Directory roles, migration status, provenance classifications, and data classifications must be defined in `docs/` first.
- Site pages must link to or be traceable to canonical `docs/` sources.
- If `docs/` and `site/` disagree, `docs/` wins until corrected.
- Future generated pages should live under `site/docs/generated/`.

- **Before/After Change Checklists:**
  - **Before Change:** Verify branch status. Read existing `docs/source_coverage_audit.md` and `docs/path_migration.md`. Do not start moving files unless the audit supports it. For reproducible step execution and current processing state audits, refer to [Reproducible Processing Runbook](file:///docs/migration/reproducible_processing_runbook.md) and [Current Processing State Audit](file:///docs/migration/current_processing_state_audit.md).
  - **After Change:** Run `git status` to ensure accidental deletions or moves have not occurred. Check that no source files have been changed.

## Current / Legacy Directory Structure (Pending Migration)

- `gpx/`: **GPX Data Root**. New ZIP or XLSX files should be placed here before processing.
  - `raw/`: Raw `.gpx` track files extracted from ZIP archives. This is immutable source data containing individual YAMAP activity tracks.
  - `annotated/`: Legacy experimental GPX outputs with generated `<wpt>` waypoint elements. Existing summit names in these files are not authoritative. Preserve these files as historical work evidence, but do not treat them as validated final outputs.
  - `merged-by-year/`: Yearly consolidated GPX overview artifacts for whole-dataset browsing and Google My Maps import. These are derived artifacts and must be validated against raw GPX before being treated as reproducible pipeline outputs.
- `csv/`: **Legacy Operational Input**. Contains `.csv` files extracted from four sheets in `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` by a historical Python script. They are direct script-generated Excel-derived legacy CSV extracts. They were not manually edited or post-processed after extraction, according to user-provided provenance. They are legacy operational inputs / derived extracts, not independent primary source data. Full reproducibility still requires locating/reconstructing and validating the extraction script or equivalent extraction logic.
- `processed/`: **Legacy Processed-Marker Archive / Retained Source Snapshot Archive**. Files were moved here after old workflow handling to mark them as already processed. Do not describe `processed/` as a clean future raw-data layout. `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` and `data/01_raw/as_received/2026-05-12/GPXファイル.zip` are retained source snapshots. `data/01_raw/as_received/2026-05-18/えひめの山.xlsx` is the primary source workbook for CSV-derived activity records.
- `data/01_raw/yamap_markdown/`: **Raw YAMAP Markdown Snapshots**. Contains Markdown snapshots fetched from YAMAP pages. Extra YAMAP metadata not referenced by GPX is acceptable and must not be deleted automatically. Formerly located at legacy `yamap/`.
- `data/01_raw/yamap_metadata/`: **YAMAP Fetch logs / Metadata**. Stores `yamap_all_activity_ids.txt` reference log.
- `data/01_raw/reverse_geocoding/`: **Reverse Geocoding Cache**. Contains reverse geocoding snapshots used for municipality-level location enrichment. Raw cache preservation is decided, but schema contract and reuse logic still require formalization.
- `museum-yama-web/`: **Legacy Web Data Cache**. Stores provisional JSON datasets such as `mountains.json`. `mountains.json` is currently an accumulated provisional list of identified mountains and may contain valuable manual or agent-assisted curation, but it is not the final semantic data model.
- `docs/`: **Canonical Documentation and Curated Research**. Contains policies, audits, ADRs, migration plans, and human/agent-curated research used as evidence for mountain identity resolution.
- `.agents/`: **Automation Center**. Contains repository-specific skills and configurations for AI agents.
  - `skills/`: Logic for automated tasks.

## Current Target Design Agreements

These agreements summarize the current planning state. The canonical details are in `docs/migration/` and `docs/source_coverage_audit.md`.

- **Clone-complete policy:** The repository follows a clone-complete policy. Git LFS is intentionally not used. Primary data and retained processed artifacts should remain available after a plain Git clone. See `docs/migration/storage_reproducibility_policy.md`.
- **DVC/Kedro status:** Planning documents are now sufficient for a later task to initialize DVC/Kedro scaffolding without moving data. DVC-light policy is documented, the first executable DVC stage candidate is documented in `docs/migration/dvc_first_stage_plan.md`, and the output policy in `docs/migration/generated_output_path_policy.md`. However, DVC is not initialized yet. Actual DVC initialization requires a future explicit task approval.
  - Generated outputs should not be placed under `docs/migration/` unless they are small committed preview/audit artifacts. Future formal generated outputs should use the documented generated-output policy (`artifacts/generated/`).
  - `data/01_raw/provider_received/` is the minimal new intake path for future provider-received raw source files. It does not authorize moving existing data.
  - No data movement is authorized. Physical data movement remains blocked until the source coverage audit and path migration plan explicitly cover the affected files.
  - `conf/` contains future Kedro configuration and catalog placeholders.
  - `src/museum_yama_data/` contains future Python/Kedro pipeline scaffolding.
  - The scaffold does not mean that data migration has occurred.
  - Agents must still follow `docs/source_coverage_audit.md` and `docs/path_migration.md` before moving, rewriting, or regenerating data.
  - Current Kedro files are placeholders only; no implemented pipeline should be assumed.
- **DVC usage policy:** DVC must not be used to remove primary data from Git by default. DVC is initially for pipeline/stage/dependency metadata and reproducibility checks. `dvc add` must not be run on raw/source or retained-artifact paths unless explicitly approved in a future task. DVC stage dependencies may refer to Git-tracked paths.
- **Site presentation layer:** `site/` is the GitHub Pages presentation layer generated from canonical docs/configuration. The site must not become an independent source of truth. The site must not publish full raw/private data contents.
- **First Kedro scope:** A future Kedro task may create project scaffolding, catalog names, and placeholder pipeline structures. It must not rewrite GPX parsing, annotation, reverse geocoding, or web-data logic during the scaffolding task.
- **First concrete semantic output:** The first target export is a resolved mountain waypoint collection in GPX/XML, conceptually `data/08_reporting/gpx/mountain_waypoints/`. This should supersede the provisional semantic role of `museum-yama-web/mountains.json`.
- **Authoritative Primary Key & Source Scope:** Use `mountain_no` as the unified effective primary key. The prior 501-only invariant is superseded. All 531 rows in `愛媛県の山.csv` are now in scope. For the 501 non-empty rows, `mountain_no` is the integer value of the CSV `No` column (`1..501`). For the 30 blank-"No" rows, `mountain_no` is a provisional ID derived from the physical CSV row number (`503..532`). CSV coordinates (`GPS` column) in provisional rows must be preserved as coordinate evidence. Future data migration and normalization must preserve these fields and statuses. Do not use mountain name, municipality, or coordinates as the primary key.
- **Legacy JSON Schema References:** The files `mountain_merged.json`, `mountain_link_mapping.json`, and `mountain_summit_coordinates.json` in `processed/` are legacy artifacts. They are schema and evidence references only. They must not be treated as canonical future outputs. New generated outputs must not be placed in `processed/`.
- **Legacy Filename Status:** `mountains-merged.json` is not a required future filename; it is merely a legacy/manual schema reference. The future generated output filename remains undecided.
- **Summit candidates vs resolved mountains:** Algorithmic peak detection creates summit candidates. Resolved mountains are separate entities selected through evidence. Unresolved candidates must not be silently coerced into mountain identities.
- **Summit-candidate GPX vs resolved mountain waypoint GPX:** `data/08_reporting/gpx/summit_candidates/` is the future output for detected candidate waypoints without authoritative names. `data/08_reporting/gpx/mountain_waypoints/` is the future output for identified mountains as waypoints.
- **Mountain identity provenance:** Every mountain-name decision must preserve evidence links. Evidence may come from GPX coordinates, elevation profiles, YAMAP metadata, activity titles, Excel/CSV records, reverse geocoding, `docs/` research files, and legacy `mountains.json`.
- **Same-name mountains:** This repository mainly concerns Ehime mountains, where same-name mountains are common. Use stable internal IDs and disambiguation labels. Display names may use forms such as `山名（市町村名）`, but display names are not stable identifiers.
- **GPX/XML extensions:** Future resolved mountain waypoint GPX may use a provisional `yama:` prefix inside `<extensions>`. Extension local names should be ASCII-safe, such as `mountain_id`, `canonical_name`, `display_name`, `identity_status`, and `evidence_ref`. The namespace URI and XML schema are not finalized.
- **Reverse geocoding policy:** Existing reverse geocoding cache may be reused for municipality-level inference. If the nearest cached coordinate is more than 1 km away, mark the point as needing a new reverse geocoding lookup. Boundary cases must be flagged rather than silently normalized.

## Agent Skill Portability Policy

- Reusable data-processing tools should be implemented as agent skills under `.agents/skills/`.
- **Skill Publishing Workflow:** Reusable agent skills in this repository are published to dedicated Git branches (e.g., `skills/yama-data-pipeline`) via the `.github/workflows/publish-agent-skills.yml` GitHub Actions workflow. These branches project the subtree of the skill, allowing other repositories to consume them as submodules. See `docs/migration/agent_skill_subtree_branch_workflow.md` for details. Do not edit `skills/<skill-name>` branches directly.
- Portable skill commands should accept explicit `--input` and `--out` paths where practical, avoiding implicit repository-root assumptions unless the command is explicitly repository-specific.
- Reusable logic should live in skill `lib/` modules, keeping CLI wrappers thin.
- Skill dependencies should be declared within the skill package.
- Skill tests should use synthetic fixtures where possible.
- Source data must not be modified unless the command is explicitly designed for that purpose.
- **Distinction from `scripts/`**: The `scripts/` directory is reserved for repository-specific audits, site generation, migration reports, and one-off helper checks. When a tool in `scripts/` becomes reusable or pipeline-relevant, it should be considered for promotion into an agent skill.

## Agent Skills

### Skill: Yama Data Pipeline (`yama-data-pipeline`)

A consolidated CLI tool that handles local mountaineering data processing including data intake, merging, annotating, and validation.

#### Subcommands

- **`intake`**: Portable GPX archive extraction command. Safely extracts GPX files from a ZIP archive into an explicit directory using `--input` and `--out-dir`. It extracts only `.gpx` entries, ignores directories and other file types, flattens internal ZIP paths, and fails on duplicate flattened basenames or existing output collisions without renaming. The extraction is all-or-nothing. Note: The historical workflow used `intake` to also convert Excel files to CSV and move files to `processed/`, but this is no longer part of current `intake` behavior.
- **`merge`**: Groups individual GPX files from `gpx/raw/` into yearly archives (e.g., `2024_merged.gpx`) for easier My Maps import. Preserves all `<trk>` elements. This is a legacy command; future merged outputs require validation against raw GPX.
- **`annotate`**: Legacy command that analyzes GPX track elevation profiles, attempts summit matching, and generates files with `<wpt>` waypoints in `gpx/annotated/`. Its existing name assignment behavior is not authoritative. Future pipeline design separates summit-candidate detection from summit identity/name resolution.
- **`validate`**: Validates all processed GPX files for well-formed XML and valid coordinate bounds. Although GPX itself may allow trackpoints without elevation, this repository requires `<ele>` on all trackpoints because elevation profiles are used for validation and peak annotation.

#### How to use
Ask the agent:
> "Run the yama-data-pipeline intake subcommand to process the new ZIP file from data/01_raw/provider_received/ to data/01_raw/gpx/."
> "Run the yama-data-pipeline merge subcommand."

#### Implementation
- **Directory**: `.agents/skills/yama-data-pipeline/`
- **Engine**: Node.js
- **Dependencies**: `@xmldom/xmldom`, `xlsx`, `adm-zip` (install via `npm install` inside the skill directory)

#### Execution Commands
```powershell
node .agents/skills/yama-data-pipeline/cli.js intake --input data/01_raw/as_received/<date>/GPXファイル.zip --out-dir data/01_raw/gpx/<date> --report docs/migration/intake_report.md
node .agents/skills/yama-data-pipeline/cli.js merge --root .
node .agents/skills/yama-data-pipeline/cli.js annotate --root .
node .agents/skills/yama-data-pipeline/cli.js validate --root .
```

### Skill: Fetch YAMAP Data (`fetch-yamap-data`)

Extracts detailed activity metadata and comments from YAMAP activity pages.

#### Purpose
- Captures exact dates, statistics (distance, time, elevation), and activity descriptions.
- Leverages authenticated browser sessions to access diary entries and wildlife observations.
- Handles page states such as Private (403) or Deleted (404) gracefully.
- Saves output to individual Markdown files in `yamap/`.

#### How to use
Ask the agent:
> "Run the fetch-yamap-data skill for activity ID [ID] and save the results to the yamap directory."

#### Implementation
- **Instructions**: `.agents/skills/fetch-yamap-data/SKILL.md`
- **Tooling**: AI Browser Tool (Agent-internal)

## Development Guidelines (Legacy)
- The portable `yama-data-pipeline intake` subcommand handles new GPX ZIP archives by extracting them to an explicit output directory. It strictly handles collisions by failing to prevent silent overwrites, ensuring an all-or-nothing atomic extraction.
- The `csv/` directory is the current legacy operational input for activity metadata used by the existing pipeline. These CSV files are direct script-generated extracts from four sheets in `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx`. For provenance purposes, `data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx` is the retained source snapshot / primary source workbook. The CSV files are Excel-derived legacy CSV extracts; they were not manually edited or post-processed according to user-provided provenance. Historically, this extraction was performed by the old `intake` command. Full reproducibility requires validating the historical extraction script or equivalent extraction logic.
- The `gpx/raw/` directory should only contain individual `.gpx` files (no subfolders). These are considered **source data** and must not be mutated.
- The `gpx/annotated/` and `gpx/merged-by-year/` directories contain **legacy generated artifacts**. Preserve them, but do not treat them as authoritative future pipeline outputs.

- **Validation**: After running intake or generating new artifacts, run `npm run validate` from the repository root to ensure all GPX files are well-formed XML and contain valid location data.

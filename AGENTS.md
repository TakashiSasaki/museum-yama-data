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

- **Git vs DVC Tracking Policy:**
  - **SHOULD** use DVC for large data, source archives, generated data, intermediate data, validation reports, and retained work outputs.
  - **SHOULD** use Git directly for source code, configuration, documentation, small reviewable summaries, and DVC/Kedro metadata.

- **Workspace Boundaries:**
  - **MUST** treat "site/" as GitHub Pages source and "docs/" as internal documentation source.
  - **SHOULD** keep truly disposable files only under "scratch/" or equivalent ignored temporary locations.

## Documentation and Site Consistency Policy

- `docs/` is the canonical source of truth for internal documentation.
- `site/` will be the GitHub Pages presentation layer.
- `site/` must not introduce independent facts that contradict `docs/`.
- Directory roles, migration status, provenance classifications, and data classifications must be defined in `docs/` first.
- Site pages must link to or be traceable to canonical `docs/` sources.
- If `docs/` and `site/` disagree, `docs/` wins until corrected.
- Future generated pages should live under `site/docs/generated/`.
- No GitHub Pages site or workflow should be created until explicitly requested.

- **Before/After Change Checklists:**
  - **Before Change:** Verify branch status. Read existing `docs/source_coverage_audit.md` and `docs/path_migration.md`. Do not start moving files unless the audit supports it.
  - **After Change:** Run `git status` to ensure accidental deletions or moves have not occurred. Check that no source files have been changed.

## Current / Legacy Directory Structure (Pending Migration)

- `gpx/`: **GPX Data Root**. New ZIP or XLSX files should be placed here before processing.
  - `raw/`: Raw `.gpx` track files extracted from ZIP archives. This is where unprocessed individual tracks live.
  - `annotated/`: GPX files with `<wpt>` waypoint elements marking detected mountain summits.
  - `merged-by-year/`: Yearly consolidated GPX files for Google My Maps import.
- `csv/`: **Processed Records**. Contains `.csv` files extracted from Excel activity logs. Used as the primary data source for the web app.
- `processed/`: **Archive**. Stores original `.zip` and `.xlsx` files after they have been processed by the intake skill.
- `museum-yama-web/`: **Web Data Cache**. Stores processed JSON datasets converted from GPX and CSV sources, optimized for consumption by the front-end map and visualizer.
- `.agents/`: **Automation Center**. Contains repository-specific skills and configurations for AI agents.
  - `skills/`: Logic for automated tasks.

## Agent Skills

### Skill: Yama Data Pipeline (`yama-data-pipeline`)

A consolidated CLI tool that handles local mountaineering data processing including data intake, merging, annotating, and validation.

#### Subcommands

- **`intake`**: Automatically extracts GPX files from ZIP archives in `gpx/` and converts Excel files to CSVs. During ZIP intake, entries are flattened by basename. If two ZIP entries would map to the same basename, or if a basename already exists in `gpx/raw/`, intake fails instead of renaming. This prevents silent overwrite and ambiguous data provenance. As part of intake processing, the original `.zip` and `.xlsx` inputs are archived to `processed/` after successful handling.
- **`merge`**: Groups individual GPX files from `gpx/raw/` into yearly archives (e.g., `2024_merged.gpx`) for easier My Maps import. Preserves all `<trk>` elements.
- **`annotate`**: Analyzes GPX track elevation profiles to detect summit points, matches them to CSV records, and generates new files with `<wpt>` waypoints in `gpx/annotated/`.
- **`validate`**: Validates all processed GPX files for well-formed XML and valid coordinate bounds. Although GPX itself may allow trackpoints without elevation, this repository requires `<ele>` on all trackpoints because elevation profiles are used for validation and peak annotation.

#### How to use
Ask the agent:
> "Run the yama-data-pipeline intake subcommand to process new files."
> "Run the yama-data-pipeline merge subcommand."

#### Implementation
- **Directory**: `.agents/skills/yama-data-pipeline/`
- **Engine**: Node.js
- **Dependencies**: `@xmldom/xmldom`, `xlsx`, `adm-zip` (install via `npm install` inside the skill directory)

#### Execution Commands
```powershell
node .agents/skills/yama-data-pipeline/cli.js intake --root .
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
- Always use the **`yama-data-pipeline intake` subcommand** for new data to maintain the directory structure. It handles ZIP intake collisions strictly by failing to prevent silent overwrites.
- The `csv/` directory is the current legacy operational input for activity metadata used by the existing pipeline. These CSV files were extracted from sheets in the Excel workbook. For provenance purposes, the primary source/archive is `processed/えひめの山.xlsx`; the CSV files are Excel-derived extracted representations unless later evidence shows manual edits.
- The `gpx/raw/` directory should only contain individual `.gpx` files (no subfolders). These are considered **source data** and must not be mutated.
- The `gpx/annotated/` and `gpx/merged-by-year/` directories contain **generated artifacts**.

- **Validation**: After running intake or generating new artifacts, run `npm run validate` from the repository root to ensure all GPX files are well-formed XML and contain valid location data.

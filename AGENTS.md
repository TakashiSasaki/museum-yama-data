# Yama Museum - Agent & Collaborator Guide

This repository contains tools and data for analyzing mountaineering location data obtained from the **YAMAP** app, based on the records of **Professor Yoshitomi of Ehime University**.

## Project Overview
The goal is to build a web application that visualizes and analyzes GPX tracks and activity logs. 
- **Visualization Link**: [Google My Maps](https://www.google.com/maps/d/edit?mid=1-hJRCtAmD6DF9-nMQOwftdz7v5vVTWo&usp=sharing)

## Directory Structure

- `gpx/`: **GPX Data Root**. New ZIP or XLSX files should be placed here before processing.
  - `raw/`: Raw `.gpx` track files extracted from ZIP archives. This is where unprocessed individual tracks live.
  - `annotated/`: GPX files with `<wpt>` waypoint elements marking detected mountain summits.
  - `merged/`: Yearly consolidated GPX files for Google My Maps import.
- `csv/`: **Processed Records**. Contains `.csv` files extracted from Excel activity logs. Used as the primary data source for the web app.
- `processed/`: **Archive**. Stores original `.zip` and `.xlsx` files after they have been processed by the intake skill.
- `.agents/`: **Automation Center**. Contains repository-specific skills and configurations for AI agents.
  - `skills/`: Logic for automated tasks (e.g., `data-intake`).

## Agent Skills

### Skill: Yama Data Pipeline (`yama-data-pipeline`)

A consolidated CLI tool that handles local mountaineering data processing including data intake, merging, annotating, and validation.

#### Subcommands

- **`intake`**: Automatically extracts GPX files from ZIP archives in `gpx/` and converts Excel files to CSVs. Handles filename collisions using SHA-256 hashes and archives originals to `processed/`.
- **`merge`**: Groups individual GPX files from `gpx/raw/` into yearly archives (e.g., `2024_merged.gpx`) for easier My Maps import. Preserves all `<trk>` elements.
- **`annotate`**: Analyzes GPX track elevation profiles to detect summit points, matches them to CSV records, and generates new files with `<wpt>` waypoints in `gpx/annotated/`.
- **`validate`**: Validates all processed GPX files for well-formed XML and valid coordinate bounds.

#### How to use
Ask the agent:
> "Run the yama-data-pipeline intake command to process new files."
> "Run the yama-data-pipeline merge command."

#### Implementation
- **Directory**: `.agents/skills/yama-data-pipeline/`
- **Engine**: Node.js
- **Dependencies**: `@xmldom/xmldom`, `xlsx`, `adm-zip` (install via `npm install` inside the skill directory)

#### Execution Commands
```powershell
node .agents/skills/yama-data-pipeline/cli.js intake --root .
node .agents/skills/yama-data-pipeline/cli.js merge --root .
node .agents/skills/yama-data-pipeline/cli.js annotate --root .
node .agents/skills/yama-data-pipeline/cli.js validate --root . [--strict]
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

## Development Guidelines
- Always use the **yama-data-pipeline intake** skill for new data to maintain the directory structure. It now handles collisions safely by renaming files with different content.
- The `csv/` directory is the source of truth for activity metadata.
- The `gpx/raw/` directory should only contain individual `.gpx` files (no subfolders). These are considered **source data** and must not be mutated.
- The `gpx/annotated/` and `gpx/merged/` directories contain **generated artifacts**.

- **Validation**: After running intake or generating new artifacts, run `npm run validate` from the repository root to ensure all GPX files are well-formed XML and contain valid location data.

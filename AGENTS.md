# Yama Museum - Agent & Collaborator Guide

This repository contains tools and data for analyzing mountaineering location data obtained from the **YAMAP** app.

## Project Overview
The goal is to build a web application that visualizes and analyzes GPX tracks and activity logs. 
- **Visualization Link**: [Google My Maps](https://www.google.com/maps/d/edit?mid=1-hJRCtAmD6DF9-nMQOwftdz7v5vVTWo&usp=sharing)

## Directory Structure

- `gpx/`: **Active Data Area**. Contains raw `.gpx` track files. New ZIP or XLSX files should be placed here before processing.
- `csv/`: **Processed Records**. Contains `.csv` files extracted from Excel activity logs. Used as the primary data source for the web app.
- `processed/`: **Archive**. Stores original `.zip` and `.xlsx` files after they have been processed by the intake skill.
- `.agents/`: **Automation Center**. Contains repository-specific skills and configurations for AI agents.
  - `skills/`: Logic for automated tasks (e.g., `data-intake`).

## Agent Skills

### Skill: Data Intake (`import-data`)

Processes YAMAP data files located in the `gpx/` directory.

#### Purpose
- Automatically extracts GPX files from any ZIP archives in `gpx/`.
- Automatically converts all sheets from any `.xlsx` files in `gpx/` into individual `.csv` files.
- **Flattening**: ZIP contents are extracted directly to the root of `gpx/`.
- **Cleanup**: Temporary extraction folders are deleted automatically.
- **Archiving**: Moves original ZIP and XLSX files to the `processed/` directory after successful handling.
- **Automatically deduplicates GPX files**: Detects files with suffixes like ` (1)` and deletes them if their content matches the original via MD5 hash verification.

#### How to use
When new ZIP or Excel files are placed in the `gpx/` directory, ask the agent:
> "Run the data intake skill to process new files in the gpx directory."

#### Implementation
- **Script**: `.agents/skills/data-intake/import_data.js`
- **Engine**: Node.js
- **Dependencies**: `xlsx`, `adm-zip` (located in `.agents/skills/data-intake/node_modules`)

#### Execution Command
```powershell
cd .agents/skills/data-intake; node import_data.js
```

### Skill: Merge Tracks (`merge-tracks`)

Consolidates multiple GPX files into larger files grouped by year for easier map visualization.

#### Purpose
- Groups individual GPX files into yearly archives (e.g., `2024_merged.gpx`).
- Makes it easy to import hundreds of tracks into Google My Maps within the 10-layer limit.
- Output is saved to `gpx/merged/`.

#### How to use
Ask the agent:
> "Merge all GPX tracks by year for My Maps import."

#### Implementation
- **Script**: `.agents/skills/merge-tracks/merge_by_year.js`
- **Engine**: Node.js

#### Execution Command
```powershell
node .agents/skills/merge-tracks/merge_by_year.js
```

## Development Guidelines
- Always use the **Data Intake Skill** for new data to maintain the directory structure.
- The `csv/` directory is the source of truth for activity metadata.
- The `gpx/` directory should only contain individual `.gpx` files (no subfolders).

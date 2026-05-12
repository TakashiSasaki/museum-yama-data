# Yama Museum - Agent & Collaborator Guide

This repository contains tools and data for analyzing mountaineering location data obtained from the **YAMAP** app.

## Project Overview
The goal is to build a web application that visualizes and analyzes GPX tracks and activity logs.

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
- **Archiving**: Original ZIP and XLSX files are moved to `processed/` upon completion.

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

## Development Guidelines
- Always use the **Data Intake Skill** for new data to maintain the directory structure.
- The `csv/` directory is the source of truth for activity metadata.
- The `gpx/` directory should only contain individual `.gpx` files (no subfolders).

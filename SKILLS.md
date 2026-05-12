# Agent Skills

This repository contains automated skills that can be performed by AI agents.

## Skill: Data Intake (`import-data`)

Processes YAMAP data files located in the `gpx/` directory.

### Purpose
- Automatically extracts GPX files from any ZIP archives in `gpx/`.
- Automatically converts all sheets from any `.xlsx` files in `gpx/` into individual `.csv` files.
- All output is placed directly in the `gpx/` directory.

### How to use
When new ZIP or Excel files are placed in the `gpx/` directory, ask the agent:
> "Run the data intake skill to process new files in the gpx directory."

### Implementation
- **Script**: `scripts/import_data.js`
- **Engine**: Node.js
- **Dependencies**: `xlsx`, `adm-zip` (located in `scripts/node_modules`)

### Execution Command
```powershell
cd scripts; node import_data.js
```

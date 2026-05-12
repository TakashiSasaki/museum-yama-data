---
name: data-intake
description: >
  Use this skill when new ZIP archives or Excel (.xlsx) files have been placed
  in the gpx/ directory and need to be processed. This skill extracts GPX files
  from ZIPs, converts Excel sheets to CSV, deduplicates files, and archives
  the originals.
---

# Data Intake Skill

## When to Use
Run this skill whenever new `.zip` or `.xlsx` files appear in the `gpx/` directory.

## Steps
1. Extract all ZIP archives in `gpx/` into a temporary folder.
2. Move extracted `.gpx` files directly into `gpx/` (flatten structure).
3. Delete the temporary extraction folder.
4. Convert all `.xlsx` files in `gpx/`: each sheet becomes a separate `.csv` file in `csv/`.
5. Move the original `.zip` and `.xlsx` files to `processed/`.
6. Scan for duplicate GPX files (files with suffixes like ` (1)`, ` (2)`).
7. Compare duplicates against originals using MD5 hash verification.
8. Delete confirmed identical duplicates.

## Execution
```powershell
cd .agents/skills/data-intake; node import_data.js
```

## Dependencies
- Node.js
- `xlsx` (npm package, installed in `node_modules/`)
- `adm-zip` (npm package, installed in `node_modules/`)

## Output
- Extracted `.gpx` files in `gpx/`
- Converted `.csv` files in `csv/`
- Original archives moved to `processed/`

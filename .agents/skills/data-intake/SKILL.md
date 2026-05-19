---
name: data-intake
description: >
  Use this skill when new ZIP archives or Excel (.xlsx) files have been placed
  in the gpx/ directory and need to be processed. This skill extracts GPX files
  from ZIPs into gpx/raw/, converts Excel sheets to CSV, deduplicates files,
  and archives the originals.
---

# Data Intake Skill

## When to Use
Run this skill whenever new `.zip` or `.xlsx` files appear in the `gpx/` directory.

## Steps
1. Extract all ZIP archives in `gpx/` into a temporary folder.
2. Move extracted `.gpx` files directly into `gpx/raw/` (flatten structure).
3. Delete the temporary extraction folder.
4. Convert all `.xlsx` files in `gpx/`: each sheet becomes a separate `.csv` file in `csv/`.
5. Move the original `.zip` and `.xlsx` files to `processed/`.
6. Scan `gpx/raw/` for duplicate GPX files (files with suffixes like ` (1)`, ` (2)`).
7. Compare duplicates against originals using MD5 hash verification.
8. Delete confirmed identical duplicates.

## Note on Deduplication
ZIP files imported from external sources (e.g., YAMAP exports) frequently contain
near-duplicate files with numeric suffixes such as ` (1).gpx` or ` (2).gpx`.
These are typically bit-for-bit identical to the original file without the suffix.
The deduplication step (steps 6–8) automatically detects and removes these redundant
copies after verifying content identity via MD5 hash comparison.

## Execution
```powershell
cd .agents/skills/data-intake; node import_data.js --root <path>
```

## Dependencies
- Node.js
- `xlsx` (npm package, installed in `node_modules/`)
- `adm-zip` (npm package, installed in `node_modules/`)

## Output
- Extracted `.gpx` files in `gpx/raw/`
- Converted `.csv` files in `csv/`
- Original archives moved to `processed/`

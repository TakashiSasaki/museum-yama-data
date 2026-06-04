# Excel Sheet Extraction Report

## Summary
- status: success
- input_workbook: data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx
- output_dir: data/02_intermediate/activity_logs/csv_extracted/yoshitomi/2026-05-18
- sheet_count: 5
- extracted_csv_count: 5

## Workbook
- input path: data/01_raw/provider_received/yoshitomi/2026-05-18/えひめの山.xlsx
- workbook readable: true
- sheet names discovered:
  - 愛媛県の山
  - 難易度ランクの根拠
  - 百名山
  - PH数の推移
  - 島根県の山

## Preflight Checks
- non-empty sheet names: passed
- filename separator checks: passed
- duplicate output filenames: passed
- output collisions: passed
- safe output paths: passed

## Extracted CSV Files
- 愛媛県の山.csv
- 難易度ランクの根拠.csv
- 百名山.csv
- PH数の推移.csv
- 島根県の山.csv

## Verification
- write succeeded: passed
- reopen by exact filename succeeded: passed
- read-back content matched: passed

## Notes
- source workbook was not modified
- sheet names were used exactly as filenames
- no fallback filenames were generated
- staging write/read-back validation was used
- CSV encoding: UTF-8 without BOM
- Line endings: LF (\n)
- Empty sheets: extracted without skipping

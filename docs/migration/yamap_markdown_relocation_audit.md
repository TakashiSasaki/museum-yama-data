# YAMAP Markdown Relocation Audit

## Relocation Summary
- **Old Markdown source path**: `yamap/*.md`
- **New Markdown target path**: `data/01_raw/yamap_markdown/*.md`
- **Old metadata index path**: `yamap/yamap_all_activity_ids.txt`
- **New metadata index path**: `data/01_raw/yamap_metadata/yamap_all_activity_ids.txt`

## File Counts and Validation
- **Markdown file count before**: 434
- **Markdown file count after**: 434
- **Metadata index file count before**: 1
- **Metadata index file count after**: 1

## Classifications
- **Markdown activity files (`*.md`)**: Classified as `preserved_as_raw_snapshot`.
- **Activity ID list (`yamap_all_activity_ids.txt`)**: Classified as `preserved_as_legacy_reference` (metadata/log).

## Integrity Policies
- Markdown file contents were NOT modified in any way.
- No YAMAP web scraping or new fetching was performed during this task.
- Unmatched or extra YAMAP metadata has been fully preserved.
- Target collision checks were performed before relocation (directories were empty, no existing files were overwritten).

## Rollback Strategy
If rollback is necessary, run:
```powershell
git mv data/01_raw/yamap_markdown/*.md yamap/
git mv data/01_raw/yamap_metadata/yamap_all_activity_ids.txt yamap/yamap_all_activity_ids.txt
```

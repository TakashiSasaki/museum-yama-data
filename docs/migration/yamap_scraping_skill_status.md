# YAMAP Scraping Skill Status Report

## Current Status Overview
- **skill name**: `fetch-user-activities`
- **current purpose**: fetch YAMAP activity IDs for a user by traversing paginated Activities pages
- **current output**: `yamap_user_<USER_ID>_activities.txt` in the current working directory
- **current implementation**: Puppeteer-based browser automation

## Current Limitations
- **it does not fetch full activity Markdown snapshots**: Currently, the script navigates the user's activities tabs and only extracts the activity ID (`href` matching `/activities/(\d+)`), outputting a deduplicated list of IDs to a text file. It does not fetch or save full activity metadata as Markdown.
- **output path is not explicit / portable enough**: The output file is hardcoded to be saved in `process.cwd()` instead of allowing an explicit `--out` parameter, which is inconsistent with portable agent skill requirements.
- **dependency declaration may be incomplete**: The skill relies on `puppeteer` but does not seem to have a dedicated `package.json` inside its folder.

## Future Recommendations
- Make the script a more portable agent skill with explicit arguments like `--user-id`, `--out`, and possibly `--max-pages`, `--delay-ms`. Avoid any hard-coded repository layout assumptions.
- Separate scraping the IDs from fetching the complete metadata.
- For full activity markdown snapshots, YAMAP markdowns will ideally reside in `data/01_raw/yamap_markdown/`.
- For YAMAP fetch metadata (like the ID lists), the target path is `data/01_raw/yamap_metadata/`.
- Note: This audit did not relocate the current `yamap/*.md` snapshots or metadata out of the legacy `yamap/` folder; relocation remains pending as the migration strategy solidifies. No new scraping was performed in this task.
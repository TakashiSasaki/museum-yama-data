# GPX to YAMAP Date Linking Plan

This stage generates date-based candidate links between source GPX files and YAMAP activity Markdown records.

## Design Stages
1. **GPX Filename Index**: Parses datetimes from GPX filenames, and extracts candidate dates under both JST and UTC interpretations to resolve timezone sensitivity.
2. **YAMAP Markdown Index**: Parses activity dates and titles from Markdown snapshots.
3. **Date-Only Candidate Links**: Joins the indexes on matching candidate dates, recording timezone-sensitivity details.
4. **Review Queue**: Emits review reports for manual verification.
5. **Future Matching Stages**: Planned extensions will matching track titles with YAMAP activity titles.
6. **Canonical Links**: The final human-curated link table will be written in a later stage to:
   `data/03_primary/activity_links/gpx_yamap_activity_links.jsonl`
   This current stage does NOT create this final canonical file.

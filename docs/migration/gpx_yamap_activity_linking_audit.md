# GPX-to-YAMAP Activity Linking Audit

## Purpose
To verify at repository scale whether raw GPX XML files embed YAMAP activity IDs directly, and to evaluate evidence for linking `gpx/raw/*.gpx` to `yamap/*.md`.

## Methodology
A Python script (`scripts/audit_gpx_yamap_activity_links.py`) was used to scan all files in `gpx/raw/` and `yamap/`. The script is read-only. It parsed GPX metadata (creator, track names, trackpoint timestamps, links, extensions) and searched for explicit activity URLs/IDs. It then compared GPX track times and names against scraped YAMAP Markdown titles and dates to assess a candidate linking strategy.

## Direct GPX XML Activity ID Scan Result
Read-only inspection did not find embedded YAMAP activity IDs in the scanned GPX XML files. GPX-to-YAMAP linking should therefore be implemented as an explicit pipeline stage using filename timestamps, GPX track times, track names, and YAMAP Markdown metadata.

## Summary Counts
- GPX files scanned: 293
- YAMAP Markdown files parsed: 434
- Direct activity IDs found in GPX XML: 0
- `single_high_confidence_candidate`: 287
- `multiple_candidates`: 0
- `needs_review`: 2
- `no_candidate`: 4

## Candidate Linking Strategy
The proposed linking strategy uses the following evidence:
- GPX filename timestamp or GPX first trackpoint time (converted to JST)
- GPX first track name (normalized)
- YAMAP Markdown date
- YAMAP Markdown title (normalized)
Matches are classified into direct matches (if any), single high-confidence matches (exact date and title), multiple candidates, needs review, or no candidate.

## Limitations
- YAMAP Markdown dates are generally only precise to the day, so exact time deltas cannot be computed reliably.
- GPX timezone boundaries (UTC vs JST) can cause date mismatches if not handled properly.
- The candidate CSV does not contain full trackpoint geometry, adhering to data model policies.

## Next Recommended Pipeline Stage
Introduce an explicit pipeline stage (e.g., `link_gpx_to_yamap_activity`) that implements this candidate linking strategy, creating a separate links table rather than rewriting source files.

## Human Resolution Status

After the generated audit, the user confirmed one `needs_review` case as an existing valid match and accepted the remaining five unmatched GPX files as YAMAP metadata coverage gaps after manual search and `cli.js verify`.

The generated candidate CSV remains a generated artifact. Human-confirmed overrides and final interpretation are recorded in `docs/migration/yamap_unresolved_activity_link_resolution.md`.

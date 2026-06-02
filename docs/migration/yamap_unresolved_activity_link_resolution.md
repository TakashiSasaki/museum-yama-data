# GPX-to-YAMAP Unresolved Activity Link Resolution Report

## Purpose
This document records the final, human/user-confirmed resolution status for GPX-to-YAMAP activity links that remained unresolved after automated audits.

## Inputs / Evidence Used
- Scanned GPX metadata (creator, track names, trackpoint timestamps, links, extensions) for 293 raw GPX files in `gpx/raw/`.
- Scraped YAMAP Markdown metadata (titles, dates, descriptions) for 434 activities in `yamap/`.
- Consolidated pipeline verification script `.agents/skills/yama-data-pipeline/cli.js verify`.
- Explicit human/user manual search, cross-referencing, and verification.

## Generated Audit Status
The automated linking audit (`docs/migration/gpx_yamap_activity_linking_audit.md`) initially mapped most files automatically, but left several files classified as `needs_review` or `no_candidate` due to strict date boundaries and boundary-crossing tracks.

## User-Confirmed Resolutions

### 1. Confirmed Existing Match
The user confirmed one active match that was previously flagged as `needs_review` due to a midnight-crossing JST date boundary difference:

- **GPX File**: `gpx/raw/yamap_2022-07-10_07_25.gpx`
- **YAMAP Activity URL**: `https://yamap.com/activities/18371502`
- **Logical Resolution Status**: `confirmed_existing_markdown`
- **Match Evidence**: User-confirmed manual matching.
- **Handling Note**: The YAMAP Markdown record `yamap/18371502.md` already exists and must not be overwritten or recreated.

### 2. Confirmed Missing YAMAP Metadata (Accepted Coverage Gaps)
The user confirmed that five remaining GPX files have no corresponding public YAMAP activity pages or Markdown files. These are accepted as permanent metadata coverage gaps.

- **Status**: `missing_yamap_metadata` (or `unmatched_after_audit`, `no_yamap_activity_link`)

The five accepted coverage gaps are:

1. **GPX File**: `gpx/raw/yamap_2022-04-25_11_35.gpx`
   - **Track Name**: `伊之子山・左谷ノ森`
   - **Date (JST)**: `2022-04-25`
2. **GPX File**: `gpx/raw/yamap_2024-05-19_08_47.gpx`
   - **Track Name**: `二反山・青刈山`
   - **Date (JST)**: `2024-05-19`
3. **GPX File**: `gpx/raw/yamap_2024-06-14_06_46.gpx`
   - **Track Name**: `二反山`
   - **Date (JST)**: `2024-06-14`
4. **GPX File**: `gpx/raw/yamap_2024-06-16_07_27.gpx`
   - **Track Name**: `薬師山`
   - **Date (JST)**: `2024-06-16`
5. **GPX File**: `gpx/raw/yamap_2024-08-03_20_36.gpx`
   - **Track Name**: `高縄山`
   - **Date (JST)**: `2024-08-04`

No placeholder `yamap/<activity_id>.md` files should be created for these files.

## Interpretation for Pipeline Processing & Downstream Impacts
- **Immutable Source Status**: These five GPX files are accepted YAMAP metadata coverage gaps. They remain valid immutable GPX source tracks and remain eligible for GPX parsing, elevation-profile analysis, and summit candidate detection.
- **Summit Candidate Detection**: Missing YAMAP metadata must not block `detect_summit_candidates`. They remain fully usable for trackpoint extraction, elevation profiling, and peak detection.
- **Enrichment Nullability**: Only YAMAP activity metadata enrichment and YAMAP activity ID based joins should treat their activity link as missing or null.

## Safety Notes
- Do not modify, move, or rename the raw GPX source files.
- Do not invent dummy activity IDs or placeholder metadata files.

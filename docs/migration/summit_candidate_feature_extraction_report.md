# Summit Candidate Feature Extraction Report

- **Branch and HEAD commit**: `museum-yama-data` (`2b4bddd1d7c52da887bbd970bbee9e32fde34ade`)
- **Input GPX directory**: `data/08_reporting/gpx/summit_candidates/2026-05-12`
- **Input manifest path**: `data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json`
- **Output JSONL path**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
- **Output manifest path**: `data/03_primary/summit_candidates/2026-05-12/manifest.json`
- **Command used**: `extract-summit-candidate-features`
- **Input GPX count**: `293`
- **Manifest file count**: `293`
- **Output candidate record count**: `496`
- **Zero-candidate GPX count**: `25`
- **Candidate ID uniqueness result**: `Passed`
- **Lat/lon validation result**: `Passed`
- **Elevation parse result**: `Passed (All parsed correctly; null elevation handled where applicable)`
- **Candidate_index convention**: `1-based index representing the order of waypoint appearance inside each GPX file.`
- **Mapping document path**: `docs/migration/summit_candidate_feature_mapping.md`
- **Source modification status**: `Not modified (Yes)`
- **Tests and validation commands run**: `npm test`
- **Known limitations**: `None. Unresolved candidate attributes mapped directly without mountain assignment.`
- **Next recommended steps**:
  1. Extract reverse-geocoding raw cache into geocoded_points_index.jsonl.
  2. Enrich summit candidates with nearby reverse-geocoding location evidence.
  3. Generate mountain_no-to-summit_candidate candidate links.

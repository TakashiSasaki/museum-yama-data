# Summit Candidate Location Evidence Report

- **Branch and HEAD commit**: `museum-yama-data` (`27738ba64d42a170b1bdc21572e96914a94a0938`)
- **Input summit candidate JSONL path**: `data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl`
- **Input geocoded point index path**: `data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl`
- **Output JSONL path**: `data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl`
- **Output manifest path**: `data/04_feature/location_enrichment/summit_candidates/2026-05-12/manifest.json`
- **Command used**: `enrich-summit-candidates-with-reverse-geocoding`
- **Search radius**: `1000 meters`
- **Distance method**: `haversine`
- **Summit candidate input count**: `496`
- **Geocoded point input count**: `577`
- **Output record count**: `496`
- **Records with nearby reverse-geocoding evidence**: `496`
- **Records without nearby reverse-geocoding evidence**: `0`
- **Evidence level counts**:
  - very_strong (0-100m): `496`
  - strong (100-300m): `0`
  - weak_but_usable (300-1000m): `0`
  - none (>1000m): `0`
- **Address component candidate counts**:
  - prefectures: `4`
  - counties: `11`
  - cities: `30`
  - towns: `15`
  - villages: `1`
  - locals: `221`
- **Island candidate count**: `0`
- **Records needing review**: `35`
- **Mapping document path**: `docs/migration/summit_candidate_location_evidence_mapping.md`
- **Source modification status**: `Not modified (Yes)`
- **Tests and validation commands run**: `npm test`
- **Known limitations**:
  * Nominatim/OpenStreetMap address data may be incomplete or imperfect.
  * Reverse-geocoding evidence is not final identity proof.
  * Municipality/county/city boundaries can be ambiguous near summits.
  * A nearby reverse-geocoded point within 1 km is a loose location hint, not a hard match.
  * Island evidence may be absent from the reverse-geocoding cache even if the CSV source contains island names.
- **Next recommended steps**:
  1. Improve GPX↔YAMAP candidate links using title/name/chronological evidence.
  2. Generate mountain_no-to-summit_candidate candidate links using:
     - mountain source JSON
     - summit candidates
     - reverse-geocoding location evidence
     - GPX↔YAMAP activity candidate links
     - name evidence
     - elevation evidence
     - CSV GPS distance where available
  3. Produce a human review queue for low-confidence or ambiguous links.

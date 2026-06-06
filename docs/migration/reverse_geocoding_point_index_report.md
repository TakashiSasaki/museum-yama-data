# Reverse Geocoding Point Index Report

- **Branch and HEAD commit**: `museum-yama-data` (`0c19646788c4791d8b35421f1059524836d019d6`)
- **Input raw cache directory**: `data/01_raw/reverse_geocoding/raw/nominatim`
- **Output JSONL path**: `data/02_intermediate/reverse_geocoding/extracted/nominatim/geocoded_points_index.jsonl`
- **Output manifest path**: `data/02_intermediate/reverse_geocoding/extracted/nominatim/manifest.json`
- **Command used**: `extract-reverse-geocoding-point-index`
- **Raw file count**: `7`
- **Raw record count**: `577`
- **Output record count**: `577`
- **Records with valid coordinates**: `577`
- **Records without valid coordinates**: `0`
- **Address extraction component counts**:
  - prefecture/state: `577`
  - county: `177`
  - city: `577`
  - town: `157`
  - village: `4`
  - island: `0`
  - local: `385`
- **Provider / raw schema observations**: `Nominatim OpenStreetMap reverse geocoding responses, mapped structure containing address, display_name, and source_point objects.`
- **Mapping document path**: `docs/migration/reverse_geocoding_point_index_mapping.md`
- **Source modification status**: `Not modified (Yes)`
- **Tests and validation commands run**: `npm test`
- **Known limitations**:
  * Nominatim/OpenStreetMap address data may be incomplete or imperfect.
  * Reverse-geocoded municipality/island values are evidence only, not final truth.
  * Administrative boundary ambiguity is expected for summit locations.
  * Later matching must treat nearby administrative names as loose evidence, not hard filters.
- **Next recommended steps**:
  1. Enrich summit candidates with nearby reverse-geocoding location evidence.
  2. Use location evidence as a loose hint in mountain_no-to-summit_candidate candidate linking.
  3. Keep island and municipality/county evidence separately; prefer island for display when available, but do not discard administrative evidence.

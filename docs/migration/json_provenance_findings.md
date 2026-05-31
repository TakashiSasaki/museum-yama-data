# JSON Provenance Findings

## Scope

This document focuses on the provenance, schemas, and migration status of the JSON data structures within the repository, specifically `reverse_geocoding/` and `museum-yama-web/mountains.json`.

## reverse_geocoding/

The `reverse_geocoding/` directory serves as a reverse geocoding result cache or external source snapshot for municipality-level location enrichment.

The project needs prefecture and municipality names from key latitude/longitude points. Exact address-level precision is not required. Existing reverse geocoding results may be reused to infer municipalities for nearby coordinates, because small coordinate differences (such as 500 m to 1 km) usually do not change the municipality. However, municipal or prefectural boundary cases must be flagged rather than silently normalized.

Future derived outputs (e.g., `data/03_primary/municipalities/` or `data/04_feature/location_enrichment/`) should record the source coordinate, matched cached coordinate or source record, distance if applicable, inferred municipality/prefecture, confidence or warning status, and source file/reference where possible.

### Schema / Field-Path Summary

Files in `reverse_geocoding/raw/nominatim/` (e.g., `geocoded_points_*.json`) are JSON arrays containing objects with the following structure:

- **Top-level JSON type:** Array of Objects
- **Representative top-level keys:**
  - `type` (e.g., "waypoint")
  - `source_point` (contains `lat`, `lon`, `ele`, `name`)
  - `reverse_geocoding` (contains `provider`, `requests`)
  - `metadata` (contains `script`, `script_version`, `cache_status`, `request_interval_ms`)
  - `source_file`

### Producer and Consumer Evidence

- **Producer:** The `metadata.script` field references `reverse_geocode_points.js`. This script exists at `.agents/skills/reverse-geocode-points/reverse_geocode_points.js` and produces these files.
- **Consumer:** There's a consumer script mentioned in `SKILL.md` (`extract_address_from_raw.js`) mapped to extract addresses from these files.

### Migration Implications

- **Data Role:** Reverse geocoding result cache / external source snapshot for municipality-level location enrichment.
- **Target Path:** `data/01_raw/reverse_geocoding/`
- **Future Derived Outputs:** `data/03_primary/municipalities/`, `data/04_feature/location_enrichment/`

### Remaining needs decision Items

- Even though the script is found, the schema contract, integration into the pipeline, and reuse logic (distance tolerances, boundary flagging) need full definition. It is kept as "needs decision" until the pipeline is completely defined.

## museum-yama-web/mountains.json

The `museum-yama-web/mountains.json` file appears to be a consolidated JSON dataset, potentially an artifact generated for web consumption.

### Schema / Field-Path Summary

- **Top-level JSON type:** Object (keyed by mountain name)
- **Representative top-level keys:** Mountain names (e.g., "関ヶ森")
- **Representative nested field paths:**
  - `municipalities` (Array of strings)
  - `activities` (Array of IDs)
  - `gpx_summit_data` (Object with `lat`, `lon`, `ele`)
  - `csv_gps_data` (Object or null)
  - `agent_survey_data` (Object or null)

### Producer and Consumer Evidence

- **Producer:** No explicit producer script was found in the repository codebase that generates this file or references fields like `agent_survey_data`.
- **Consumer:** Assumed to be consumed by the frontend web application (museum-yama-web), but there are no direct references within `.agents/` scripts.

### Migration Implications

- **Data Role:** Potential generated web cache. However, the presence of `agent_survey_data` suggests there may be manual curation or accumulated external corrections.

### Remaining needs decision Items

- **Full regeneration is not proven.** Because we cannot prove how this file is generated and whether it contains manual edits, it cannot be safely disposed of or classified. It remains strictly as "needs decision".

# Reverse Geocoding Point Index Mapping

This document details the source-to-target field mapping classifications for the extraction of reverse geocoding point indexes from raw Nominatim JSON cache files.

| Source Field / Attribute | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| raw file path | `raw_file_path` | `derived only` | Dynamic lineage field. |
| raw file SHA-256 | `raw_file_sha256` | `derived only` | Dynamic lineage field. |
| raw array record index | `raw_record_index` | `derived only` | Dynamic lineage field. |
| `type` | `metadata.original_type` | `migrated` | Preserved in metadata object. |
| `source_file` | `source_file` | `migrated` | Original GPX filename reference (or null if missing). |
| `source_point` | `source_point` | `migrated` | Preserved raw coordinate and query metadata object. |
| `source_point.lat` | `lat` | `migrated` | Query latitude parsed to float. |
| `source_point.lon` | `lon` | `migrated` | Query longitude parsed to float. |
| `reverse_geocoding` | N/A | `partially migrated` | Parent object containing raw response body. |
| `reverse_geocoding.provider` or equivalent | `provider` | `migrated` | Geocoding service provider name (e.g. `nominatim`). |
| `reverse_geocoding.display_name` | `display_name` | `migrated` | Full localized display address (extracted from `reverse_geocoding.requests.ja.response.body.display_name`). |
| `reverse_geocoding.address` | `address` | `migrated` | Raw address components map (extracted from response body address). |
| `reverse_geocoding.address.prefecture / state` | `prefecture` | `migrated` | Prefecture name (mapped from `province`, `state`, or `prefecture`). |
| `reverse_geocoding.address.county` | `county` | `migrated` | County name. |
| `reverse_geocoding.address.city` | `city` | `migrated` | City name. |
| `reverse_geocoding.address.town` | `town` | `migrated` | Town name. |
| `reverse_geocoding.address.village` | `village` | `migrated` | Village name. |
| `reverse_geocoding.address.island` | `island` | `migrated` | Island name if present. |
| `reverse_geocoding.address.local` or equivalent local name | `local` | `migrated` | Sub-municipality local name (mapped from `suburb`, `road`, `neighbourhood`, etc.). |
| `metadata` | `metadata` | `migrated` | Preserved and enriched. |
| any provider-specific keys present in the raw records | `address` / `metadata` | `preserved_as_raw_snapshot` | Provider-specific response fields remain in the raw address map or metadata, not lost. |


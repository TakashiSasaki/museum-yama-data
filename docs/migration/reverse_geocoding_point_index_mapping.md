# Reverse Geocoding Point Index Mapping

This document details the source-to-target field mapping classifications for the extraction of reverse geocoding point indexes from raw Nominatim JSON cache files.

## Field Classifications

| Source Field / Attribute | Target Field | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- |
| `type` | `metadata.original_type` | `migrated` | Preserved in metadata object. |
| `source_file` | `source_file` | `migrated` | Original GPX filename reference. |
| `source_point` | `source_point` | `migrated` | Coordinates and name queried. |
| `source_point.lat` | `lat` | `migrated` | Query latitude parsed to float. |
| `source_point.lon` | `lon` | `migrated` | Query longitude parsed to float. |
| `reverse_geocoding.provider` | `provider` | `migrated` | Geocoding service name. |
| `reverse_geocoding.requests.ja.response.body.display_name` | `display_name` | `migrated` | Full localized display address. |
| `reverse_geocoding.requests.ja.response.body.address` | `address` | `migrated` | Raw address components map. |
| `reverse_geocoding.requests.ja.response.body.address.province` / `state` | `prefecture` | `migrated` | Prefecture/province name. |
| `reverse_geocoding.requests.ja.response.body.address.county` | `county` | `migrated` | County name. |
| `reverse_geocoding.requests.ja.response.body.address.city` | `city` | `migrated` | City name. |
| `reverse_geocoding.requests.ja.response.body.address.town` | `town` | `migrated` | Town name. |
| `reverse_geocoding.requests.ja.response.body.address.village` | `village` | `migrated` | Village name. |
| `reverse_geocoding.requests.ja.response.body.address.island` | `island` | `migrated` | Island name if present. |
| `reverse_geocoding.requests.ja.response.body.address.suburb`/`road`/etc. | `local` | `migrated` | Sub-municipality local name. |
| `metadata` | `metadata` | `migrated` | Preserved and enriched. |
| Raw API response array structure | `raw_snapshot_preserved` | `derived only` | Re-serialized into JSONL. |
| physical file path | `raw_file_path` | `derived only` | Dynamic lineage field. |
| file checksum | `raw_file_sha256` | `derived only` | Dynamic lineage field. |
| record index in array | `raw_record_index` | `derived only` | Dynamic lineage field. |

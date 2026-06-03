# Reverse Geocoding Cache Migration Audit

## Scope

This audit covers only the reverse geocoding raw cache files that were previously stored under the legacy top-level `reverse_geocoding/` directory.

It does not authorize movement of GPX, CSV, YAMAP Markdown, legacy web cache data, generated reporting artifacts, or any other source/data directory.

## Source-to-Target Mapping

| source path | target path | classification | disposition | validation |
| --- | --- | --- | --- | --- |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-01-46-058Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-01-46-058Z.json` | preserved as raw snapshot | moved | same blob SHA `8376049fb9e8d4ad2e56c87b92d0f2234e907b02` |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-22-14-402Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-22-14-402Z.json` | preserved as raw snapshot | moved | same blob SHA `e31b375cb647b6bf22348b00650dfdfbcc1cfa3d` |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-57-27-013Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T08-57-27-013Z.json` | preserved as raw snapshot | moved | same blob SHA `fc29c11223ff239e9eee0ef78f310604381b8427` |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T09-43-14-144Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T09-43-14-144Z.json` | preserved as raw snapshot | moved | same blob SHA `8c4575339a325a08be585ff838b79b0b3ec3e0f6` |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T10-37-52-045Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T10-37-52-045Z.json` | preserved as raw snapshot | moved | same blob SHA `316a71363a5de1bc094e17ad07b46c8793c7a14a` |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T11-53-20-168Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T11-53-20-168Z.json` | preserved as raw snapshot | moved | same blob SHA `73ea3bc71711309d4ce3c17e48a534d47238aa68` |
| `reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T13-18-23-445Z.json` | `data/01_raw/reverse_geocoding/raw/nominatim/geocoded_points_2026-05-16T13-18-23-445Z.json` | preserved as raw snapshot | moved | same blob SHA `75f55abb3d782833d8806201c6346a6956d0bff7` |

## Field Coverage

All fields in the JSON files are preserved byte-for-byte because the target files reuse the exact same Git blob SHAs as the source files.

The known relevant field paths are:

- `type`: preserved as raw snapshot
- `source_file`: preserved as raw snapshot
- `source_point`: preserved as raw snapshot
- `source_point.lat`: preserved as raw snapshot
- `source_point.lon`: preserved as raw snapshot
- `source_point.ele`: preserved as raw snapshot where present
- `source_point.name`: preserved as raw snapshot where present
- `reverse_geocoding`: preserved as raw snapshot
- `reverse_geocoding.provider`: preserved as raw snapshot
- `reverse_geocoding.requests`: preserved as raw snapshot
- `reverse_geocoding.requests.ja`: preserved as raw snapshot where present
- `reverse_geocoding.requests.en`: preserved as raw snapshot where present
- `reverse_geocoding.requests.*.requested_at`: preserved as raw snapshot
- `reverse_geocoding.requests.*.request`: preserved as raw snapshot
- `reverse_geocoding.requests.*.response`: preserved as raw snapshot
- `metadata`: preserved as raw snapshot
- `metadata.script`: preserved as raw snapshot
- `metadata.script_version`: preserved as raw snapshot
- `metadata.cache_status`: preserved as raw snapshot
- `metadata.request_interval_ms`: preserved as raw snapshot

No source field is intentionally discarded, partially migrated, or converted into a derived-only representation in this migration.

## Producer / Consumer Updates

The reverse geocoding skill remains portable. It accepts explicit `--input` and `--out` paths. The repository example in `.agents/skills/reverse-geocode-points/SKILL.md` now uses the new raw cache path:

```text
data/01_raw/reverse_geocoding/raw/nominatim
```

`reverse_geocode_points.js` was updated so directory-style outputs are created when missing. This lets agents write directly to the new cache path without relying on pre-created repository directories or hardcoded repository-root assumptions.

## Remaining Decisions

The raw cache storage path is resolved by this audit.

The following are still not resolved by this audit:

- the formal schema contract for downstream extracted municipality data
- nearest-cache reuse logic beyond the existing 1 km policy note
- boundary-case handling beyond the requirement to flag rather than silently normalize
- final placement of generated extracted/projection outputs under `data/03_primary/`, `data/04_feature/`, or `artifacts/generated/`

Those downstream outputs are generated datasets, not raw cache snapshots.

## Rollback Strategy

Rollback is a pure path reversal: move the same seven blob SHAs back from `data/01_raw/reverse_geocoding/raw/nominatim/` to `reverse_geocoding/raw/nominatim/`, then restore the old skill examples if needed.

# Dense Context Summit Candidate Extraction v2 Source-to-Target Mapping

## 1. Raw GPX Fields
- `lat`, `lon`, `ele`, `time`, `segment index`, `trackpoint index`: `migrated`.
- `<name>`: `partially migrated` (used for named context).

## 2. Mountain Source Fields
- `mountain_no`: `partially migrated`.
- `name`: `partially migrated` (text matching).
- `coordinates`: `derived only` (CSV anchors).
- Other fields: `intentionally discarded`.

## 3. Canonical / Stage 30 / Gemini / Activity / Stage 32
- Key identifiers (IDs, Lat/Lon): `derived only` (distance and coverage).
- Text fields: `derived only` (matching).
- All mapping is understood. `needs decision` = 0.

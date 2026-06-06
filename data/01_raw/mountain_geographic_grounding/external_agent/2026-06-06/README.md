# External Agent Mountain Geographic Grounding Raw Responses

This directory is reserved for raw external-agent geographic grounding responses for mountain records.

Expected files to be added manually later:

- `gemini_grounding_responses_raw.json`
- `manifest.json`

The expected JSON file contains Gemini geographic grounding responses derived from request packets under:

```text
data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_request_packets
```

Those request packets were used as prompts for Gemini. The Gemini responses were pasted into Google Docs, downloaded as `.docx` files, extracted, and consolidated externally into JSON.

This directory is for raw external-agent response snapshots. The data may intentionally preserve duplicate `mountain_no` records, unresolved coordinates, coordinate conflicts, and non-final external-agent grounding evidence.

Do not treat files in this directory as final canonical mountain coordinates.

Do not place generated primary, feature, or final resolved datasets here. Those should be created in later pipeline stages under the appropriate reviewed output paths such as `data/03_primary/`, `data/04_feature/`, or another explicitly documented output location.

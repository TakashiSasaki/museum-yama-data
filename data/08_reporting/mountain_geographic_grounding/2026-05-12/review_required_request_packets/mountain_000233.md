# Geographic grounding request: mountain_000233

## Target mountain
- **Mountain No**: 233
- **Mountain Name**: undefined
- **Prefecture**: Ehime Prefecture
- **Municipality / Island**: 久万高原町
- **Municipality**: 久万高原町
- **Island**: N/A
- **Official Elevation**: 1982 m
- **Known CSV Coordinates**: (N/A, N/A)
- **YAMAP URL**: [YAMAP Page](https://yamap.com/activities/17465823)

## Why this mountain was selected
- **Selection Reason Codes**: `review_bucket_resolve_conflict, compact_review_priority_high, mutual_top1_false, compact_reason_shared_candidate, compact_reason_not_mutual_top1, prio_reason_shared_top, prio_reason_top_ambiguous, stability_level_location_uncertain_keep, municipality_stability_boundary_ambiguous`
- **Review Buckets Involved**: `resolve_conflict, low_priority`
- **Compact Review Priorities**: `high, low`

### Conflict/Warning Summary:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:3b98b67bbe0fe0f9 on yamap_2022-05-22_08_09.gpx is linked to: #93 南尖峰, #233 天狗岳, #234 石鎚山
- Candidate summit-candidate:19713e48698f3e2a on yamap_2025-09-07_08_00.gpx is linked to: #93 南尖峰, #233 天狗岳, #234 石鎚山, #423 鶴ノ子ノ頭
- Candidate summit-candidate:88555c5557efeb46 on yamap_2022-09-24_08_33.gpx is linked to: #93 南尖峰, #233 天狗岳, #234 石鎚山

## Existing project context

### Top-1 Suggested Candidate: `summit-candidate:3b98b67bbe0fe0f9`
- **GPX Basename**: `yamap_2022-05-22_08_09.gpx`
- **Track Name**: 石鎚山・天狗岳・南尖峰
- **Coordinates**: (33.7675949, 133.1152818)
- **Elevation**: 1979.1701508543217m (Diff: 2.83m)
- **Stability Level**: `location_uncertain_keep`
- **Municipality Match Status**: `candidate_boundary_ambiguous`
- **Nearest Geocoded Place**: N/A


### Alternatives Overview:
### Alternative Candidate #1: `summit-candidate:3b98b67bbe0fe0f9`
- **GPX File**: `yamap_2022-05-22_08_09.gpx`
- **Track Name**: 石鎚山・天狗岳・南尖峰
- **Coordinates**: (33.7675949, 133.1152818)
- **Elevation**: 1979.1701508543217m (Diff: 2.83m)
- **Score / Rank**: Score = 0.68, Rank = 1
- **Mutual Top-1**: false
- **Stability Level**: `location_uncertain_keep`

### Alternative Candidate #2: `summit-candidate:19713e48698f3e2a`
- **GPX File**: `yamap_2025-09-07_08_00.gpx`
- **Track Name**: 鶴ノ子ノ頭・石鎚山
- **Coordinates**: (33.768961, 133.1134874)
- **Elevation**: 1967.0036586656968m (Diff: 15m)
- **Score / Rank**: Score = 0.27, Rank = 2
- **Mutual Top-1**: false
- **Stability Level**: `location_uncertain_keep`

### Alternative Candidate #3: `summit-candidate:88555c5557efeb46`
- **GPX File**: `yamap_2022-09-24_08_33.gpx`
- **Track Name**: 石鎚山
- **Coordinates**: (33.7688125, 133.1135435)
- **Elevation**: 1967.3733333333332m (Diff: 14.63m)
- **Score / Rank**: Score = 0.27, Rank = 3
- **Mutual Top-1**: false
- **Stability Level**: `location_uncertain_keep`

## Known ambiguity
- **Shared summit candidate conflicts**: Yes
- **Close alternatives**: No
- **Location warning**: No
- **Boundary ambiguity**: Yes

## Task for geographic grounding agent
```text
You are a geographic grounding agent. Your task is to verify and resolve the correct geographic location of mountain "undefined" (No. 233) in Ehime Prefecture, Japan.

Official Mountain Details:
- Name: undefined
- Official Elevation: 1982m
- Source Municipality/Island: 久万高原町
- Known CSV Coordinates: (None, None)
- YAMAP URL: https://yamap.com/activities/17465823

Existing Summit Candidate matches in GPX track files:
Candidate #1: summit-candidate:3b98b67bbe0fe0f9
  Coordinates: (33.7675949, 133.1152818)
  GPX Track: yamap_2022-05-22_08_09.gpx ("石鎚山・天狗岳・南尖峰")
  Elevation: 1979.1701508543217m (Diff from target: 2.83m)
  Score: 0.68, Rank: 1, Mutual Top-1: false
  Stability level: location_uncertain_keep

Candidate #2: summit-candidate:19713e48698f3e2a
  Coordinates: (33.768961, 133.1134874)
  GPX Track: yamap_2025-09-07_08_00.gpx ("鶴ノ子ノ頭・石鎚山")
  Elevation: 1967.0036586656968m (Diff from target: 15m)
  Score: 0.27, Rank: 2, Mutual Top-1: false
  Stability level: location_uncertain_keep

Candidate #3: summit-candidate:88555c5557efeb46
  Coordinates: (33.7688125, 133.1135435)
  GPX Track: yamap_2022-09-24_08_33.gpx ("石鎚山")
  Elevation: 1967.3733333333332m (Diff from target: 14.63m)
  Score: 0.27, Rank: 3, Mutual Top-1: false
  Stability level: location_uncertain_keep

Conflicts & Ambiguity Context:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:3b98b67bbe0fe0f9 on yamap_2022-05-22_08_09.gpx is linked to: #93 南尖峰, #233 天狗岳, #234 石鎚山
- Candidate summit-candidate:19713e48698f3e2a on yamap_2025-09-07_08_00.gpx is linked to: #93 南尖峰, #233 天狗岳, #234 石鎚山, #423 鶴ノ子ノ頭
- Candidate summit-candidate:88555c5557efeb46 on yamap_2022-09-24_08_33.gpx is linked to: #93 南尖峰, #233 天狗岳, #234 石鎚山

Please search geographical references (such as YAMAP diary entries, GSI maps, or other Ehime mountain databases) to determine:
1. The true summit coordinates of "undefined".
2. Which, if any, of the GPX summit candidates represents the true summit.
3. If no candidate matches, or if evidence is insufficient, classify the status accordingly.

Your output must be JSON ONLY matching the requested schema. Do not guess coordinates when evidence is insufficient.
```

## Requested output format
JSON schema only:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GeographicGroundingResult",
  "type": "object",
  "properties": {
    "mountain_no": {
      "type": "integer"
    },
    "mountain_name": {
      "type": "string"
    },
    "grounding_status": {
      "type": "string",
      "enum": [
        "grounded_verified",
        "grounded_plausible_alternative",
        "ambiguous_homonymous",
        "insufficient_evidence",
        "no_candidate_matches"
      ]
    },
    "grounded_lat": {
      "type": [
        "number",
        "null"
      ]
    },
    "grounded_lon": {
      "type": [
        "number",
        "null"
      ]
    },
    "grounded_elevation_m": {
      "type": [
        "number",
        "null"
      ]
    },
    "grounded_municipality": {
      "type": [
        "string",
        "null"
      ]
    },
    "confidence_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "explanation": {
      "type": "string"
    },
    "evidence_links": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "mountain_no",
    "mountain_name",
    "grounding_status",
    "confidence_score",
    "explanation",
    "evidence_links"
  ]
}
```

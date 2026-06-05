# Geographic grounding request: mountain_000076

## Target mountain
- **Mountain No**: 76
- **Mountain Name**: undefined
- **Prefecture**: Ehime Prefecture
- **Municipality / Island**: 久万高原町
- **Municipality**: 久万高原町
- **Island**: N/A
- **Official Elevation**: 1806 m
- **Known CSV Coordinates**: (N/A, N/A)
- **YAMAP URL**: [YAMAP Page](https://yamap.com/activities/16929212)

## Why this mountain was selected
- **Selection Reason Codes**: `stability_level_location_uncertain_keep, municipality_stability_outside_prefecture`
- **Review Buckets Involved**: `accept_candidate_after_map_check, resolve_conflict, check_close_alternatives`
- **Compact Review Priorities**: `medium, high`

### Conflict/Warning Summary:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:43f9d4fa36aabb79 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #312 男山, #512 黒山
- Candidate summit-candidate:591204fdc01b55b6 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #119 寒風山, #167 冠山, #294 八辻ノ峰, #317 伊予富士, #417 東黒森, #512 黒山
- Candidate summit-candidate:71b10e23075edf20 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #105 鞍瀬ノ頭, #107 面河の頭, #108 西ノ冠岳, #109 西黒森, #120 ちち山, #121 笹ヶ峰, #312 男山, #512 黒山
- Candidate summit-candidate:d13554ef3debca9d on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #160 黒岳, #162 二ッ岳, #222 西赤石山, #223 物住頭, #423 鶴ノ子ノ頭, #427 剣山, #512 黒山

## Existing project context

### Top-1 Suggested Candidate: `summit-candidate:43f9d4fa36aabb79`
- **GPX Basename**: `yamap_2022-04-30_08_30.gpx`
- **Track Name**: 岩黒山・筒上山・手箱山
- **Coordinates**: (33.7288641, 133.1784766)
- **Elevation**: 1808.4700055808014m (Diff: 2.47m)
- **Stability Level**: `location_uncertain_keep`
- **Municipality Match Status**: `candidate_outside_prefecture`
- **Nearest Geocoded Place**: N/A


### Alternatives Overview:
### Alternative Candidate #1: `summit-candidate:43f9d4fa36aabb79`
- **GPX File**: `yamap_2022-04-30_08_30.gpx`
- **Track Name**: 岩黒山・筒上山・手箱山
- **Coordinates**: (33.7288641, 133.1784766)
- **Elevation**: 1808.4700055808014m (Diff: 2.47m)
- **Score / Rank**: Score = 0.68, Rank = 1
- **Mutual Top-1**: true
- **Stability Level**: `location_uncertain_keep`

### Alternative Candidate #2: `summit-candidate:71b10e23075edf20`
- **GPX File**: `yamap_2022-04-30_08_30.gpx`
- **Track Name**: 岩黒山・筒上山・手箱山
- **Coordinates**: (33.732243, 133.160912)
- **Elevation**: 1863.226432016608m (Diff: 57.23m)
- **Score / Rank**: Score = 0.67, Rank = 2
- **Mutual Top-1**: false
- **Stability Level**: `location_strong_match`

### Alternative Candidate #3: `summit-candidate:d13554ef3debca9d`
- **GPX File**: `yamap_2022-04-30_08_30.gpx`
- **Track Name**: 岩黒山・筒上山・手箱山
- **Coordinates**: (33.7457474, 133.1572601)
- **Elevation**: 1638.4079336000111m (Diff: 167.59m)
- **Score / Rank**: Score = 0.67, Rank = 3
- **Mutual Top-1**: false
- **Stability Level**: `location_strong_match`

## Known ambiguity
- **Shared summit candidate conflicts**: Yes
- **Close alternatives**: Yes
- **Location warning**: No
- **Boundary ambiguity**: No

## Task for geographic grounding agent
```text
You are a geographic grounding agent. Your task is to verify and resolve the correct geographic location of mountain "undefined" (No. 76) in Ehime Prefecture, Japan.

Official Mountain Details:
- Name: undefined
- Official Elevation: 1806m
- Source Municipality/Island: 久万高原町
- Known CSV Coordinates: (None, None)
- YAMAP URL: https://yamap.com/activities/16929212

Existing Summit Candidate matches in GPX track files:
Candidate #1: summit-candidate:43f9d4fa36aabb79
  Coordinates: (33.7288641, 133.1784766)
  GPX Track: yamap_2022-04-30_08_30.gpx ("岩黒山・筒上山・手箱山")
  Elevation: 1808.4700055808014m (Diff from target: 2.47m)
  Score: 0.68, Rank: 1, Mutual Top-1: true
  Stability level: location_uncertain_keep

Candidate #2: summit-candidate:71b10e23075edf20
  Coordinates: (33.732243, 133.160912)
  GPX Track: yamap_2022-04-30_08_30.gpx ("岩黒山・筒上山・手箱山")
  Elevation: 1863.226432016608m (Diff from target: 57.23m)
  Score: 0.67, Rank: 2, Mutual Top-1: false
  Stability level: location_strong_match

Candidate #3: summit-candidate:d13554ef3debca9d
  Coordinates: (33.7457474, 133.1572601)
  GPX Track: yamap_2022-04-30_08_30.gpx ("岩黒山・筒上山・手箱山")
  Elevation: 1638.4079336000111m (Diff from target: 167.59m)
  Score: 0.67, Rank: 3, Mutual Top-1: false
  Stability level: location_strong_match

Conflicts & Ambiguity Context:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:43f9d4fa36aabb79 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #312 男山, #512 黒山
- Candidate summit-candidate:591204fdc01b55b6 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #119 寒風山, #167 冠山, #294 八辻ノ峰, #317 伊予富士, #417 東黒森, #512 黒山
- Candidate summit-candidate:71b10e23075edf20 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #105 鞍瀬ノ頭, #107 面河の頭, #108 西ノ冠岳, #109 西黒森, #120 ちち山, #121 笹ヶ峰, #312 男山, #512 黒山
- Candidate summit-candidate:d13554ef3debca9d on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #160 黒岳, #162 二ッ岳, #222 西赤石山, #223 物住頭, #423 鶴ノ子ノ頭, #427 剣山, #512 黒山

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

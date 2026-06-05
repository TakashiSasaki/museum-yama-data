# Geographic grounding request: mountain_000119

## Target mountain
- **Mountain No**: 119
- **Mountain Name**: undefined
- **Prefecture**: Ehime Prefecture
- **Municipality / Island**: 西条市
- **Municipality**: 西条市
- **Island**: N/A
- **Official Elevation**: 1762 m
- **Known CSV Coordinates**: (N/A, N/A)
- **YAMAP URL**: [YAMAP Page](https://yamap.com/activities/19457807)

## Why this mountain was selected
- **Selection Reason Codes**: `stability_level_location_uncertain_keep, municipality_stability_boundary_ambiguous`
- **Review Buckets Involved**: `accept_candidate_after_map_check, low_priority, check_location_warning`
- **Compact Review Priorities**: `medium, low, high`

### Conflict/Warning Summary:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:23eea13de5db5c9f on yamap_2022-09-09_06_58.gpx is linked to: #74 岩黒山, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #167 冠山, #317 伊予富士, #328 笹ヶ峰, #417 東黒森
- Candidate summit-candidate:9a59c4b620ba3792 on yamap_2022-09-09_06_58.gpx is linked to: #75 筒上山, #107 面河の頭, #109 西黒森, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #312 男山, #328 笹ヶ峰
- Candidate summit-candidate:395bb631522975b6 on yamap_2022-09-09_06_58.gpx is linked to: #60 鬼ヶ城山, #62 八面山, #63 大久保山, #69 雨包山, #86 七々木山, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #212 南三方ヶ森, #226 黒森山, #244 二ノ岳, #288 串ヶ森, #289 目黒鳥屋, #322 三の森, #328 笹ヶ峰, #330 天堤山, #419 小牛城, #441 地蔵山, #473 三傍示山, #525 櫛ヶ峰
- Candidate summit-candidate:7213c478833fd90f on yamap_2022-09-09_06_58.gpx is linked to: #75 筒上山, #107 面河の頭, #109 西黒森, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #312 男山, #328 笹ヶ峰
- Candidate summit-candidate:591204fdc01b55b6 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #119 寒風山, #167 冠山, #294 八辻ノ峰, #317 伊予富士, #417 東黒森, #512 黒山
- Candidate summit-candidate:c9e357d000632346 on yamap_2026-05-02_09_29.gpx is linked to: #74 岩黒山, #119 寒風山, #167 冠山, #239 東赤石山, #294 八辻ノ峰, #295 五代ヶ森, #312 男山, #313 瓶ヶ森, #317 伊予富士, #417 東黒森, #499 台ヶ森
- Candidate summit-candidate:6f70c7d3c27fe164 on yamap_2024-09-14_07_46.gpx is linked to: #74 岩黒山, #119 寒風山, #167 冠山, #294 八辻ノ峰, #317 伊予富士, #417 東黒森

## Existing project context

### Top-1 Suggested Candidate: `summit-candidate:23eea13de5db5c9f`
- **GPX Basename**: `yamap_2022-09-09_06_58.gpx`
- **Track Name**: 寒風山・笹ヶ峰・ちち山
- **Coordinates**: (33.8116552, 133.2616339)
- **Elevation**: 1758.0533333333333m (Diff: 3.95m)
- **Stability Level**: `location_uncertain_keep`
- **Municipality Match Status**: `candidate_boundary_ambiguous`
- **Nearest Geocoded Place**: N/A


### Alternatives Overview:
### Alternative Candidate #1: `summit-candidate:23eea13de5db5c9f`
- **GPX File**: `yamap_2022-09-09_06_58.gpx`
- **Track Name**: 寒風山・笹ヶ峰・ちち山
- **Coordinates**: (33.8116552, 133.2616339)
- **Elevation**: 1758.0533333333333m (Diff: 3.95m)
- **Score / Rank**: Score = 0.68, Rank = 1
- **Mutual Top-1**: true
- **Stability Level**: `location_uncertain_keep`

### Alternative Candidate #2: `summit-candidate:9a59c4b620ba3792`
- **GPX File**: `yamap_2022-09-09_06_58.gpx`
- **Track Name**: 寒風山・笹ヶ峰・ちち山
- **Coordinates**: (33.8282719, 133.274721)
- **Elevation**: 1856.2533333333333m (Diff: 94.25m)
- **Score / Rank**: Score = 0.57, Rank = 2
- **Mutual Top-1**: false
- **Stability Level**: `location_uncertain_keep`

### Alternative Candidate #3: `summit-candidate:7213c478833fd90f`
- **GPX File**: `yamap_2022-09-09_06_58.gpx`
- **Track Name**: 寒風山・笹ヶ峰・ちち山
- **Coordinates**: (33.8318331, 133.2842619)
- **Elevation**: 1846.8m (Diff: 84.8m)
- **Score / Rank**: Score = 0.55, Rank = 3
- **Mutual Top-1**: false
- **Stability Level**: `boundary_plausible`

## Known ambiguity
- **Shared summit candidate conflicts**: Yes
- **Close alternatives**: No
- **Location warning**: Yes
- **Boundary ambiguity**: Yes

## Task for geographic grounding agent
```text
You are a geographic grounding agent. Your task is to verify and resolve the correct geographic location of mountain "undefined" (No. 119) in Ehime Prefecture, Japan.

Official Mountain Details:
- Name: undefined
- Official Elevation: 1762m
- Source Municipality/Island: 西条市
- Known CSV Coordinates: (None, None)
- YAMAP URL: https://yamap.com/activities/19457807

Existing Summit Candidate matches in GPX track files:
Candidate #1: summit-candidate:23eea13de5db5c9f
  Coordinates: (33.8116552, 133.2616339)
  GPX Track: yamap_2022-09-09_06_58.gpx ("寒風山・笹ヶ峰・ちち山")
  Elevation: 1758.0533333333333m (Diff from target: 3.95m)
  Score: 0.68, Rank: 1, Mutual Top-1: true
  Stability level: location_uncertain_keep

Candidate #2: summit-candidate:9a59c4b620ba3792
  Coordinates: (33.8282719, 133.274721)
  GPX Track: yamap_2022-09-09_06_58.gpx ("寒風山・笹ヶ峰・ちち山")
  Elevation: 1856.2533333333333m (Diff from target: 94.25m)
  Score: 0.57, Rank: 2, Mutual Top-1: false
  Stability level: location_uncertain_keep

Candidate #3: summit-candidate:7213c478833fd90f
  Coordinates: (33.8318331, 133.2842619)
  GPX Track: yamap_2022-09-09_06_58.gpx ("寒風山・笹ヶ峰・ちち山")
  Elevation: 1846.8m (Diff from target: 84.8m)
  Score: 0.55, Rank: 3, Mutual Top-1: false
  Stability level: boundary_plausible

Conflicts & Ambiguity Context:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:23eea13de5db5c9f on yamap_2022-09-09_06_58.gpx is linked to: #74 岩黒山, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #167 冠山, #317 伊予富士, #328 笹ヶ峰, #417 東黒森
- Candidate summit-candidate:9a59c4b620ba3792 on yamap_2022-09-09_06_58.gpx is linked to: #75 筒上山, #107 面河の頭, #109 西黒森, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #312 男山, #328 笹ヶ峰
- Candidate summit-candidate:395bb631522975b6 on yamap_2022-09-09_06_58.gpx is linked to: #60 鬼ヶ城山, #62 八面山, #63 大久保山, #69 雨包山, #86 七々木山, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #212 南三方ヶ森, #226 黒森山, #244 二ノ岳, #288 串ヶ森, #289 目黒鳥屋, #322 三の森, #328 笹ヶ峰, #330 天堤山, #419 小牛城, #441 地蔵山, #473 三傍示山, #525 櫛ヶ峰
- Candidate summit-candidate:7213c478833fd90f on yamap_2022-09-09_06_58.gpx is linked to: #75 筒上山, #107 面河の頭, #109 西黒森, #119 寒風山, #120 ちち山, #121 笹ヶ峰, #312 男山, #328 笹ヶ峰
- Candidate summit-candidate:591204fdc01b55b6 on yamap_2022-04-30_08_30.gpx is linked to: #74 岩黒山, #75 筒上山, #76 手箱山, #119 寒風山, #167 冠山, #294 八辻ノ峰, #317 伊予富士, #417 東黒森, #512 黒山
- Candidate summit-candidate:c9e357d000632346 on yamap_2026-05-02_09_29.gpx is linked to: #74 岩黒山, #119 寒風山, #167 冠山, #239 東赤石山, #294 八辻ノ峰, #295 五代ヶ森, #312 男山, #313 瓶ヶ森, #317 伊予富士, #417 東黒森, #499 台ヶ森
- Candidate summit-candidate:6f70c7d3c27fe164 on yamap_2024-09-14_07_46.gpx is linked to: #74 岩黒山, #119 寒風山, #167 冠山, #294 八辻ノ峰, #317 伊予富士, #417 東黒森

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

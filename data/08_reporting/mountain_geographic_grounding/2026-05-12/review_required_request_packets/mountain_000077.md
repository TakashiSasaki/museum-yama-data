# Geographic grounding request: mountain_000077

## Target mountain
- **Mountain No**: 77
- **Mountain Name**: undefined
- **Prefecture**: Ehime Prefecture
- **Municipality / Island**: 久万高原町
- **Municipality**: 久万高原町
- **Island**: N/A
- **Official Elevation**: 1525 m
- **Known CSV Coordinates**: (N/A, N/A)
- **YAMAP URL**: [YAMAP Page](https://yamap.com/activities/16982038)

## Why this mountain was selected
- **Selection Reason Codes**: `review_bucket_resolve_conflict, compact_review_priority_high, compact_reason_shared_candidate, prio_reason_shared_top, prio_reason_top_ambiguous, municipality_stability_near_boundary`
- **Review Buckets Involved**: `resolve_conflict, low_priority`
- **Compact Review Priorities**: `high, low`

### Conflict/Warning Summary:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:1ebd63d8e2790409 on yamap_2022-05-02_09_06.gpx is linked to: #77 大川嶺, #78 笠取山, #79 ウバホド山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #418 伊吹山, #500 丸山
- Candidate summit-candidate:33637f0e3b5b1405 on yamap_2022-05-02_09_06.gpx is linked to: #77 大川嶺, #78 笠取山, #79 ウバホド山, #159 権現山, #224 上兜山, #302 丸滝山, #305 椿山, #318 中津山(明神山), #426 前社ヶ森, #431 大座礼山, #500 丸山
- Candidate summit-candidate:22e40e9eb117a033 on yamap_2024-05-03_08_45.gpx is linked to: #77 大川嶺, #300 面河山, #301 丸笹山, #318 中津山(明神山), #418 伊吹山, #499 台ヶ森, #500 丸山
- Candidate summit-candidate:aa6060fe8a831f45 on yamap_2024-05-11_13_46.gpx is linked to: #77 大川嶺, #78 笠取山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #354 滝山, #500 丸山
- Candidate summit-candidate:fec0bb942061619b on yamap_2024-09-23_07_35.gpx is linked to: #55 明神山, #77 大川嶺, #78 笠取山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #319 猿越山, #343 明神山, #500 丸山
- Candidate summit-candidate:2666cead0a841bbb on yamap_2025-10-05_08_42.gpx is linked to: #77 大川嶺, #78 笠取山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #418 伊吹山, #430 三ッ森山, #431 大座礼山, #500 丸山
- Candidate summit-candidate:e79e77da4bfd1f13 on yamap_2025-07-06_12_03.gpx is linked to: #77 大川嶺, #79 ウバホド山, #166 獅子舞の鼻, #300 面河山, #301 丸笹山, #416 谷崎山, #417 東黒森, #418 伊吹山, #422 天狗ノ森, #428 東光森山, #498 黒森, #499 台ヶ森

## Existing project context

### Top-1 Suggested Candidate: `summit-candidate:1ebd63d8e2790409`
- **GPX Basename**: `yamap_2022-05-02_09_06.gpx`
- **Track Name**: 大川嶺・笠取山・ウバホド山
- **Coordinates**: (33.5604174, 132.9270238)
- **Elevation**: 1532.1452947696732m (Diff: 7.15m)
- **Stability Level**: `location_strong_match`
- **Municipality Match Status**: `same_municipality`
- **Nearest Geocoded Place**: 久万高原町


### Alternatives Overview:
### Alternative Candidate #1: `summit-candidate:1ebd63d8e2790409`
- **GPX File**: `yamap_2022-05-02_09_06.gpx`
- **Track Name**: 大川嶺・笠取山・ウバホド山
- **Coordinates**: (33.5604174, 132.9270238)
- **Elevation**: 1532.1452947696732m (Diff: 7.15m)
- **Score / Rank**: Score = 0.85, Rank = 1
- **Mutual Top-1**: true
- **Stability Level**: `location_strong_match`

### Alternative Candidate #2: `summit-candidate:33637f0e3b5b1405`
- **GPX File**: `yamap_2022-05-02_09_06.gpx`
- **Track Name**: 大川嶺・笠取山・ウバホド山
- **Coordinates**: (33.5552593, 132.9223115)
- **Elevation**: 1567.7094910140197m (Diff: 42.71m)
- **Score / Rank**: Score = 0.63, Rank = 2
- **Mutual Top-1**: false
- **Stability Level**: `location_uncertain_keep`

### Alternative Candidate #3: `summit-candidate:22e40e9eb117a033`
- **GPX File**: `yamap_2024-05-03_08_45.gpx`
- **Track Name**: 面河山
- **Coordinates**: (33.7513188, 133.1115977)
- **Elevation**: 1519.8633333333335m (Diff: 5.14m)
- **Score / Rank**: Score = 0.5, Rank = 3
- **Mutual Top-1**: false
- **Stability Level**: `location_strong_match`

## Known ambiguity
- **Shared summit candidate conflicts**: Yes
- **Close alternatives**: No
- **Location warning**: No
- **Boundary ambiguity**: Yes

## Task for geographic grounding agent
```text
You are a geographic grounding agent. Your task is to verify and resolve the correct geographic location of mountain "undefined" (No. 77) in Ehime Prefecture, Japan.

Official Mountain Details:
- Name: undefined
- Official Elevation: 1525m
- Source Municipality/Island: 久万高原町
- Known CSV Coordinates: (None, None)
- YAMAP URL: https://yamap.com/activities/16982038

Existing Summit Candidate matches in GPX track files:
Candidate #1: summit-candidate:1ebd63d8e2790409
  Coordinates: (33.5604174, 132.9270238)
  GPX Track: yamap_2022-05-02_09_06.gpx ("大川嶺・笠取山・ウバホド山")
  Elevation: 1532.1452947696732m (Diff from target: 7.15m)
  Score: 0.85, Rank: 1, Mutual Top-1: true
  Stability level: location_strong_match

Candidate #2: summit-candidate:33637f0e3b5b1405
  Coordinates: (33.5552593, 132.9223115)
  GPX Track: yamap_2022-05-02_09_06.gpx ("大川嶺・笠取山・ウバホド山")
  Elevation: 1567.7094910140197m (Diff from target: 42.71m)
  Score: 0.63, Rank: 2, Mutual Top-1: false
  Stability level: location_uncertain_keep

Candidate #3: summit-candidate:22e40e9eb117a033
  Coordinates: (33.7513188, 133.1115977)
  GPX Track: yamap_2024-05-03_08_45.gpx ("面河山")
  Elevation: 1519.8633333333335m (Diff from target: 5.14m)
  Score: 0.5, Rank: 3, Mutual Top-1: false
  Stability level: location_strong_match

Conflicts & Ambiguity Context:
Mountain shares candidates with other mountains:
- Candidate summit-candidate:1ebd63d8e2790409 on yamap_2022-05-02_09_06.gpx is linked to: #77 大川嶺, #78 笠取山, #79 ウバホド山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #418 伊吹山, #500 丸山
- Candidate summit-candidate:33637f0e3b5b1405 on yamap_2022-05-02_09_06.gpx is linked to: #77 大川嶺, #78 笠取山, #79 ウバホド山, #159 権現山, #224 上兜山, #302 丸滝山, #305 椿山, #318 中津山(明神山), #426 前社ヶ森, #431 大座礼山, #500 丸山
- Candidate summit-candidate:22e40e9eb117a033 on yamap_2024-05-03_08_45.gpx is linked to: #77 大川嶺, #300 面河山, #301 丸笹山, #318 中津山(明神山), #418 伊吹山, #499 台ヶ森, #500 丸山
- Candidate summit-candidate:aa6060fe8a831f45 on yamap_2024-05-11_13_46.gpx is linked to: #77 大川嶺, #78 笠取山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #354 滝山, #500 丸山
- Candidate summit-candidate:fec0bb942061619b on yamap_2024-09-23_07_35.gpx is linked to: #55 明神山, #77 大川嶺, #78 笠取山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #319 猿越山, #343 明神山, #500 丸山
- Candidate summit-candidate:2666cead0a841bbb on yamap_2025-10-05_08_42.gpx is linked to: #77 大川嶺, #78 笠取山, #224 上兜山, #300 面河山, #301 丸笹山, #302 丸滝山, #318 中津山(明神山), #418 伊吹山, #430 三ッ森山, #431 大座礼山, #500 丸山
- Candidate summit-candidate:e79e77da4bfd1f13 on yamap_2025-07-06_12_03.gpx is linked to: #77 大川嶺, #79 ウバホド山, #166 獅子舞の鼻, #300 面河山, #301 丸笹山, #416 谷崎山, #417 東黒森, #418 伊吹山, #422 天狗ノ森, #428 東光森山, #498 黒森, #499 台ヶ森

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

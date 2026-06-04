# Mountain Source JSON Field Mapping

This document lists the source-to-target field mapping classifications for the CSV-to-JSON normalization of the `愛媛県の山` mountain source data.

## Classification Table

| Source Column / Field | Target JSON Field | Target Role / Description | Classification | Reason / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `No` | `csv_no` | Original ID | `migrated` | Preserved as integer `csv_no` (null if originally blank). |
| `山名` | `name` | Mountain Name | `migrated` | Trimmed string. |
| `標高` | `elevation_m` | Elevation in Meters | `migrated` | Parsed to number (commas stripped). |
| `登頂回数` | N/A | Climb Count | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `YAMAP link` | `yamap_url` | YAMAP Activity URL | `migrated` | Preserved as URL string (null if absent). |
| `難易度ランク` | `difficulty_rank` | Difficulty Rank | `migrated` | Parsed to number if numeric, otherwise string (null if absent). |
| `エントリーコースお勧め山` | `entry_course_recommended` | Recommendation Flag | `migrated` | Parsed to boolean (`true` if `〇` or `○`, `false` otherwise). |
| `GPS` | `coordinates` | Coordinates Object | `migrated` | Parsed into `coordinates.lat` / `coordinates.lon`, raw saved in `coordinates.raw`. |
| `市町村・島` | `location` | Location Object | `migrated` | Mapped to `location.municipality_or_island` (raw), `location.municipality`, and `location.island`. |
| `年` | N/A | Year | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `シカ` | N/A | Deer Activity Flag | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `月` | N/A | Month | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `備考` | N/A | Remarks | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `分県登山ガイド（2008）` | N/A | Guide Reference | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `分県登山ガイド（2016）` | N/A | Guide Reference | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `四国の1000m峰（2015）` | N/A | Mountain List Reference | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `四国百山` | N/A | Mountain List Reference | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `百名山` | N/A | Mountain List Reference | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `愛媛ゆうゆう山歩き` | N/A | Mountain List Reference | `intentionally discarded` | Not currently used for analysis or visualization in the normalized JSON. |
| `mountain_no` | `mountain_no` | Unified Primary Key | `derived only` | Re-validated contiguous key `1..531`. |
| `csv_no` | `csv_no` | Original ID | `migrated` | Preserved as integer or null. |
| `source_row_no` | `source_row_no` | physical row number | `migrated` | Preserved as integer. |
| `mountain_no_source` | `mountain_no_source` | Source of effective key | `migrated` | String value (`csv_no` or `sequence_fill_after_max_csv_no`). |
| `mountain_no_status` | `mountain_no_status` | Classification of key | `migrated` | String value (`authoritative_csv_no` or `provisional_sequence_filled_no`). |
| `gps_raw` | `coordinates.raw` | Raw GPS string | `migrated` | Mapped to `coordinates.raw`. |
| `coordinate_source` | N/A | Source of coordinates | `intentionally discarded` | Handled via setting `coordinates.source = "csv_existing_gps"`. |
| `coordinate_status` | N/A | Coordinate validation status | `intentionally discarded` | Not part of primary target model schema. |

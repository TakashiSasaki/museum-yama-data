# Gemini-Grounded Mountain Summit Assignment Review Summary

* **Method ID**: `gemini_grounded_summit_assignment`
* **Run ID**: `2026-06-07_gemini_grounded_summit_assignment`
* **Timestamp**: 2026-06-07T05:19:16.766Z

## Core Statistics
* **Total Mountain Records**: 531
* **Successfully Assigned**: 295
* **Unassigned (No Coordinate Propose)**: 236
* **Total Needing Human Review**: 531
* **GPX-Supported Coordinates Assigned**: 81
* **Gemini-Only Coordinates Assigned**: 214
* **No Coordinate Assigned**: 236

## Review Category Counts
* **auto_supported_not_canonical**: 0
* **quick_review_recommended**: 22
* **manual_review_required**: 31
* **conflict_case**: 66
* **gemini_only_coordinate_review**: 214
* **no_assignment**: 198

> [!WARNING]
> These proposed assignments and coordinates are NOT final canonical truth. They represent algorithmic recommendations based on Gemini grounding indexes and nearby GPX trackpoints.

## Current Human Review Entry Point Replacement Status
* **Replaced Stage 25 review queues?**: **No**. Stage 25 `grounding_assisted_review_v2` remains the current authoritative human review entry point. These review files are created in isolation for audit and planning purposes.

## Next Steps
1. Review conflict cases first (`conflict_cases.csv`) and gemini-only assignments (`gemini_only_coordinate_review.csv`).
2. Run spatial validation checks on the proposed coordinate locations.

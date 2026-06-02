import csv
import re
from collections import Counter
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
DOCS_MIGRATION_DIR = ROOT_DIR / "docs" / "migration"
BASELINE_CSV = DOCS_MIGRATION_DIR / "summit_candidate_detection_baseline_summary.csv"
LINK_CSV = DOCS_MIGRATION_DIR / "gpx_yamap_activity_link_candidates.csv"
OUTPUT_CSV = DOCS_MIGRATION_DIR / "summit_candidate_detection_outlier_review.csv"
REPORT_PATH = DOCS_MIGRATION_DIR / "summit_candidate_detection_outlier_review.md"

def split_title(title):
    if not title:
        return 0
    # Split on various separators commonly used in Japanese mountain lists
    separators = r'[・/／〜～→,、]'
    components = [c.strip() for c in re.split(separators, title) if c.strip()]
    return len(components)

def main():
    # 1. Load the link data to get yamap title and match status
    link_data = {}
    if LINK_CSV.exists():
        with open(LINK_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                link_data[row["gpx_path"]] = {
                    "yamap_title": row.get("yamap_title", ""),
                    "match_status": row.get("match_status", ""),
                    "linked_yamap_activity_id": row.get("candidate_yamap_activity_id", "")
                }
    else:
        print(f"Warning: {LINK_CSV} not found.")

    outliers = []

    if not BASELINE_CSV.exists():
        print(f"Error: {BASELINE_CSV} not found.")
        return

    # 2. Read baseline summary and process row by row
    with open(BASELINE_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gpx_path = row["gpx_path"]
            track_name = row.get("track_name", "")

            try:
                candidate_count_default = int(row.get("candidate_count_default", 0))
            except ValueError:
                candidate_count_default = 0

            try:
                trackpoint_count = int(row.get("trackpoint_count", 0))
            except ValueError:
                trackpoint_count = 0

            try:
                valid_elevation_point_count = int(row.get("valid_elevation_point_count", 0))
            except ValueError:
                valid_elevation_point_count = 0

            try:
                elevation_range = float(row.get("elevation_range", 0.0))
            except ValueError:
                elevation_range = 0.0

            first_time_utc = row.get("first_time_utc", "")
            last_time_utc = row.get("last_time_utc", "")

            link_info = link_data.get(gpx_path, {})
            yamap_title = link_info.get("yamap_title", "")
            yamap_link_status = link_info.get("match_status", "")
            linked_yamap_activity_id = link_info.get("linked_yamap_activity_id", "")

            # Figure out title component count
            title_component_count = 0
            title_component_source = "none"
            if track_name:
                title_component_count = split_title(track_name)
                title_component_source = "track_name"
            elif yamap_title:
                title_component_count = split_title(yamap_title)
                title_component_source = "yamap_title"

            outlier_categories = []

            if candidate_count_default == 0:
                outlier_categories.append("zero_candidates")
            if candidate_count_default >= 5:
                outlier_categories.append("high_candidate_count")
            if trackpoint_count < 50:
                outlier_categories.append("few_trackpoints")
            if elevation_range < 50:
                outlier_categories.append("low_elevation_range")
            if yamap_link_status in ["no_candidate", "multiple_candidates", "needs_review"]:
                outlier_categories.append("linking_unresolved")

            # Weak heuristic: Title candidate count mismatch
            if title_component_count > 1 and candidate_count_default == 0:
                outlier_categories.append("title_candidate_count_mismatch")
            elif candidate_count_default > title_component_count + 3:
                # E.g. if title says "Mt A" (1) and we found 5 peaks, maybe over detection
                outlier_categories.append("title_candidate_count_mismatch")

            if outlier_categories:
                outlier_category = "|".join(outlier_categories)
                outliers.append({
                    "gpx_path": gpx_path,
                    "track_name": track_name,
                    "candidate_count_default": candidate_count_default,
                    "trackpoint_count": trackpoint_count,
                    "valid_elevation_point_count": valid_elevation_point_count,
                    "elevation_range": elevation_range,
                    "first_time_utc": first_time_utc,
                    "last_time_utc": last_time_utc,
                    "linked_yamap_activity_id": linked_yamap_activity_id,
                    "yamap_title": yamap_title,
                    "yamap_link_status": yamap_link_status,
                    "title_component_count": title_component_count,
                    "title_component_source": title_component_source,
                    "outlier_category": outlier_category,
                    "review_reason": "Criteria met: " + outlier_category,
                    "suggested_followup": "Review parameters or data quality",
                    "needs_manual_review": "True"
                })

    # 3. Write outliers to CSV
    fieldnames = [
        "gpx_path",
        "track_name",
        "candidate_count_default",
        "trackpoint_count",
        "valid_elevation_point_count",
        "elevation_range",
        "first_time_utc",
        "last_time_utc",
        "linked_yamap_activity_id",
        "yamap_title",
        "yamap_link_status",
        "title_component_count",
        "title_component_source",
        "outlier_category",
        "review_reason",
        "suggested_followup",
        "needs_manual_review"
    ]

    with open(OUTPUT_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(outliers)

    print(f"Generated {OUTPUT_CSV} with {len(outliers)} outliers.")

    # 4. Generate Markdown report
    total_outliers = len(outliers)

    category_counts = Counter()
    zero_candidates = []
    high_candidates = []

    for row in outliers:
        cats = row["outlier_category"].split("|")
        for c in cats:
            category_counts[c] += 1

        if "zero_candidates" in cats:
            if len(zero_candidates) < 5:
                zero_candidates.append(row)

        if "high_candidate_count" in cats:
            if len(high_candidates) < 5:
                high_candidates.append(row)

    markdown_content = f"""# Summit Candidate Detection Outlier Review

## Purpose
This review identifies outlier cases from the baseline summit candidate detection audit (`docs/migration/summit_candidate_detection_audit.md`). The goal is to surface problematic GPX files—such as those with zero candidates, excessive candidates, or unusually short tracks—to inform future parameter tuning for the `detect_summit_candidates` pipeline stage.

## Validation / Safety Notes
* **This is a read-only review.**
* No GPX files were modified or generated.
* No mountain names were assigned.
* The review does not choose final production parameters.
* Track names and YAMAP titles are used **only as review metadata** and are **not** detection evidence.

## Inputs Used
* `docs/migration/summit_candidate_detection_baseline_summary.csv`
* `docs/migration/gpx_yamap_activity_link_candidates.csv`

## Outlier Selection Criteria
The following transparent, conservative rules were used to flag outliers:
* **zero_candidates**: `candidate_count_default == 0`
* **high_candidate_count**: `candidate_count_default >= 5`
* **few_trackpoints**: `trackpoint_count < 50`
* **low_elevation_range**: `elevation_range < 50`
* **linking_unresolved**: GPX file has `no_candidate`, `multiple_candidates`, or `needs_review` match status in the linking audit.
* **title_candidate_count_mismatch**: A weak heuristic that compares the number of detected candidates against the number of mountain-like components in the track name or YAMAP title.

## Summary Counts by Category
A total of {total_outliers} GPX files met one or more outlier criteria.

| Outlier Category | Count |
| :--- | :--- |
"""
    for cat, count in category_counts.most_common():
        markdown_content += f"| {cat} | {count} |\n"

    markdown_content += """
## Zero-Candidate Examples
The following tracks yielded 0 summit candidates under the baseline parameters:

| GPX Path | Track Name | Trackpoints | Elevation Range | Outlier Categories |
| :--- | :--- | :--- | :--- | :--- |
"""
    for row in zero_candidates:
        markdown_content += f"| `{row['gpx_path']}` | {row['track_name']} | {row['trackpoint_count']} | {row['elevation_range']} | {row['outlier_category']} |\n"

    markdown_content += """
## High-Candidate-Count Examples
The following tracks yielded 5 or more candidates under the baseline parameters:

| GPX Path | Track Name | Candidates | Trackpoints | Elevation Range | Outlier Categories |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for row in high_candidates:
        markdown_content += f"| `{row['gpx_path']}` | {row['track_name']} | {row['candidate_count_default']} | {row['trackpoint_count']} | {row['elevation_range']} | {row['outlier_category']} |\n"

    markdown_content += """
## Title-Component Heuristic Notes
A simple heuristic split the `track_name` or `yamap_title` on common separators (`・`, `/`, `／`, `〜`, `～`, `→`, `,`, `、`) to count non-empty title components.
* If a title appears to contain multiple mountain names but no candidates were detected, it flags possible under-detection.
* If the number of candidates vastly exceeds the title components, it flags possible over-detection.
* **Warning:** This is a weak review heuristic only. Title metadata must not be treated as detection evidence or used to assign authoritative identities.

## Limitations
* This review relies on the existing baseline summary. It did not re-parse the GPX files directly.
* True false-positives/false-negatives can only be confirmed via manual visual inspection of the elevation profile or map.

## Recommendations
* **Short Tracks:** Files with `few_trackpoints` or `low_elevation_range` (such as very brief walks) often result in `zero_candidates`. Consider whether these files require a lower minimum prominence threshold or if they should be excluded from candidate detection.
* **Long Multi-Peak Traverses:** Files with `high_candidate_count` generally correlate with long, multi-peak traverse routes (as hinted by their multi-component titles). The current parameters might be performing correctly on these, but manual spot-checking is advised.
"""

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(markdown_content)

    print(f"Generated {REPORT_PATH}")

if __name__ == "__main__":
    main()

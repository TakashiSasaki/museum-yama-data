# Skill: Fetch YAMAP Activity Data (`fetch-yamap-data`)

Use this skill to extract detailed mountaineering records from YAMAP activity pages using the browser tool.

## Purpose
- Automates the extraction of metadata (Title, Date, Stats) and activity descriptions (活動詳細).
- Handles authenticated sessions to access diary entries and observations.
- Standardizes the output format into Markdown files for the repository.
- **Incremental Progress**: Each activity's data MUST be written to its corresponding Markdown file as soon as it is retrieved. DO NOT wait for the entire batch to finish before saving.

## Procedure for Agents

### 1. Navigation & Verification
- Navigate to `https://yamap.com/activities/{ID}`.
- **Error Handling**:
  - If the page shows "Mountain Not Found" (404), mark as **Deleted/Invalid**.
  - If the page shows "Forbidden" or access restricted (403), mark as **Private**.
  - If the page redirects to a login screen, ensure the user session is active.

### 2. Metadata Extraction (Top Section)
- Extract the **Title** (`h1` or `.ActivityDetailTabLayout__Title`).
- Extract the **Exact Date** (`.ActivityDetailTabLayout__Middle__Date`).
- Extract **Distance (km)**, **Time (duration)**, **Elevation Gain (m)**, and **Elevation Loss (m)** from `.ActivityDetailTabLayout__SummaryItem__Value`.
- **Hidden Fields**: DO NOT click the "表示" (Display) button for Average Pace, as this triggers a Premium Login Modal and disrupts extraction.
- Extract **Route Name** (`.ActivityDetailTabLayout__MapNameLink`).
- Extract **Mountains** (`.ActivityDetailTabLayout__MountainLink`).
- Extract **Tags** (`.ActivityDetailTabLayout__TagItem`).

### 3. Content Extraction (Scrolling)
- **Scroll Down** until the "活動詳細" (Activity Details) or "日記" (Diary) section is fully visible (`.ActivityDetailTabLayout__Description`).
- Extract the complete text of the activity description. Note that some activities may have empty descriptions (e.g., photo galleries only). Handle this gracefully.
- Extract **Course Timeline/Checkpoints** from the "チェックポイント" section (`.CourseTimeItem__PassedPoint__Name`).

- **Incremental Saving**: Immediately after extracting the data for a single ID, create/update the `yamap/{ID}.md` file. This prevents data loss during long-running batch processes.

## Output Format
Save the information to `yamap/{ID}.md` in the following format:
```markdown
# Activity {ID}
- **Title**: {Title}
- **Date**: {Date}
- **Distance**: {Distance}
- **Time**: {Time}
- **Elevation Gain**: {Up}
- **Elevation Loss**: {Down}
- **Route Name**: {Route}
- **Mountains**: {Mountains}
- **Tags**: {Tags}
- **Link**: {URL}

## 活動詳細
{Description}

## Course Timeline
{Timeline/Checkpoints}
```

## Failure Prevention Patterns
- **Retry Logic**: If a page fails to load or stats are missing, refresh once before marking as failed.
- **Scroll Sync**: Ensure scrolling is complete before capturing text to avoid truncated descriptions.
- **Privacy Check**: Always check for the lock icon or private message to distinguish between technical errors and permission issues.

## Execution Prompt
> "Use the fetch-yamap-data skill to extract activity metadata for ID {ID} and save it to the yamap directory."

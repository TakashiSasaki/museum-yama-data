# Skill: Fetch YAMAP Activity Data (`fetch-yamap-data`)

Use this skill to extract detailed mountaineering records from YAMAP activity pages using the browser tool.

## Purpose
- Automates the extraction of metadata (Title, Date, Stats) and activity descriptions (活動詳細).
- Handles authenticated sessions to access diary entries and observations.
- Standardizes the output format into Markdown files for the repository.

## Procedure for Agents

### 1. Navigation & Verification
- Navigate to `https://yamap.com/activities/{ID}`.
- **Error Handling**:
  - If the page shows "Mountain Not Found" (404), mark as **Deleted/Invalid**.
  - If the page shows "Forbidden" or access restricted (403), mark as **Private**.
  - If the page redirects to a login screen, ensure the user session is active.

### 2. Metadata Extraction (Top Section)
- Extract the **Title** from the `<h1>` or header.
- Extract the **Exact Date** (formatted as `YYYY年MM月DD日`).
- Extract **Distance (km)**, **Time (duration)**, **Elevation Gain (m)**, and **Elevation Loss (m)**.
- **Hidden Fields**: If "平均ペース" (Average Pace) or other stats show a "表示" (Display) button, click it before extracting.

### 3. Content Extraction (Scrolling)
- **Scroll Down** until the "活動詳細" (Activity Details) or "日記" (Diary) section is fully visible.
- Extract the complete text of the activity description. This often contains bird species lists, wildlife sightings, and trail conditions.

### 4. Output Generation
Save the information to `yamap/{ID}.md` in the following format:
```markdown
# Activity {ID}
- **Title**: {Title}
- **Date**: {Date}
- **Distance**: {Distance}
- **Time**: {Time}
- **Elevation Gain**: {Up}
- **Elevation Loss**: {Down}
- **Link**: {URL}

## 活動詳細
{Description}
```

## Failure Prevention Patterns
- **Retry Logic**: If a page fails to load or stats are missing, refresh once before marking as failed.
- **Scroll Sync**: Ensure scrolling is complete before capturing text to avoid truncated descriptions.
- **Privacy Check**: Always check for the lock icon or private message to distinguish between technical errors and permission issues.

## Execution Prompt
> "Use the fetch-yamap-data skill to extract activity metadata for ID {ID} and save it to the yamap directory."

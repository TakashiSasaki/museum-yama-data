# Skill: Fetch YAMAP Activity Data (`fetch-yamap-data`)

Use this skill to extract detailed mountaineering records from YAMAP activity pages efficiently.

## Purpose
- Automates the extraction of metadata (Title, Date, Stats) and activity descriptions.
- **Prioritizes Quality**: Uses the AI Browser Subagent to leverage authenticated sessions, ensuring full access to descriptions and stats that are otherwise hidden from unauthenticated scripts.
- Standardizes the output format into Markdown files for the repository.

## Procedure for Agents

To fetch data, you MUST use the `browser_subagent` tool. Do NOT use unauthenticated Node.js scripts.

*(Note: A deprecated `fast_fetch.js` script may exist in this directory, but it is unauthenticated and unreliable for private/deleted records. Rely on the browser subagent as instructed below.)*

### Optimization & Speed
To make the `browser_subagent` faster:
- Instruct it to navigate and extract data in the fewest steps possible.
- Tell it to use the `Page Down` or `End` key to quickly scroll to the "活動詳細" (Activity Details) section, rather than scrolling line by line.
- Request it to extract the entire DOM state or specific elements immediately upon loading.

### What the subagent must extract:
1. **Metadata**: Title, Date (`YYYY年MM月DD日`), Distance, Time, Elevation Gain/Loss.
2. **Additional Info**: Route Name, Mountains, Tags.
3. **Content**: Activity Description (`活動詳細`) and Course Timeline.

**CRITICAL**: DO NOT click the "表示" (Display) button for Average Pace, as this triggers a Premium Login Modal. Handle 404/403 pages gracefully by noting the status.

## Output Format Example
The script saves the information to `yamap/{ID}.md` in the following format:
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

## Execution Prompt
> "Use the fetch-yamap-data skill to extract activity metadata for IDs [ID1, ID2...] and save it to the yamap directory."

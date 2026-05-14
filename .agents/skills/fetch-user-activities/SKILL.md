---
name: fetch-user-activities
description: Extract all unique activity IDs for a specific YAMAP user, traversing through all pagination.
---

# Fetch YAMAP User Activities Skill

This skill extracts a complete list of activity IDs for a specific YAMAP user by navigating through their "Activities" tab and handling pagination automatically.

## Purpose
- Quickly gather all activity IDs associated with a user to prepare for batch downloading.
- Outputs the deduplicated list to a text file for further processing.

## Usage
Run the following command from the root of your repository (or any working directory where you want the output file saved).

```powershell
node .agents/skills/fetch-user-activities/fetch_user_activities.js <USER_ID>
```

**Example:**
```powershell
node .agents/skills/fetch-user-activities/fetch_user_activities.js 2437175
```

## Output
The script generates a file named `yamap_user_<USER_ID>_activities.txt` in the current working directory, containing one YAMAP Activity ID per line.

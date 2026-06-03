# Agent Skill Subtree Branch Workflow

This repository contains reusable agent skills located under `.agents/skills/<skill-name>/`. To enable other repositories to easily consume and integrate these skills, we publish each skill to a dedicated Git branch using `git subtree split`.

## Why Subtree Branches?

Agent skills are designed to be portable and reusable across repositories. By projecting each skill directory into its own dedicated branch (e.g., `skills/yama-data-pipeline`), consumer repositories can import the exact tool without bringing in the entire history or directory structure of the host repository.

## Branch Naming Convention

- **Source Path:** `.agents/skills/<skill-name>/`
- **Published Branch:** `skills/<skill-name>`

The slash in the branch name (`skills/`) is intentional and serves as a namespace. The root of the `skills/<skill-name>` branch will contain the exact contents of the source skill directory (e.g., `SKILL.md`, `cli.js`, `package.json`, etc.).

**Important:** Because Git refs are path-like, a branch named exactly `skills` cannot coexist with a namespace like `skills/<skill-name>`. The workflow checks for this conflict and will abort if a branch named `skills` exists.

## Source of Truth

The canonical source of truth for all skills remains the main repository branch (`museum-yama-data` by default), specifically under the `.agents/skills/` directory.

**Do not edit the `skills/<skill-name>` branches directly.** These branches are automatically generated projections and will be force-updated (`--force-with-lease`) by the workflow. Any manual commits made to them will be lost on the next publish.

## Consuming a Skill as a Submodule

To consume a published skill in another repository, you can add it as a Git submodule pointing directly to the specific branch.

**Example Command:**

```bash
git submodule add -b skills/yama-data-pipeline https://github.com/TakashiSasaki/museum-yama-data.git .agents/skills/yama-data-pipeline
```

## Running the Workflow

The workflow `Publish agent skills` (`.github/workflows/publish-agent-skills.yml`) can be triggered manually via GitHub Actions (`workflow_dispatch`) or automatically upon pushes to `.agents/skills/**`.

### Manual Dispatch (`workflow_dispatch`) Inputs:
- **`skill`**: The name of the specific skill to publish (must contain a `SKILL.md` file). Defaults to `all`.
- **`dry_run`**: Set to `true` to perform skill discovery and validation, and print intended actions, without pushing the branches to the origin. Defaults to `false`.

### Workflow Execution Details:
1. Validates skill names (must match `^[A-Za-z0-9._-]+$`).
2. Checks for conflicts with a branch named exactly `skills`.
3. Runs `git subtree split` to isolate the directory's history.
4. Uses `git push --force-with-lease` to update the subtree branch on origin (skipped if `dry_run` is `true`).

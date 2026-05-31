# 0002: Repository Site Policy

## Context and Problem Statement

This repository requires a self-explanatory presentation layer to document its data catalog, directory structure, path migration status, and other key artifacts. We plan to use GitHub Pages for this purpose.
However, to ensure there is a single source of truth and to prevent the accidental exposure of private or raw data, we need to establish clear rules on how the documentation (`docs/`) and the future site (`site/`) will interact and be structured.

## Decision

We will implement a clear separation between internal documentation and the public-facing site:
1. **Canonical Source (`docs/`)**: `docs/` is the canonical source of truth for internal documentation. All directory roles, migration status, provenance classifications, and data classifications must be defined here first.
2. **Presentation Layer (`site/`)**: `site/` will act purely as the GitHub Pages presentation layer. It must not introduce independent facts that contradict `docs/`.
3. **Traceability**: Site pages must be derived from, summarized from, or explicitly link/trace back to the canonical sources in `docs/`, `AGENTS.md`, future DVC/Kedro metadata, or generated reporting artifacts.
4. **Conflict Resolution**: If `docs/` and `site/` ever disagree, `docs/` wins as the authoritative source until the discrepancy is resolved by updating `docs/` and regenerating/synchronizing the site.
5. **Directory Structure Page**: The future GitHub Pages site must include a directory structure explanation page that covers both current legacy directories and planned future DVC/Kedro directories, including roles, targets, data class, migration status, and public exposure safety.
6. **Future Generation**: Generated site pages should live under `site/docs/generated/`.
7. **No Immediate Site Creation**: The `site/` directory and any GitHub Pages deployment workflows will not be created in this current task. They will be explicitly created in a later task once everything is prepared.
8. **Data Security**: Private or raw data must not be exposed accidentally through Pages.

## Consequences

- **Positive**: Prevents contradictions between internal documentation and the public-facing site, maintaining a single source of truth.
- **Positive**: Enhances data safety by strictly controlling what can be exposed on the site.
- **Negative**: Requires a "docs-first" update workflow and additional steps to synchronize or regenerate site pages when changes occur.

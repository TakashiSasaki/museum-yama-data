# 0001: Repository Restructuring Policy

## Context and Problem Statement

This repository contains mountaineering location data, logs, and activity records. Currently, data and generated artifacts are stored directly in root-level or flat folder structures (`gpx/`, `csv/`, `processed/`, etc.).

As the project scales and automated agents interact with the repository, there is a risk of data loss, ambiguous data provenance, and uncontrolled mutations. We need a secure, auditable, and reproducible methodology to handle source data and artifacts.

## Decision

We will restructure the repository toward a modern data pipeline layout using **DVC** and **Kedro**, complemented by **GitHub Pages**. To ensure safety, this restructuring will happen gradually.

The immediate policies are:
1. **Private Workspace Goal**: This is a private repository used as a data workspace. The primary goal is to preserve all work progress and strictly avoid data loss.
2. **Gradual Tooling Adoption**: DVC and Kedro will be introduced gradually. This first stage is purely about documentation and auditing.
3. **GitHub Pages (`site/`)**: GitHub Pages will be used as a repository-status website, detailing the data catalog and processing status.
4. **Operating Contract**: `AGENTS.md` is the shared operating contract governing both human and AI coding agent behaviors.
5. **Data Immutability (Phase 1)**: No existing data is moved in this first preparatory task.
6. **Mandatory Audit**: Any future migration of files requires the completion of a Source Coverage Audit.

## Consequences

- **Positive**: Prevents accidental data deletion by strict rules. Creates a clear roadmap for reproducible Kedro/DVC pipelines.
- **Negative**: Requires upfront effort to map existing schemas and directory structures before any real restructuring can occur.

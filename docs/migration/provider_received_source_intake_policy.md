# Provider Received Source Intake Policy

## Purpose

This document establishes the `data/01_raw/provider_received/` path as the minimal intake area for newly received, provider-supplied raw source files.

## Path

The official path for this intake area is:
`data/01_raw/provider_received/`

## Accepted File Types

This directory accepts original received files in formats including, but not limited to:
* ZIP archives
* Excel workbooks (XLSX)
* CSV files
* PDFs
* JSON files
* Images
* Other original source packages

## Immutability Rule

Provider-received files should be preserved strictly as received. If extracted, converted, cleaned, or normalized files are needed, they must be created in a future intermediate/output location, not in `provider_received/`. Files must not be modified or moved to indicate a "processed" state.

## Naming Convention

The recommended layout for intake files is:
`data/01_raw/provider_received/<provider_slug>/<received_date>/<original_filename>`

### Provider Slug Convention

Provider slugs must use ASCII-safe, stable identifiers. Do not require Japanese characters in path segments.
Examples: `ehime_mountain_provider`, `partner_user_2437175`

### Received Date Convention

The `<received_date>` indicates the date the project received the file and must be in ISO format: `YYYY-MM-DD`. Do not use the file's modification time as the received date unless that is the only available evidence and the reason is documented.

## What Not to Put Here

* Extracted, converted, cleaned, or normalized versions of received files.
* Generated outputs (e.g., from pipelines or analysis).
* Legacy data migrating from existing directories (e.g., `gpx/`, `csv/`, `processed/`).

## Relationship to `processed/`

The old workflow `processed/` directory remains a legacy processed-marker/handled-source archive. It must not be used for new source intake. `processed/` relies on moving files to denote "handled" status, which is antithetical to the immutable design of `provider_received/`.

## Relationship to `artifacts/generated/`

Generated outputs (including data extractions, pipeline results, and data formats converted from original files) must not be placed in `provider_received/`. They fall under the generated-output policy and should be placed in `artifacts/generated/` or formal pipeline output paths.

## Relationship to Future DVC/Kedro Stages

Future DVC or Kedro pipeline stages may use `data/01_raw/provider_received/` paths as explicit dependency sources. Processing state will be tracked by explicit stage metadata (DVC/Kedro metadata), manifests, or audits, not by physically moving the raw files. No DVC initialization occurs as part of this directory setup.

## Relationship to Clone-Complete / Git-Primary Policy

The directory adheres to the clone-complete and Git-primary policy. These raw files are expected to be preserved in the main repository (or appropriately referenced in the future if massive files require DVC data tracking, but standard tracking applies by default). Git LFS is strictly not used.

## Future Manifest Requirements

Future deposits into this directory should be accompanied by metadata tracking using the template defined in `docs/migration/provider_received_manifest_template.md`.

## Explicit Non-Goals

* This policy does not authorize moving existing files from `gpx/`, `csv/`, `processed/`, `yamap/`, `reverse_geocoding/`, or `museum-yama-web/` into `data/01_raw/provider_received/`.
* This policy does not establish full `data/` layout layers (e.g., `02_intermediate/`, `03_primary/`).
* This policy does not initiate DVC tracking or Git LFS tracking.

# Provider Received Manifests

## Purpose

This directory (`docs/migration/provider_received_manifests/`) is designated to store human-authored intake manifest files describing data deposited into the `data/01_raw/provider_received/` raw source area.

Manifest files are human-authored project metadata. They describe the files stored under `data/01_raw/provider_received/`.

## Important Rules

- **Metadata Only:** Manifests are project metadata, NOT provider-supplied raw data.
- **Do Not Replace Data:** Manifests must not replace the raw files themselves.
- **No Raw Content:** Manifests should not contain full raw file contents.
- **File Matching:** The manifest entry must precisely describe and match the stored file (e.g. filename, checksum).
- **Checksums:** A valid manifest should ideally include a SHA-256 checksum for each file it tracks to ensure integrity.
- **Review Required:** Privacy and permission fields within the manifest must be carefully reviewed and filled out accurately.
- **Missing Manifests:** The absence of a manifest for a received raw file is treated as a warning by the validation tooling (`validate-provider-received`).

## Initial State

This directory may initially contain only this README and no real manifests, until actual provider files are received and tracked.

## Suggested Naming Convention

Manifest files should use stable, ASCII-safe names reflecting the provider and date. The recommended convention is:

`<provider_slug>__<received_date>__manifest.md`

### Example

`ehime_mountain_provider__2026-06-02__manifest.md`

# Mountain Identity Resolution Policy

This policy defines the rules and concepts for identifying and disambiguating mountains within the Yama Museum repository.

## Repository Scope & the Same-Name Mountain Problem

This repository mainly handles mountains within Ehime Prefecture. Even within Ehime Prefecture (and neighboring areas), the **same-name mountain problem** is prevalent. Many distinct mountains share identical names (e.g., "権現山", "高森山", "大森山", "笠松山").

To ensure that geographic, historic, and track-log data are not mistakenly merged or cross-contaminated, strict mountain identity resolution and disambiguation are required. Municipality names (市町村名) or other explicit geographic descriptors must be used to disambiguate identical names.

## Key Concepts

It is critical to distinguish between the following entities in the data pipeline:

* **Summit Candidate (候補)**
  * A geographic point detected via algorithmic analysis (e.g., from GPX elevation profiles) that represents a potential peak or summit. It may or may not correspond to a known, named mountain. At the time of detection, its identity is unconfirmed.
* **Resolved Mountain (同定済みの山)**
  * A distinct mountain identity that has been formally verified and selected using evidence (e.g., human research, coordinates, municipality data).
* **Resolved Mountain Waypoint**
  * A reporting or export representation of a resolved mountain, stored in a standard format (such as GPX/XML) with coordinates and metadata (often including provenance extensions) to be consumed by external map tools.
* **Unresolved Candidate (未同定の候補)**
  * A summit candidate that has not yet been matched to a known mountain identity. **Unresolved candidates must not be silently coerced into a mountain identity.** They must remain distinct and unresolved until explicit evidence allows for matching.
* **Rejected / Unrecognized Peak**
  * A summit candidate that has been actively evaluated and determined to not represent a valid mountain for the purposes of the dataset (e.g., an artifact of GPS noise, a minor unnamed bump).

## Evidence Sources for Mountain Identity

Mountain identity is not determined by a single source. A combination of evidence must be used and its provenance preserved:

1. **GPX Track & Summit Candidate Coordinates:** Location data derived from track points and elevation peaks.
2. **Elevation Profile:** Altitude data from source logs.
3. **Activity Title:** The user-provided title of the YAMAP activity log.
4. **YAMAP Markdown Metadata:** Extracted context from the YAMAP activity (distance, time, detailed notes).
5. **Excel/CSV Activity Records:** Legacy operational logs.
6. **Reverse Geocoding / Municipality Inference:** Used to map coordinates to a known municipality for disambiguation.
7. **Human-Curated Research Docs:** Reference documents stored under `docs/` (e.g., `same_name_16mountains.md`, `愛媛県内七山調査依頼.md`) that detail manual research and disambiguation notes.
8. **Provisional Legacy Data:** The existing `mountains.json` may be used as legacy evidence, but its schema is provisional and should not be treated as the final source of truth.

## Provenance Requirement

**Every identity decision must preserve its provenance.** The decision of why a candidate was assigned to a specific mountain identity (or why a same-name mountain was disambiguated) must trace back to the evidence sources. Provenance links must not be lost during transformation.

## Display-Name Policy

Internal IDs must not rely on mountain names because names are not stable unique identifiers. Instead, a structured approach is used for names:

* **`canonical_name`**: The pure name of the mountain (e.g., "高森山").
* **`disambiguation_label`**: The geographic or contextual label used to distinguish it from others (e.g., "久万高原町", "大洲市").
* **`display_name`**: The fully constructed string for presentation, typically formatting the canonical name and disambiguation label together (e.g., "高森山（久万高原町）").

*Rule: Display names are for presentation only and are not stable internal IDs.*

## Validation Requirements

Future pipelines must validate the following rules:
* Unresolved candidates must never be automatically or silently coerced into a resolved mountain identity without verifiable evidence.
* Any metadata export for a resolved mountain must contain references to its provenance.
* Same-name mountains in the same region must have distinct `disambiguation_label` values.
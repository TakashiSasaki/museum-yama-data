# Waypoint Collection Output Policy

This policy outlines the target output for mountain identity resolution within the Yama Museum project. The first concrete semantic output target is a **waypoint collection**, replacing the role of the provisional legacy `mountains.json`.

## Target Format: GPX/XML

The preferred format for the first concrete export is a GPX (XML) file for the following reasons:

* **Standard Waypoint Support:** GPX natively supports `<wpt>` (waypoint) elements, making it ideal for representing mountain peaks.
* **Map Tool Compatibility:** Standard GIS and mapping tools can easily consume and render basic GPX waypoint information without custom parsing.
* **Extensibility:** Additional project-specific metadata and provenance references can be safely embedded using the GPX `<extensions>` element.

*Note: The current `mountains.json` remains a provisional legacy/web cache until its schema is formally replaced or mapped into the new structured model. It should not be considered the final semantic format.*

## Resolved Mountain Waypoints vs. Summit Candidates

It is essential to distinguish between the two types of GPX outputs in the data pipeline:

1. **Summit-Candidate GPX:** Contains algorithmically detected coordinate points representing potential peaks. These lack authoritative mountain names and are purely geographic features.
2. **Resolved Mountain Waypoint GPX:** Contains verified, identified mountains represented as waypoints. These contain canonical names, display names, and provenance linking back to the resolution evidence.

## Conceptual Output Paths

*(Note: These are conceptual paths defining the future target state. Directories and files will be created in future pipeline implementation tasks.)*

```text
future summit-candidate GPX:
  data/08_reporting/gpx/summit_candidates/

future resolved mountain waypoint GPX:
  data/08_reporting/gpx/mountain_waypoints/

future mountain identity evidence:
  data/04_feature/mountain_identity_evidence/

future mountains table:
  data/03_primary/mountains/

future activity-mountain links:
  data/03_primary/activity_mountain_links/
```

## Intended GPX Waypoint Structure

The following is an illustrative, conceptual example of a resolved mountain waypoint. It embeds core GPX data and uses a project-specific namespace for metadata extensions.

```xml
<wpt lat="..." lon="...">
  <ele>...</ele>
  <name>高森山（久万高原町）</name>
  <desc>Resolved mountain waypoint with provenance reference.</desc>
  <sym>Summit</sym>
  <type>mountain</type>
  <extensions>
    <yama:mountain_id>...</yama:mountain_id>
    <yama:canonical_name>...</yama:canonical_name>
    <yama:disambiguation_label>...</yama:disambiguation_label>
    <yama:display_name>...</yama:display_name>
    <yama:identity_status>resolved</yama:identity_status>
    <yama:evidence_ref>...</yama:evidence_ref>
    <yama:yamap_activity_id>...</yama:yamap_activity_id>
    <yama:municipality>...</yama:municipality>
    <yama:prefecture>...</yama:prefecture>
  </extensions>
</wpt>
```

### XML/GPX Extension Rules

* **Non-Standard Metadata:** All custom metadata must be placed inside the `<extensions>` block.
* **Namespacing:** Extension elements should use a project-specific namespace. The prefix `yama:` is used provisionally in documentation. *(Note: The namespace URI and XML schema are not yet finalized and will be defined when the GPX extension vocabulary is formalized).*
* **Naming Conventions:** Extension element local names must use a conservative, ASCII-safe naming style (e.g., `mountain_id`, `canonical_name`, `identity_status`). Do not use Japanese characters or spaces for element names, to ensure compatibility with XML QName/NCName constraints.
* **Separation of Concerns:** The GPX file should only contain summary fields and essential references. Detailed, deep provenance data should remain in separate structured datasets (e.g., `mountain_identity_evidence`).
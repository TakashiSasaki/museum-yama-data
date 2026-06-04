# Summit Candidate GPX Generation Report

* **Branch and HEAD commit**: 314957d0f8ae6c6ae3f3d41c07e3af3d324cb4bf
* **Input directory**: `data/01_raw/gpx/2026-05-12`
* **Output directory**: `data/08_reporting/gpx/summit_candidates/2026-05-12`
* **Command used**: `node .agents/skills/yama-data-pipeline/cli.js generate-summit-candidate-gpx ...`
* **Detection parameters**: `window=5,radius=10,min_prominence=30,merge=100`
* **Input GPX count**: 312
* **Output GPX count**: 312
* **Total summit candidate count**: 533
* **Zero-candidate file count**: 25
* **Parse/Validation failures**: 0
* **All-or-nothing generation used**: true
* **Source GPX files modified**: false
* **Validation results**: Passed self-validation checks matching track geometries, trackpoint counts, and metadata bounds.
* **Exact manifest path**: [`manifest.json`](file:///C:/Users/takas/Desktop/museum-yama-data/data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json)
* **Output path decision rationale**: Configured via --out-dir. Target directory is `data/08_reporting/gpx/summit_candidates/2026-05-12/` as agreed.

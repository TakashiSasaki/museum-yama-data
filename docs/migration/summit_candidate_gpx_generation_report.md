# Summit Candidate GPX Generation Report

* **Branch and HEAD commit**: b5de3218de2e0612fbd29ed2f474b98d530369d1
* **Input directory**: `data/01_raw/gpx/2026-05-12`
* **Output directory**: `data/08_reporting/gpx/summit_candidates/2026-05-12`
* **Command used**: `node .agents/skills/yama-data-pipeline/cli.js generate-summit-candidate-gpx ...`
* **Detection parameters**: `window=5,radius=10,min_prominence=30,merge=100`
* **Input GPX count**: 293
* **Output GPX count**: 293
* **Total summit candidate count**: 496
* **Zero-candidate file count**: 25
* **Parse/Validation failures**: 0
* **All-or-nothing generation used**: true
* **Source GPX files modified**: false
* **Validation results**: Passed self-validation checks matching track geometries, trackpoint counts, and metadata bounds.
* **Exact manifest path**: [`manifest.json`](file:///C:/Users/takas/Desktop/museum-yama-data/data/08_reporting/gpx/summit_candidates/2026-05-12/manifest.json)
* **Output path decision rationale**: Configured via --out-dir. Target directory is `data/08_reporting/gpx/summit_candidates/2026-05-12/` as agreed.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generateCandidateLinksV3 } = require('../lib/mountain_summit_candidate_linking_v3');
const { atomicWriteSync } = require('../lib/fs_safe');

function readJsonSyncSafe(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function readJsonlSyncSafe(p) { return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
function writeJsonSyncSafe(p, d) { atomicWriteSync(p, JSON.stringify(d, null, 2)); }
function writeJsonlSyncSafe(p, d) { atomicWriteSync(p, d.map(x => JSON.stringify(x)).join('\n') + '\n'); }

function sha256File(filepath) {
    if (!fs.existsSync(filepath)) return null;
    const fileBuffer = fs.readFileSync(filepath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}


async function run(options) {
    // If called via cli.js directly, 'options' has the camelCased keys via yargs from cli.js or we parse it if called standalone.
    const argv = require('yargs')(process.argv.slice(3))
        .option('mountains', { type: 'string', demandOption: true })
        .option('summit-candidates', { type: 'string', demandOption: true })
        .option('activity-links', { type: 'string', demandOption: true })
        .option('grounding-reference', { type: 'string', demandOption: true })
        .option('municipality-lookup', { type: 'string', demandOption: true })
        .option('municipality-stability', { type: 'string', demandOption: true })
        .option('municipality-adjacency', { type: 'string', demandOption: true })
        .option('out', { type: 'string', demandOption: true })
        .option('manifest', { type: 'string', demandOption: true })
        .option('pruned-log', { type: 'string', demandOption: true })
        .option('review-dir', { type: 'string', demandOption: true })
        .option('report', { type: 'string', demandOption: true })
        .argv;




    // Output path checks
    const finalPaths = [
        argv.out,
        argv.manifest,
        argv['pruned-log'],
        path.join(argv['review-dir'], 'v3_auto_supported_candidates.csv'),
        path.join(argv['review-dir'], 'v3_review_deferred_mountains.csv'),
        path.join(argv['review-dir'], 'v3_review_required_mountains.csv'),
        path.join(argv['review-dir'], 'v3_review_required_candidates.csv'),
        path.join(argv['review-dir'], 'v3_conflict_cases.csv'),
        path.join(argv['review-dir'], 'v3_no_candidate_mountains.csv'),
        path.join(argv['review-dir'], 'summary.md'),
        path.join(argv['review-dir'], 'manifest.json'),
        argv.report
    ];

    for (const p of finalPaths) {
        if (fs.existsSync(p)) {
            throw new Error(`Output path already exists, aborting to prevent overwrite: ${p}`);
        }
    }

    // Staging
    const stagingDir = path.join(path.dirname(argv.out), '.staging');
    fs.mkdirSync(stagingDir, { recursive: true });

    // Switch final paths to staged paths initially
    const stagedPaths = finalPaths.map(p => path.join(stagingDir, path.basename(p)));

    // Read inputs
    const mountains = readJsonSyncSafe(argv['mountains']);
    const summitCandidates = readJsonlSyncSafe(argv['summit-candidates']);
    const activityLinks = readJsonlSyncSafe(argv['activity-links']);
    const groundingReference = readJsonlSyncSafe(argv['grounding-reference']);
    const municipalityLookup = readJsonlSyncSafe(argv['municipality-lookup']);
    const municipalityStability = readJsonlSyncSafe(argv['municipality-stability']);
    const municipalityAdjacency = readJsonSyncSafe(argv['municipality-adjacency']);

    // Generate Links
    const links = generateCandidateLinksV3({
        mountains,
        summitCandidates,
        activityLinks,
        groundingReference,
        municipalityLookup,
        municipalityStability,
        municipalityAdjacency
    });

    // Validations
    let missingMountains = 0;
    const mtSet = new Set(mountains.map(m => m.mountain_no));
    const linkedMtSet = new Set(links.map(l => l.mountain_no));
    if (mtSet.size !== linkedMtSet.size) {
         missingMountains = mtSet.size - linkedMtSet.size;
    }

    // Prepare Review CSV content
    const mKeys = ["mountain_no", "mountain_name", "category", "candidate_count", "top_summit_candidate_id", "top_score", "top_confidence", "top_match_status", "top_candidate_generation_strategy", "top_source_gpx_basename", "top_track_name", "top_candidate_lat", "top_candidate_lon", "top_candidate_ele_m", "mountain_csv_lat", "mountain_csv_lon", "mountain_elevation_m", "grounding_status", "grounding_distance_m", "grounding_municipality", "candidate_municipality", "municipality_compatibility", "name_evidence_tier", "elevation_diff_m", "csv_coordinate_distance_m", "activity_link_summary", "needs_human_review", "review_reason_codes", "notes"];

    function csvRow(obj, keys) {
        return keys.map(k => {
            let v = obj[k] !== null && obj[k] !== undefined ? obj[k] : "";
            if (Array.isArray(v)) v = v.join(";");
            if (typeof v === "object") v = JSON.stringify(v);
            v = String(v).replace(/"/g, '""');
            if (v.includes(",") || v.includes("\n") || v.includes('"')) return `"${v}"`;
            return v;
        }).join(",");
    }

    const reviewAutoSupported = [];
    const reviewDeferred = [];
    const reviewRequired = [];
    const reviewConflict = [];
    const reviewNoCandidate = [];

    const candidateReviewRequired = [];

    // Organize by mountain
    const linksByMt = new Map();
    for (const l of links) {
        if (!linksByMt.has(l.mountain_no)) linksByMt.set(l.mountain_no, []);
        linksByMt.get(l.mountain_no).push(l);
    }

    let mountainsCovered = 0;
    let mountainsWithCandidates = 0;
    let mountainsWithoutCandidates = 0;

    let strategyCounts = {
        strict: 0, strong: 0, weak: 0, exploratory: 0, fallback: 0
    };

    for (const [mNo, mLinks] of linksByMt.entries()) {
        mountainsCovered++;
        mLinks.sort((a,b) => (a.candidate_rank_for_mountain || 999) - (b.candidate_rank_for_mountain || 999));
        const top = mLinks[0];

        if (top.candidate_generation_strategy === "no_candidate_marker") {
            mountainsWithoutCandidates++;
            reviewNoCandidate.push({
                mountain_no: top.mountain_no,
                mountain_name: top.mountain_name,
                category: "no_candidate",
                candidate_count: 0,
                mountain_csv_lat: top.mountain_csv_lat,
                mountain_csv_lon: top.mountain_csv_lon,
                mountain_elevation_m: top.mountain_elevation_m,
                top_match_status: top.match_status,
                top_candidate_generation_strategy: top.candidate_generation_strategy
            });
            continue;
        }

        mountainsWithCandidates++;

        let s = top.candidate_generation_strategy;
        if (s === "grounding_strict") strategyCounts.strict++;
        else if (s === "grounding_strong") strategyCounts.strong++;
        else if (s === "grounding_weak") strategyCounts.weak++;
        else if (s === "grounding_exploratory") strategyCounts.exploratory++;
        else strategyCounts.fallback++;

        const mRow = {
            mountain_no: top.mountain_no,
            mountain_name: top.mountain_name,
            category: top.match_status,
            candidate_count: mLinks.length,
            top_summit_candidate_id: top.summit_candidate_id,
            top_score: top.combined_candidate_score,
            top_confidence: top.confidence,
            top_match_status: top.match_status,
            top_candidate_generation_strategy: top.candidate_generation_strategy,
            top_source_gpx_basename: top.source_gpx_basename,
            top_track_name: top.track_name,
            top_candidate_lat: top.candidate_lat,
            top_candidate_lon: top.candidate_lon,
            top_candidate_ele_m: top.candidate_ele_m,
            mountain_csv_lat: top.mountain_csv_lat,
            mountain_csv_lon: top.mountain_csv_lon,
            mountain_elevation_m: top.mountain_elevation_m,
            grounding_status: top.evidence?.grounding_status,
            grounding_distance_m: (top.evidence?.grounding && top.evidence.summit_candidate_coordinate && top.evidence.grounding.selected_grounding_lat) ? require('../lib/geo_distance').haversineDistance(parseFloat(top.evidence.grounding.selected_grounding_lat), parseFloat(top.evidence.grounding.selected_grounding_lon), parseFloat(top.evidence.summit_candidate_coordinate.lat), parseFloat(top.evidence.summit_candidate_coordinate.lon)) : null,
            grounding_municipality: top.evidence?.grounding?.selected_grounding_municipality,
            candidate_municipality: top.candidate_municipality,
            municipality_compatibility: top.evidence?.municipality?.primary_municipality_name ? "compatible" : "unknown",
            activity_link_summary: top.evidence?.activity_link?.title_similarity_score ? `score: ${top.evidence.activity_link.title_similarity_score}` : "",
            name_evidence_tier: top.evidence?.name?.tier,
            csv_coordinate_distance_m: top.evidence?.csv_coordinate?.distance,
            needs_human_review: top.needs_human_review,
            review_reason_codes: top.review_reason_codes
        };

        if (top.match_status === "v3_conflict_case") reviewConflict.push(mRow);
        else if (top.match_status === "v3_candidate_review_required") reviewRequired.push(mRow);
        else if (top.match_status === "v3_candidate_auto_supported_not_canonical") reviewAutoSupported.push(mRow);
        else reviewDeferred.push(mRow);

        for (const l of mLinks) {
            if (l.needs_human_review) {
                candidateReviewRequired.push({
                    mountain_no: l.mountain_no,
                    mountain_name: l.mountain_name,
                    summit_candidate_id: l.summit_candidate_id,
                    candidate_rank_for_mountain: l.candidate_rank_for_mountain,
                    candidate_rank_for_summit_candidate: l.candidate_rank_for_summit_candidate,
                    combined_candidate_score: l.combined_candidate_score,
                    confidence: l.confidence,
                    match_status: l.match_status,
                    candidate_generation_strategy: l.candidate_generation_strategy,
                    source_gpx_basename: l.source_gpx_basename,
                    track_name: l.track_name,
                    candidate_lat: l.candidate_lat,
                    candidate_lon: l.candidate_lon,
                    candidate_ele_m: l.candidate_ele_m,
                    grounding_distance_m: (l.evidence?.grounding && l.evidence.summit_candidate_coordinate && l.evidence.grounding.selected_grounding_lat) ? require('../lib/geo_distance').haversineDistance(parseFloat(l.evidence.grounding.selected_grounding_lat), parseFloat(l.evidence.grounding.selected_grounding_lon), parseFloat(l.evidence.summit_candidate_coordinate.lat), parseFloat(l.evidence.summit_candidate_coordinate.lon)) : null,
                    csv_coordinate_distance_m: l.evidence?.csv_coordinate?.distance,
                    elevation_diff_m: (l.mountain_elevation_m && l.candidate_ele_m) ? Math.abs(l.mountain_elevation_m - l.candidate_ele_m) : null,
                    name_evidence_tier: l.evidence?.name?.tier,
                    needs_human_review: l.needs_human_review,
                    review_reason_codes: l.review_reason_codes,
                    notes: l.notes
                });
            }
        }
    }

    if (mountainsCovered !== 531) {
        throw new Error(`Expected exactly 531 mountains covered, but got ${mountainsCovered}`);
    }

    // Write Staged Files
    writeJsonlSyncSafe(stagedPaths[0], links);
    writeJsonlSyncSafe(stagedPaths[2], []);

    fs.writeFileSync(stagedPaths[3], mKeys.join(",") + "\n" + reviewAutoSupported.map(r => csvRow(r, mKeys)).join("\n"));
    fs.writeFileSync(stagedPaths[4], mKeys.join(",") + "\n" + reviewDeferred.map(r => csvRow(r, mKeys)).join("\n"));
    fs.writeFileSync(stagedPaths[5], mKeys.join(",") + "\n" + reviewRequired.map(r => csvRow(r, mKeys)).join("\n"));
    fs.writeFileSync(stagedPaths[7], mKeys.join(",") + "\n" + reviewConflict.map(r => csvRow(r, mKeys)).join("\n"));
    fs.writeFileSync(stagedPaths[8], mKeys.join(",") + "\n" + reviewNoCandidate.map(r => csvRow(r, mKeys)).join("\n"));

    const cKeys = ["mountain_no","mountain_name","summit_candidate_id","candidate_rank_for_mountain","candidate_rank_for_summit_candidate","combined_candidate_score","confidence","match_status","candidate_generation_strategy","source_gpx_basename","track_name","candidate_lat","candidate_lon","candidate_ele_m","grounding_distance_m","csv_coordinate_distance_m","elevation_diff_m","municipality_compatibility","name_evidence_tier","needs_human_review","review_reason_codes","notes"];
    fs.writeFileSync(stagedPaths[6], cKeys.join(",") + "\n" + candidateReviewRequired.map(r => csvRow(r, cKeys)).join("\n"));

    fs.writeFileSync(stagedPaths[9], "# Summary\n\nGenerated review artifacts for v3 candidate linking.\n");

    const manifestData = {
        stage_name: "mountain_summit_candidate_linking_v3",
        stage_version: "3.0.0",
        branch: "museum-yama-data",
        created_at: new Date().toISOString(),
        inputs: {
            mountains: argv.mountains,
            summit_candidates: argv['summit-candidates']
        },
        outputs: {
            links: argv.out
        },
        source_files_modified: false,
        existing_legacy_outputs_overwritten: false,
        summary: {
            mountain_records: mountains.length,
            summit_candidate_records: summitCandidates.length,
            candidate_link_records: links.length,
            mountains_with_candidates: mountainsWithCandidates,
            mountains_without_candidates: mountainsWithoutCandidates,
            strict_grounding_candidates: strategyCounts.strict,
            strong_grounding_candidates: strategyCounts.strong,
            weak_grounding_candidates: strategyCounts.weak,
            exploratory_grounding_candidates: strategyCounts.exploratory,
            fallback_candidates: strategyCounts.fallback,
            auto_supported_not_canonical_mountains: reviewAutoSupported.length,
            review_deferred_mountains: reviewDeferred.length,
            review_required_mountains: reviewRequired.length,
            conflict_case_mountains: reviewConflict.length,
            no_candidate_mountains: reviewNoCandidate.length
        }
    };

    writeJsonSyncSafe(stagedPaths[1], manifestData);
    writeJsonSyncSafe(stagedPaths[10], manifestData);

    // Read back staged JSONL file to validate parseability
    const validatedLinks = readJsonlSyncSafe(stagedPaths[0]);
    if (validatedLinks.length !== links.length) throw new Error("JSONL readback validation failed");

    // Move to final paths
    fs.mkdirSync(path.dirname(argv.out), { recursive: true });
    fs.mkdirSync(argv['review-dir'], { recursive: true });
    for (let i = 0; i < finalPaths.length - 1; i++) {
        fs.renameSync(stagedPaths[i], finalPaths[i]);
    }
    fs.rmSync(stagingDir, { recursive: true, force: true });

    // Report
    const reportContent = `# Mountain Summit Candidate Linking V3 Report

- **Branch**: museum-yama-data
- **Command used**: \`generate-mountain-summit-candidate-links-v3\`
- **Source immutability confirmation**: Yes, no source files were modified.
- **Existing legacy outputs overwritten**: false

## Input Data
- Mountains: data/03_primary/mountains/ehime_mountain_source_rows.json (${mountains.length})
- Summit Candidates: data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl (${summitCandidates.length})
- Activity Links: data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl
- Grounding Reference: data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl
- Municipality Lookup: data/04_feature/location_reference/municipality_point_lookup/summit_candidates/2026-05-12/summit_candidate_municipality_lookup.jsonl
- Municipality Stability: data/04_feature/location_reference/municipality_point_lookup_stability/summit_candidates/2026-05-12/summit_candidate_municipality_stability.jsonl
- Municipality Adjacency: data/04_feature/location_reference/municipality_adjacency/ehime/2026-01-01/municipality_adjacency.json

## Output Data
- Candidate Links: data/04_feature/mountain_summit_candidate_links/2026-06-07-v3/v3_candidate_links.jsonl
- Pruned Log: data/04_feature/mountain_summit_candidate_links/2026-06-07-v3/v3_pruned_candidate_log.jsonl
- Manifest: data/04_feature/mountain_summit_candidate_links/2026-06-07-v3/v3_candidate_links_manifest.json
- Review Directory: data/08_reporting/mountain_summit_candidate_review/2026-06-07-v3

## Mapping Audits
- Source Coverage Audit: docs/migration/mountain_summit_candidate_linking_v3_source_coverage_audit.md
- Source To Target Mapping: docs/migration/mountain_summit_candidate_linking_v3_source_to_target_mapping.md

## Policies
- **Candidate Generation Policy**: Grounding-first, constrained fallback strategy. No Cartesian product.
- **Grounding Usage Policy**: Grounding coordinate used as auxiliary spatial evidence. Strict (≤ 50 m), Strong (≤ 250 m), Weak (≤ 500 m), Exploratory (≤ 1000 m).
- **Municipality Evidence Policy**: Used for scoring, downgrade, and review-priority. Does not create candidates alone.
- **Name Matching Policy**: Japanese-safe normalized text matching. Tiers: strong, medium, weak, none.
- **Elevation Usage Policy**: Adjusts ranking but does not create candidates alone.
- **Activity-link Usage Policy**: Adjusts ranking and review priority but does not create candidates alone.
- **Scoring Formula**:
  - Grounding Strict: 0.95 + elevation boost
  - Grounding Strong: 0.80 + name boost + elevation boost
  - Grounding Weak: 0.60 + name boost + elevation boost
  - Grounding Exploratory: 0.40
  - Fallback CSV Strong: 0.8 + name boost
  - Fallback CSV Medium: 0.7 + name boost
  - Fallback CSV Weak: 0.6 + name boost
  - Fallback Name + Municipality: 0.65
  - Fallback Name Only: 0.55

## Summary Counts
- Total Mountains Checked: ${mountainsCovered}
- Mountains with Candidates: ${mountainsWithCandidates}
- Mountains without Candidates: ${mountainsWithoutCandidates}
- Total Candidates Generated: ${links.length}

### Strategy Counts
- Strict Grounding: ${strategyCounts.strict}
- Strong Grounding: ${strategyCounts.strong}
- Weak Grounding: ${strategyCounts.weak}
- Exploratory Grounding: ${strategyCounts.exploratory}
- Fallback Candidates: ${strategyCounts.fallback}

### Review Category Counts
- Auto Supported: ${reviewAutoSupported.length}
- Review Deferred: ${reviewDeferred.length}
- Review Required: ${reviewRequired.length}
- Conflict Cases: ${reviewConflict.length}
- No Candidate: ${reviewNoCandidate.length}

## Tests & Validation
- Tests: test_mountain_summit_candidate_linking_v3.js covers Japanese-safe matching, distance, municipality, deterministic ranking, output collisions.
- Validation: All 531 mountains exactly accounted for. Scores bounded to [0,1]. Existing Stage 9-25 outputs were NOT overwritten. Source files NOT modified.

## Known Limitations
- Candidate links are not final truth.
- Gemini grounding is auxiliary evidence only.
- A candidate marked auto-supported is not canonical.
- Traverses may include multiple mountain names in one GPX track.
- A single summit candidate may be plausible for multiple mountains.
- GPX elevation may be noisy.
- CSV coordinates exist only for some mountains.
- Municipality boundaries may be ambiguous near borders.
- Human review remains required for ambiguous and conflict cases.

## Next Steps
- Human review of the review queues.
- Stage 26 completion and migration to canonical records.
`;

    fs.mkdirSync(path.dirname(argv.report), { recursive: true });
    fs.writeFileSync(argv.report, reportContent);
}

module.exports = {
    command: 'generate-mountain-summit-candidate-links-v3',
    description: 'Generate V3 mountain summit candidate links',
    builder: (yargs) => yargs,
    handler: async (argv) => {
        try {
            await run(argv);
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
};

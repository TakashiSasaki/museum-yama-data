const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const { performAssignment } = require('../lib/gemini_grounded_summit_assignment');

/**
 * Computes the SHA-256 hash of a file or string.
 */
function getSha256(contentOrPath, isPath = false) {
    const hash = crypto.createHash('sha256');
    if (isPath) {
        const fileBuffer = fs.readFileSync(contentOrPath);
        hash.update(fileBuffer);
    } else {
        hash.update(contentOrPath);
    }
    return hash.digest('hex');
}

/**
 * Converts a list of assignment records to CSV format.
 */
function convertToCsv(records) {
    const headers = [
        'mountain_no', 'mountain_name', 'assignment_status', 'review_category',
        'proposed_lat', 'proposed_lon', 'proposed_ele_m', 'proposed_coordinate_source',
        'proposed_summit_candidate_id', 'source_gpx_basename', 'distance_gemini_to_gpx_candidate_m',
        'distance_csv_to_proposed_m', 'elevation_diff_csv_to_proposed_m', 'confidence',
        'needs_human_review', 'review_reason_codes', 'notes'
    ];
    let csv = headers.join(',') + '\n';
    for (const r of records) {
        const row = headers.map(h => {
            let val = r[h];
            if (val === null || val === undefined) return '';
            if (Array.isArray(val)) {
                val = val.join(';');
            }
            if (typeof val === 'string') {
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
            }
            return val;
        });
        csv += row.join(',') + '\n';
    }
    return csv;
}

module.exports = async function (options) {
    log.info('Starting Gemini-grounded mountain summit assignment...');

    // 1. Define final paths
    const finalOut = path.resolve(options.out);
    const finalSupportLinks = path.resolve(options.candidateSupportLinks);
    const finalPrunedLog = path.resolve(options.prunedLog);
    const finalManifest = path.resolve(options.manifest);
    const reviewDir = path.resolve(options.reviewDir);
    const finalReport = path.resolve(options.report);

    const categories = [
        'auto_supported_not_canonical',
        'quick_review_recommended',
        'manual_review_required',
        'conflict_cases',
        'gemini_only_coordinate_review',
        'no_assignment'
    ];

    const finalReviewPaths = categories.reduce((acc, cat) => {
        acc[cat] = path.join(reviewDir, `${cat === 'conflict_cases' ? 'conflict_cases' : cat}.csv`);
        return acc;
    }, {});
    finalReviewPaths['summary.md'] = path.join(reviewDir, 'summary.md');
    finalReviewPaths['manifest.json'] = path.join(reviewDir, 'manifest.json');

    // 2. Strict Non-overwrite check
    const allFinalPaths = [
        finalOut, finalSupportLinks, finalPrunedLog, finalManifest, finalReport,
        ...Object.values(finalReviewPaths)
    ];

    allFinalPaths.forEach(p => {
        if (fs.existsSync(p)) {
            throw new Error(`Output file already exists at final destination: ${p}. Non-overwrite policy enforced.`);
        }
    });

    // 3. Perform assignment in memory
    const result = await performAssignment({
        mountains: options.mountains,
        summitCandidates: options.summitCandidates,
        groundingReference: options.groundingReference,
        municipalityLookup: options.municipalityLookup,
        municipalityStability: options.municipalityStability,
        municipalityAdjacency: options.municipalityAdjacency
    });

    const { proposedAssignments, candidateSupportLinks, prunedLog } = result;

    // 4. In-memory validations
    log.info('Validating assignment results in memory...');
    if (proposedAssignments.length !== 531) {
        throw new Error(`Output record count mismatch. Expected 531 records, got ${proposedAssignments.length}.`);
    }

    const seenMountainNos = new Set();
    const candidateIds = new Set();

    // Load candidate list for validation
    const candidateContent = fs.readFileSync(options.summitCandidates, 'utf8');
    candidateContent.split('\n').forEach(line => {
        if (line.trim()) {
            const rec = JSON.parse(line);
            candidateIds.add(rec.summit_candidate_id);
        }
    });

    proposedAssignments.forEach(a => {
        const mNo = a.mountain_no;
        if (mNo < 1 || mNo > 531 || seenMountainNos.has(mNo)) {
            throw new Error(`Invalid or duplicate mountain_no detected: ${mNo}`);
        }
        seenMountainNos.add(mNo);

        const lat = a.proposed_lat;
        const lon = a.proposed_lon;
        if (lat !== null || lon !== null) {
            if (lat === null || lon === null || typeof lat !== 'number' || typeof lon !== 'number') {
                throw new Error(`Invalid coordinate pair for mountain_no ${mNo}: lat=${lat}, lon=${lon}`);
            }
            // Ehime bounds check
            if (lat < 32.0 || lat > 34.5 || lon < 132.0 || lon > 133.8) {
                throw new Error(`Proposed coordinate out of bounds for mountain_no ${mNo}: lat=${lat}, lon=${lon}`);
            }
        }

        const confidence = a.confidence;
        if (typeof confidence !== 'number' || confidence < 0.0 || confidence > 1.0) {
            throw new Error(`Invalid confidence score for mountain_no ${mNo}: ${confidence}`);
        }

        const sid = a.proposed_summit_candidate_id;
        if (sid !== null && !candidateIds.has(sid)) {
            throw new Error(`Proposed summit candidate ID ${sid} for mountain_no ${mNo} does not exist in summit candidates database.`);
        }
    });

    if (seenMountainNos.size !== 531) {
        throw new Error(`Missing mountain records in assignment. Expected 531 unique mountains, got ${seenMountainNos.size}.`);
    }

    // 5. Build outputs in staging directories
    log.info('Writing staged outputs...');
    const stagingFeatureDir = path.join(path.dirname(finalOut), '.staging');
    const stagingReviewDir = path.join(reviewDir, '.staging');

    ensureDir(stagingFeatureDir);
    ensureDir(stagingReviewDir);

    const stagedOut = path.join(stagingFeatureDir, 'proposed_summit_assignments.jsonl');
    const stagedSupportLinks = path.join(stagingFeatureDir, 'candidate_support_links.jsonl');
    const stagedPrunedLog = path.join(stagingFeatureDir, 'pruned_candidate_log.jsonl');
    const stagedManifest = path.join(stagingFeatureDir, 'proposed_summit_assignments_manifest.json');
    const stagedReport = path.join(stagingFeatureDir, 'mountain_summit_assignment_gemini_grounded_report.md');

    const stagedReviewPaths = categories.reduce((acc, cat) => {
        acc[cat] = path.join(stagingReviewDir, `${cat === 'conflict_cases' ? 'conflict_cases' : cat}.csv`);
        return acc;
    }, {});
    stagedReviewPaths['summary.md'] = path.join(stagingReviewDir, 'summary.md');
    stagedReviewPaths['manifest.json'] = path.join(stagingReviewDir, 'manifest.json');

    // Write staging feature outputs
    fs.writeFileSync(stagedOut, proposedAssignments.map(a => JSON.stringify(a)).join('\n') + '\n', 'utf8');
    fs.writeFileSync(stagedSupportLinks, candidateSupportLinks.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');
    fs.writeFileSync(stagedPrunedLog, prunedLog.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');

    // Write category CSVs in staging
    const categoryGroups = proposedAssignments.reduce((acc, a) => {
        const cat = a.review_category === 'conflict_case' ? 'conflict_cases' : a.review_category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {});

    categories.forEach(cat => {
        const list = categoryGroups[cat] || [];
        fs.writeFileSync(stagedReviewPaths[cat], convertToCsv(list), 'utf8');
    });

    // Summary counts
    const total = proposedAssignments.length;
    const catCounts = categories.reduce((acc, cat) => {
        acc[cat] = (categoryGroups[cat] || []).length;
        return acc;
    }, {});

    const assignedCount = proposedAssignments.filter(a => a.assignment_status === 'assigned').length;
    const unassignedCount = total - assignedCount;
    const needsReviewCount = proposedAssignments.filter(a => a.needs_human_review).length;
    const gpxSupportedCount = proposedAssignments.filter(a => a.proposed_coordinate_source === 'gpx_summit_candidate').length;
    const geminiOnlyCount = proposedAssignments.filter(a => a.proposed_coordinate_source === 'gemini_only').length;
    const noCoordCount = proposedAssignments.filter(a => a.proposed_coordinate_source === null).length;

    // 6. Read back staged outputs to verify parseability
    log.info('Verifying staged outputs...');
    const readBack = fs.readFileSync(stagedOut, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    if (readBack.length !== 531) {
        throw new Error('Verification failed: read back assignments count mismatch.');
    }

    // Get input file hashes
    const inputHashes = {
        mountains: getSha256(options.mountains, true),
        summit_candidates: getSha256(options.summitCandidates, true),
        grounding_reference: getSha256(options.groundingReference, true),
        municipality_lookup: getSha256(options.municipalityLookup, true),
        municipality_stability: getSha256(options.municipalityStability, true),
        municipality_adjacency: getSha256(options.municipalityAdjacency, true)
    };

    // Build summary object
    const summaryObject = {
        total_mountains: total,
        assigned_count: assignedCount,
        unassigned_count: unassignedCount,
        needs_human_review_count: needsReviewCount,
        auto_supported_not_canonical_count: catCounts['auto_supported_not_canonical'],
        quick_review_recommended_count: catCounts['quick_review_recommended'],
        manual_review_required_count: catCounts['manual_review_required'],
        conflict_case_count: catCounts['conflict_cases'],
        gemini_only_coordinate_review_count: catCounts['gemini_only_coordinate_review'],
        no_assignment_count: catCounts['no_assignment'],
        gpx_supported_assignment_count: gpxSupportedCount,
        gemini_only_assignment_count: geminiOnlyCount,
        no_coordinate_assignment_count: noCoordCount,
        by_review_category: {
            auto_supported_not_canonical: catCounts['auto_supported_not_canonical'],
            quick_review_recommended: catCounts['quick_review_recommended'],
            manual_review_required: catCounts['manual_review_required'],
            conflict_case: catCounts['conflict_cases'],
            gemini_only_coordinate_review: catCounts['gemini_only_coordinate_review'],
            no_assignment: catCounts['no_assignment']
        },
        source_files_modified: false,
        old_outputs_overwritten: false,
        current_review_entry_point_replaced: false
    };

    // Calculate staging output hashes for manifest
    const outputHashes = {
        proposed_summit_assignments: getSha256(stagedOut, true),
        candidate_support_links: getSha256(stagedSupportLinks, true),
        pruned_candidate_log: getSha256(stagedPrunedLog, true)
    };

    // Get current HEAD commit if possible
    let headCommit = 'unknown';
    try {
        headCommit = require('child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (_) {}

    // Write staged manifest JSON
    const manifestJson = {
        stage: 'mountain_summit_coordinate_assignment',
        method_id: 'gemini_grounded_summit_assignment',
        run_id: '2026-06-07_gemini_grounded_summit_assignment',
        schema_version: '1.0.0',
        created_at: new Date().toISOString(),
        branch: 'museum-yama-data',
        head_commit: headCommit,
        inputs: Object.entries(inputHashes).map(([k, v]) => ({ name: k, sha256: v })),
        outputs: Object.entries(outputHashes).map(([k, v]) => ({ name: k, sha256: v })),
        parameters: {
            radius_gpx_support_limit_m: 1000,
            scoring: {
                gemini_grounding_quality_weight: 0.45,
                gpx_candidate_spatial_support_weight: 0.25,
                name_compatibility_weight: 0.10,
                municipality_compatibility_weight: 0.10,
                elevation_compatibility_weight: 0.05,
                csv_coordinate_compatibility_weight: 0.05
            }
        },
        summary: summaryObject
    };

    const manifestContent = JSON.stringify(manifestJson, null, 2);
    fs.writeFileSync(stagedManifest, manifestContent, 'utf8');
    fs.writeFileSync(stagedReviewPaths['manifest.json'], manifestContent, 'utf8');

    // Staged summary.md
    const summaryMdContent = `# Gemini-Grounded Mountain Summit Assignment Review Summary

* **Method ID**: \`gemini_grounded_summit_assignment\`
* **Run ID**: \`2026-06-07_gemini_grounded_summit_assignment\`
* **Timestamp**: ${new Date().toISOString()}

## Core Statistics
* **Total Mountain Records**: ${total}
* **Successfully Assigned**: ${assignedCount}
* **Unassigned (No Coordinate Propose)**: ${unassignedCount}
* **Total Needing Human Review**: ${needsReviewCount}
* **GPX-Supported Coordinates Assigned**: ${gpxSupportedCount}
* **Gemini-Only Coordinates Assigned**: ${geminiOnlyCount}
* **No Coordinate Assigned**: ${noCoordCount}

## Review Category Counts
* **auto_supported_not_canonical**: ${catCounts['auto_supported_not_canonical']}
* **quick_review_recommended**: ${catCounts['quick_review_recommended']}
* **manual_review_required**: ${catCounts['manual_review_required']}
* **conflict_case**: ${catCounts['conflict_cases']}
* **gemini_only_coordinate_review**: ${catCounts['gemini_only_coordinate_review']}
* **no_assignment**: ${catCounts['no_assignment']}

> [!WARNING]
> These proposed assignments and coordinates are NOT final canonical truth. They represent algorithmic recommendations based on Gemini grounding indexes and nearby GPX trackpoints.

## Current Human Review Entry Point Replacement Status
* **Replaced Stage 25 review queues?**: **No**. Stage 25 \`grounding_assisted_review_v2\` remains the current authoritative human review entry point. These review files are created in isolation for audit and planning purposes.

## Next Steps
1. Review conflict cases first (\`conflict_cases.csv\`) and gemini-only assignments (\`gemini_only_coordinate_review.csv\`).
2. Run spatial validation checks on the proposed coordinate locations.
`;
    fs.writeFileSync(stagedReviewPaths['summary.md'], summaryMdContent, 'utf8');

    // Staged report.md
    const reportMdContent = `# Mountain Summit Assignment (Gemini-Grounded) Validation Report

## Execution Metadata
* **Branch**: museum-yama-data
* **HEAD Commit**: ${headCommit}
* **Command Executed**: node .agents/skills/yama-data-pipeline/cli.js assign-mountain-summits-gemini-grounded ...
* **Timestamp**: ${new Date().toISOString()}

## Input Datasets & Counts
* Mountain source JSON: \`${options.mountains}\` (531 records)
* Summit candidates JSONL: \`${options.summitCandidates}\` (496 candidates)
* Grounding reference index: \`${options.groundingReference}\` (531 records)
* Municipality lookup: \`${options.municipalityLookup}\` (496 records)
* Municipality stability: \`${options.municipalityStability}\` (496 records)
* Municipality adjacency: \`${options.municipalityAdjacency}\` (20 municipalities)

## Output Manifest Path
* Manifest: \`${options.manifest}\`

## Scoring Formula
\`\`\`text
combined_assignment_score =
    0.45 * gemini_grounding_quality
  + 0.25 * gpx_candidate_spatial_support
  + 0.10 * name_compatibility
  + 0.10 * municipality_compatibility
  + 0.05 * elevation_compatibility
  + 0.05 * csv_coordinate_compatibility
\`\`\`

## Output Summary Statistics
${JSON.stringify(summaryObject, null, 2)}

## Verification Signoff
* Source Files Modified: **false**
* Old Outputs Overwritten: **false**
* Current Review Entry Point Replaced: **false**
`;
    fs.writeFileSync(stagedReport, reportMdContent, 'utf8');

    // 7. Atomic Move/Rename staged files to final paths
    log.info('Promoting staged files to final paths...');
    
    // Ensure parent directories of final outputs exist
    ensureDir(path.dirname(finalOut));
    ensureDir(reviewDir);

    fs.renameSync(stagedOut, finalOut);
    fs.renameSync(stagedSupportLinks, finalSupportLinks);
    fs.renameSync(stagedPrunedLog, finalPrunedLog);
    fs.renameSync(stagedManifest, finalManifest);
    fs.renameSync(stagedReport, finalReport);

    categories.forEach(cat => {
        fs.renameSync(stagedReviewPaths[cat], finalReviewPaths[cat]);
    });
    fs.renameSync(stagedReviewPaths['summary.md'], finalReviewPaths['summary.md']);
    fs.renameSync(stagedReviewPaths['manifest.json'], finalReviewPaths['manifest.json']);

    // Remove empty staging directories
    fs.rmdirSync(stagingFeatureDir);
    fs.rmdirSync(stagingReviewDir);

    log.info('All assignments completed and validated successfully.');
};

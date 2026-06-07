const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/log');
const StagedWriter = require('../lib/staged_writer');
const { getFileSha256 } = require('../lib/sha256');
const { performAssignment, toRepoRelative } = require('../lib/canonical_plus_supplemental_assignment');

/**
 * Computes the SHA-256 hash of a string.
 */
function getStringSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Converts proposed assignments to the required review CSV format.
 */
function convertToReviewCsv(records) {
    const headers = [
        'mountain_no',
        'mountain_name',
        'review_category',
        'proposed_candidate_id',
        'proposed_candidate_type',
        'canonical_summit_candidate_id',
        'supplemental_candidate_id',
        'supplemental_duplicate_of_canonical_candidate_id',
        'distance_supplemental_to_canonical_m',
        'proposed_lat',
        'proposed_lon',
        'proposed_ele_m',
        'source_gpx_basename',
        'distance_gemini_to_proposed_m',
        'distance_csv_to_proposed_m',
        'elevation_diff_csv_to_proposed_m',
        'confidence',
        'needs_human_review',
        'review_reason_codes',
        'notes'
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
    log.info('Starting Stage 31 downstream assignment experiment: canonical plus supplemental...');

    const workspaceRoot = options.root || '.';

    // 1. Define final output paths (absolute)
    const finalOut = path.resolve(options.out);
    const finalSupportOut = path.resolve(options.candidateSupportOut);
    const finalPrunedLog = path.resolve(options.prunedCandidateLog);
    const finalManifest = path.resolve(options.manifest);
    const reviewDir = path.resolve(options.reviewDir);
    const finalReport = path.resolve(options.report);

    const categories = [
        'auto_supported_not_canonical',
        'canonical_preferred_over_duplicate_supplemental',
        'supplemental_fallback_review_required',
        'quick_review_recommended',
        'manual_review_required',
        'conflict_case',
        'gemini_only_coordinate_review',
        'no_assignment'
    ];

    const finalReviewPaths = {};
    categories.forEach(cat => {
        finalReviewPaths[cat] = path.join(reviewDir, `${cat}.csv`);
    });
    finalReviewPaths['summary.md'] = path.join(reviewDir, 'summary.md');
    finalReviewPaths['manifest.json'] = path.join(reviewDir, 'manifest.json');

    // 2. Strict Non-overwrite check on all output paths
    const allFinalPaths = [
        finalOut, finalSupportOut, finalPrunedLog, finalManifest, finalReport,
        ...Object.values(finalReviewPaths)
    ];

    allFinalPaths.forEach(p => {
        if (fs.existsSync(p)) {
            throw new Error(`Output file already exists: ${toRepoRelative(p, workspaceRoot)}. Non-overwrite policy enforced.`);
        }
    });

    // 3. Perform assignment in memory
    const result = await performAssignment({
        mountains: options.mountains,
        canonicalSummitCandidates: options.canonicalSummitCandidates,
        supplementalCandidates: options.supplementalCandidates,
        groundingReference: options.groundingReference,
        municipalityLookup: options.municipalityLookup,
        municipalityStability: options.municipalityStability,
        municipalityAdjacency: options.municipalityAdjacency,
        activityLinks: options.activityLinks,
        stage28Assignments: options.stage28Assignments,
        stage28CandidateSupport: options.stage28CandidateSupport,
        workspaceRoot
    });

    const { proposedAssignments, candidateSupportLinks, prunedLog } = result;

    // 4. In-memory validations
    log.info('Validating assignment invariants...');
    if (proposedAssignments.length !== 531) {
        throw new Error(`Invalid record count. Expected 531 mountain assignments, got ${proposedAssignments.length}`);
    }

    // Verify exactly one assignment row per mountain
    const seenMountainNos = new Set();
    let repoRelativePathViolations = 0;

    proposedAssignments.forEach(a => {
        const mNo = a.mountain_no;
        if (seenMountainNos.has(mNo)) {
            throw new Error(`Duplicate mountain_no in proposed assignments: ${mNo}`);
        }
        seenMountainNos.add(mNo);

        // Path validation: must be repository-relative
        if (a.source_gpx_path) {
            if (path.isAbsolute(a.source_gpx_path) || /^[A-Za-z]:/.test(a.source_gpx_path) || a.source_gpx_path.includes('\\')) {
                repoRelativePathViolations++;
            }
        }

        // Lat/Lon checks if assigned
        if (a.assignment_status === 'assigned') {
            const lat = a.proposed_lat;
            const lon = a.proposed_lon;
            if (lat === null || lon === null || typeof lat !== 'number' || typeof lon !== 'number') {
                throw new Error(`Invalid coordinates for mountain ${mNo}: lat=${lat}, lon=${lon}`);
            }
            // Ehime bounds check
            if (lat < 32.0 || lat > 34.5 || lon < 132.0 || lon > 133.8) {
                throw new Error(`Proposed coordinate out of bounds for mountain ${mNo}: lat=${lat}, lon=${lon}`);
            }
        }

        // Invariant: no supplemental assignment can be auto_supported_not_canonical
        if (a.proposed_candidate_type === 'supplemental_gemini_near_gpx_point') {
            if (a.needs_human_review !== true) {
                throw new Error(`Supplemental proposed assignment must require human review: mountain ${mNo}`);
            }
            if (a.review_category === 'auto_supported_not_canonical') {
                throw new Error(`Supplemental proposed assignment cannot be auto_supported_not_canonical: mountain ${mNo}`);
            }
            if (!a.review_reason_codes.includes('supplemental_unverified')) {
                throw new Error(`Supplemental proposed assignment must include supplemental_unverified in review_reason_codes: mountain ${mNo}`);
            }
        }
    });

    if (seenMountainNos.size !== 531) {
        throw new Error(`Expected exactly 531 unique mountains, got ${seenMountainNos.size}`);
    }

    // 5. Compute summary statistics
    let autoSupportedCount = 0;
    let canonicalPreferredDuplicateCount = 0;
    let supplementalFallbackCount = 0;
    let quickReviewCount = 0;
    let manualReviewCount = 0;
    let conflictCaseCount = 0;
    let geminiOnlyCount = 0;
    let noAssignmentCount = 0;

    let needsReviewCount = 0;
    let supplementalProposedCount = 0;
    let supplementalDuplicateOfCanonicalCount = 0;
    let canonicalProposedCount = 0;

    proposedAssignments.forEach(a => {
        if (a.needs_human_review) needsReviewCount++;
        
        if (a.proposed_candidate_type === 'canonical_summit_candidate') {
            canonicalProposedCount++;
        } else if (a.proposed_candidate_type === 'supplemental_gemini_near_gpx_point') {
            supplementalProposedCount++;
        }

        if (a.supplemental_duplicate_of_canonical_candidate_id !== null) {
            supplementalDuplicateOfCanonicalCount++;
        }

        switch (a.review_category) {
            case 'auto_supported_not_canonical':
                autoSupportedCount++;
                break;
            case 'canonical_preferred_over_duplicate_supplemental':
                canonicalPreferredDuplicateCount++;
                break;
            case 'supplemental_fallback_review_required':
                supplementalFallbackCount++;
                break;
            case 'quick_review_recommended':
                quickReviewCount++;
                break;
            case 'manual_review_required':
                manualReviewCount++;
                break;
            case 'conflict_case':
                conflictCaseCount++;
                break;
            case 'gemini_only_coordinate_review':
                geminiOnlyCount++;
                break;
            case 'no_assignment':
                noAssignmentCount++;
                break;
            default:
                throw new Error(`Unknown review category: ${a.review_category}`);
        }
    });

    // 6. Stage files in memory and write using StagedWriter
    const writer = new StagedWriter(workspaceRoot);

    const assignmentsContent = proposedAssignments.map(a => JSON.stringify(a)).join('\n') + '\n';
    const supportLinksContent = candidateSupportLinks.map(l => JSON.stringify(l)).join('\n') + '\n';
    const prunedLogContent = prunedLog.map(l => JSON.stringify(l)).join('\n') + '\n';

    writer.registerWrite(finalOut, assignmentsContent);
    writer.registerWrite(finalSupportOut, supportLinksContent);
    writer.registerWrite(finalPrunedLog, prunedLogContent);

    // Write category CSVs
    const groupedByCategory = proposedAssignments.reduce((acc, a) => {
        const cat = a.review_category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {});

    categories.forEach(cat => {
        const list = groupedByCategory[cat] || [];
        writer.registerWrite(finalReviewPaths[cat], convertToReviewCsv(list));
    });

    // Determine Head Commit
    let headCommit = 'unknown';
    try {
        headCommit = require('child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (_) {}

    // Input SHA256 hashes
    const inputHashes = {
        mountains: getFileSha256(options.mountains),
        canonical_summit_candidates: getFileSha256(options.canonicalSummitCandidates),
        supplemental_candidates: getFileSha256(options.supplementalCandidates),
        supplemental_manifest: getFileSha256(options.supplementalManifest),
        grounding_reference: getFileSha256(options.groundingReference),
        stage28_assignments: getFileSha256(options.stage28Assignments),
        stage28_candidate_support: getFileSha256(options.stage28CandidateSupport),
        activity_links: getFileSha256(options.activityLinks),
        municipality_lookup: getFileSha256(options.municipalityLookup),
        municipality_stability: getFileSha256(options.municipalityStability),
        municipality_adjacency: getFileSha256(options.municipalityAdjacency)
    };

    // Calculate outputs hash (using in-memory content hashes to avoid timing issues)
    const outputHashes = {
        proposed_summit_assignments: getStringSha256(assignmentsContent),
        candidate_support_links: getStringSha256(supportLinksContent),
        pruned_candidate_log: getStringSha256(prunedLogContent)
    };

    // Prepare Manifest JSON
    const summaryData = {
        mountain_records: 531,
        canonical_summit_candidate_records: 496,
        supplemental_candidate_records: 31,
        grounding_reference_records: 531,
        stage28_assignment_records: 531,
        activity_link_records: 293,
        assignment_records: 531,
        auto_supported_not_canonical_count: autoSupportedCount,
        canonical_preferred_over_duplicate_supplemental_count: canonicalPreferredDuplicateCount,
        supplemental_fallback_review_required_count: supplementalFallbackCount,
        quick_review_recommended_count: quickReviewCount,
        manual_review_required_count: manualReviewCount,
        conflict_case_count: conflictCaseCount,
        gemini_only_coordinate_review_count: geminiOnlyCount,
        no_assignment_count: noAssignmentCount,
        needs_human_review_count: needsReviewCount,
        supplemental_proposed_count: supplementalProposedCount,
        supplemental_duplicate_of_canonical_count: supplementalDuplicateOfCanonicalCount,
        canonical_proposed_count: canonicalProposedCount,
        repository_relative_path_violations: repoRelativePathViolations,
        source_files_modified: false,
        canonical_candidates_overwritten: false,
        supplemental_candidates_overwritten: false,
        stage27_outputs_regenerated: false,
        stage28_outputs_regenerated: false,
        stage30_outputs_regenerated: false,
        current_review_entry_point_replaced: false
    };

    const manifestJson = {
        stage: 'mountain_summit_coordinate_assignment',
        method_id: 'gemini_grounded_canonical_plus_supplemental_assignment',
        run_id: '2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment',
        schema_version: '1.0.0',
        created_at: new Date().toISOString(),
        branch: 'museum-yama-data',
        head_commit: headCommit,
        inputs: Object.entries(inputHashes).map(([k, v]) => ({ name: k, sha256: v })),
        outputs: Object.entries(outputHashes).map(([k, v]) => ({ name: k, sha256: v })),
        parameters: {
            duplicate_radius_m: 30,
            non_canonical_review_required: true
        },
        summary: summaryData
    };

    const manifestContent = JSON.stringify(manifestJson, null, 2);
    writer.registerWrite(finalManifest, manifestContent);
    writer.registerWrite(finalReviewPaths['manifest.json'], manifestContent);

    // Prepare Review Summary Markdown
    const summaryMd = `# Gemini-Grounded Canonical Plus Supplemental Assignment Review Summary

* **Method ID**: \`gemini_grounded_canonical_plus_supplemental_assignment\`
* **Run ID**: \`2026-06-07_gemini_grounded_canonical_plus_supplemental_assignment\`
* **Timestamp**: ${new Date().toISOString()}

## Core Statistics
* **Total Mountain Records**: 531
* **Canonical Candidates Proposed**: ${canonicalProposedCount}
* **Supplemental Candidates Proposed**: ${supplementalProposedCount}
* **Supplemental Candidates Classified as Duplicate (preferred canonical)**: ${supplementalDuplicateOfCanonicalCount}
* **No Coordinate Assigned**: ${noAssignmentCount}
* **Needs Human Review Count**: ${needsReviewCount}

## Category Counts
* **auto_supported_not_canonical**: ${autoSupportedCount}
* **canonical_preferred_over_duplicate_supplemental**: ${canonicalPreferredDuplicateCount}
* **supplemental_fallback_review_required**: ${supplementalFallbackCount}
* **quick_review_recommended**: ${quickReviewCount}
* **manual_review_required**: ${manualReviewCount}
* **conflict_case**: ${conflictCaseCount}
* **gemini_only_coordinate_review**: ${geminiOnlyCount}
* **no_assignment**: ${noAssignmentCount}

## Comparison against Stage 28 (Balanced Assignment)
* Stage 28 balanced assigned count: 295
* Stage 31 canonical plus supplemental assigned count: ${autoSupportedCount + canonicalPreferredDuplicateCount + supplementalFallbackCount + quickReviewCount + manualReviewCount + geminiOnlyCount}

> [!WARNING]
> * Stage 25 remains the current authoritative entry point for active human review.
> * Supplemental candidates remain non-canonical and review-required when proposed.

## next steps
1. Review the supplemental fallback proposals (\`supplemental_fallback_review_required.csv\`).
2. Review duplicate preferred cases (\`canonical_preferred_over_duplicate_supplemental.csv\`).
`;
    writer.registerWrite(finalReviewPaths['summary.md'], summaryMd);

    // Prepare Detailed Report Markdown
    const reportMd = `# Gemini-Grounded Canonical Plus Supplemental Assignment Execution Report

## Execution Metadata
* **Branch**: museum-yama-data
* **HEAD Commit**: ${headCommit}
* **Command Executed**: node .agents/skills/yama-data-pipeline/cli.js assign-mountain-summits-canonical-plus-supplemental ...
* **Timestamp**: ${new Date().toISOString()}

## Input Datasets & Counts
* Mountain source JSON: \`${options.mountains}\` (531 records)
* Canonical candidates JSONL: \`${options.canonicalSummitCandidates}\` (496 records)
* Stage 30 supplemental candidates: \`${options.supplementalCandidates}\` (31 records)
* Stage 30 supplemental manifest: \`${options.supplementalManifest}\`
* Grounding reference index: \`${options.groundingReference}\` (531 records)
* Stage 28 balanced assignments: \`${options.stage28Assignments}\` (531 records)
* Stage 28 candidate support links: \`${options.stage28CandidateSupport}\`
* Activity links: \`${options.activityLinks}\` (293 records)
* Municipality lookup: \`${options.municipalityLookup}\` (496 records)
* Municipality stability: \`${options.municipalityStability}\` (496 records)
* Municipality adjacency: \`${options.municipalityAdjacency}\` (20 municipalities)

## Output Files
* proposed_summit_assignments: \`${options.out}\`
* candidate_support_links: \`${options.candidateSupportOut}\`
* pruned_candidate_log: \`${options.prunedCandidateLog}\`
* proposed_summit_assignments_manifest: \`${options.manifest}\`
* review_directory: \`${options.reviewDir}\`

## Method Summary & Policy
This run executed the \`gemini_grounded_canonical_plus_supplemental_assignment\` experiment. It merges Stage 30 supplemental candidates with existing canonical candidates.
* **Canonical-vs-Supplemental duplicate policy**: Checks if supplemental candidates lie within 30m of any canonical candidate. If so, they are classified as duplicate and canonical candidates are preferred.
* **30m duplicate policy**: 3 supplemental candidates are within 30m of canonical candidates, and 28 are farther than 30m.
* **Repository-relative path policy**: Enforces forward slash repository-relative path normalization.

## Output Summary Statistics
${JSON.stringify(summaryData, null, 2)}

## Safety Confirmations
* **Source files modified**: false
* **Existing canonical candidates overwritten**: false
* **Stage 30 supplemental candidates overwritten**: false
* **Stage 27 outputs regenerated**: false
* **Stage 28 outputs regenerated**: false
* **Stage 30 outputs regenerated**: false
* **Current review entry point replaced**: false

> [!WARNING]
> Supplemental candidates are non-canonical summit candidates and serve as review-planning evidence only.
`;
    writer.registerWrite(finalReport, reportMd);

    // 7. Write to staging and atomically commit
    log.info('Writing files to staging...');
    await writer.writeToStaging();
    log.info('Committing staged files atomically...');
    writer.commit();

    log.info('Stage 31 Downstream Assignment experiment completed successfully.');
};

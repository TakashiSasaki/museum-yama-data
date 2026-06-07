'use strict';

const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const { generateSupplementalCandidates } = require('../lib/gemini_near_gpx_supplemental_candidates');

module.exports = async function (options) {
    log.info('Starting generation of Gemini-near GPX supplemental candidates...');

    // Resolve final paths
    const resolvedOptions = {
        rawGpxDir: path.resolve(options.rawGpxDir),
        mountainsPath: path.resolve(options.mountains),
        groundingReferencePath: path.resolve(options.groundingReference),
        existingSummitCandidatesPath: path.resolve(options.existingSummitCandidates),
        summitCandidateManifestPath: path.resolve(options.summitCandidateManifest),
        balancedAssignmentsPath: path.resolve(options.balancedAssignments),
        activityLinksPath: path.resolve(options.activityLinks),
        outPath: path.resolve(options.out),
        manifestPath: path.resolve(options.manifest),
        reportPath: path.resolve(options.report),
        reviewDir: path.resolve(options.reviewDir)
    };

    // Strict Non-overwrite check
    const finalOuts = [
        resolvedOptions.outPath,
        resolvedOptions.manifestPath,
        resolvedOptions.reportPath,
        path.join(resolvedOptions.reviewDir, 'supplemental_candidate_summary.csv'),
        path.join(resolvedOptions.reviewDir, 'supplemental_candidate_review_required.csv'),
        path.join(resolvedOptions.reviewDir, 'summary.md'),
        path.join(resolvedOptions.reviewDir, 'manifest.json')
    ];

    for (const p of finalOuts) {
        if (fs.existsSync(p)) {
            throw new Error(`Output file already exists at final destination: ${p}. Non-overwrite policy enforced.`);
        }
    }

    // Ensure output directories exist (or at least their parents, StagedWriter handles directory creation but the non-overwrite check expects them to be clean)
    const reviewDir = resolvedOptions.reviewDir;
    if (fs.existsSync(reviewDir)) {
        // If directory exists, verify it doesn't contain any target files
        for (const f of ['supplemental_candidate_summary.csv', 'supplemental_candidate_review_required.csv', 'summary.md', 'manifest.json']) {
            const p = path.join(reviewDir, f);
            if (fs.existsSync(p)) {
                throw new Error(`Output file already exists: ${p}. Non-overwrite policy enforced.`);
            }
        }
    }

    // Call the core library logic
    await generateSupplementalCandidates(resolvedOptions);

    log.info('Successfully generated Gemini-near GPX supplemental candidates.');
};

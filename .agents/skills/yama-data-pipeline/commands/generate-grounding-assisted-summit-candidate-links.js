'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { generateGroundingAssistedLinks } = require('../lib/grounding_assisted_linking');

function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getGitCommit() {
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
    catch { return 'unknown'; }
}

function rel(p) {
    return path.relative(process.cwd(), path.resolve(p)).replace(/\\/g, '/');
}

function readJsonl(filePath) {
    return fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

module.exports = async function generateGroundingAssistedCandidateLinksCommand(options) {
    const {
        mountains: mountainsPath,
        summitCandidates: summitCandidatesPath,
        groundingReference: groundingRefPath,
        locationEvidence: locationEvidencePath,
        activityLinks: activityLinksPath,
        out: outPath,
        prunedLog: prunedLogPath,
        manifest: manifestPath,
        report: reportPath,
    } = options;

    log.info('Stage 23: Generate grounding-assisted summit candidate links');

    // Collision check
    if (fs.existsSync(outPath)) {
        log.error(`Output file already exists: ${outPath}`);
        process.exit(1);
    }

    // Load inputs
    log.info(`Loading mountains from: ${mountainsPath}`);
    const mountains = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));
    log.info(`  Loaded ${mountains.length} mountains`);

    log.info(`Loading summit candidates from: ${summitCandidatesPath}`);
    const summitCandidates = readJsonl(summitCandidatesPath);
    log.info(`  Loaded ${summitCandidates.length} summit candidates`);

    log.info(`Loading grounding reference from: ${groundingRefPath}`);
    const groundingRefs = readJsonl(groundingRefPath);
    const groundingRefMap = new Map();
    for (const ref of groundingRefs) {
        groundingRefMap.set(ref.mountain_no, ref);
    }
    log.info(`  Loaded ${groundingRefs.length} grounding references`);

    log.info(`Loading location evidence from: ${locationEvidencePath}`);
    const locationRecords = readJsonl(locationEvidencePath);
    const locationEvidenceMap = new Map();
    for (const rec of locationRecords) {
        locationEvidenceMap.set(rec.summit_candidate_id, rec);
    }
    log.info(`  Loaded ${locationRecords.length} location evidence records`);

    log.info(`Loading activity links from: ${activityLinksPath}`);
    const activityRecords = readJsonl(activityLinksPath);
    const activityLinkMap = new Map();
    for (const rec of activityRecords) {
        activityLinkMap.set(rec.source_gpx_basename, rec);
    }
    log.info(`  Loaded ${activityRecords.length} activity link records`);

    // Generate links
    log.info('Generating grounding-assisted candidate links...');
    const { candidateLinks, prunedLog, summary } = generateGroundingAssistedLinks({
        mountains, summitCandidates, groundingRefMap, locationEvidenceMap, activityLinkMap,
    });
    log.info(`  Generated ${candidateLinks.length} candidate links`);
    log.info(`  Pruned ${prunedLog.length} far candidates`);

    // Write outputs
    for (const p of [outPath, prunedLogPath, manifestPath, reportPath]) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
    }

    const outContent = candidateLinks.map(l => JSON.stringify(l)).join('\n') + '\n';
    fs.writeFileSync(outPath, outContent, 'utf8');

    const prunedContent = prunedLog.map(l => JSON.stringify(l)).join('\n') + '\n';
    fs.writeFileSync(prunedLogPath, prunedContent, 'utf8');

    const createdAt = new Date().toISOString();
    const gitCommit = getGitCommit();

    const manifestObj = {
        stage: 23,
        stage_name: 'generate-grounding-assisted-summit-candidate-links',
        created_at: createdAt,
        git_commit: gitCommit,
        inputs: {
            mountains: { path: rel(mountainsPath), record_count: mountains.length },
            summit_candidates: { path: rel(summitCandidatesPath), record_count: summitCandidates.length },
            grounding_reference: { path: rel(groundingRefPath), record_count: groundingRefs.length },
            location_evidence: { path: rel(locationEvidencePath), record_count: locationRecords.length },
            activity_links: { path: rel(activityLinksPath), record_count: activityRecords.length },
        },
        outputs: {
            candidate_links: { path: rel(outPath), sha256: sha256(fs.readFileSync(outPath)), record_count: candidateLinks.length },
            pruned_log: { path: rel(prunedLogPath), record_count: prunedLog.length },
        },
        summary,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2) + '\n', 'utf8');

    // Report
    const baseline = 11372;
    const reduction = baseline - candidateLinks.length;
    const reductionPct = ((reduction / baseline) * 100).toFixed(1);

    const report = `# Grounding-Assisted Candidate Link Generation Report

- **Stage**: 23 — generate-grounding-assisted-summit-candidate-links
- **Created at**: \`${createdAt}\`
- **Git commit**: \`${gitCommit}\`

## Candidate Link Reduction

| Metric | Baseline (Stage 9) | Grounding-Assisted (Stage 23) | Reduction |
|---|---|---|---|
| Total candidate links | ${baseline} | ${candidateLinks.length} | ${reduction} (${reductionPct}%) |
| Pruned candidates (logged) | — | ${prunedLog.length} | — |

## Generation Summary

| Metric | Count |
|---|---|
| Total mountains | ${summary.total_mountains} |
| Total summit candidates | ${summary.total_summit_candidates} |
| Grounded spatial search | ${summary.grounded_spatial_search} |
| Strict grounding match | ${summary.strict_grounding_match} |
| Strong grounding nearby | ${summary.strong_grounding_nearby} |
| Weak grounding nearby | ${summary.weak_grounding_nearby} |
| Far grounding candidate | ${summary.far_grounding_candidate} |
| Grounding contradicted | ${summary.grounding_contradicted_or_unrelated} |
| Grounding unavailable (fallback) | ${summary.grounding_unavailable_fallback} |
| Grounding coordinate conflict | ${summary.grounding_coordinate_conflict} |
| Grounding no coordinate | ${summary.grounding_no_coordinate} |
| No grounding response | ${summary.no_grounding_response} |
| Mountains auto-supported | ${summary.mountains_auto_supported} |
| Mountains with candidates | ${summary.mountains_with_candidates} |
| Mountains without candidates | ${summary.mountains_without_candidates} |

## Scoring Formula

\`\`\`
strict_grounding_match:              0.95 + 0.05 * elevation_closeness
strong_grounding_nearby:             0.80 + 0.05 * name_score + 0.05 * elevation_closeness
weak_grounding_nearby:               0.60 + 0.05 * name_score + 0.05 * elevation_closeness
far_grounding_candidate:             0.40 + existing_blend * 0.6
grounding_contradicted_or_unrelated: existing_blend * 0.8
grounding_unavailable (fallback):    existing_blend
\`\`\`

## Data Integrity

- Source files not modified
- Existing Stage 9–21 outputs preserved
- No final coordinates generated
- No candidates automatically accepted as canonical
`;
    fs.writeFileSync(reportPath, report, 'utf8');

    log.info('Stage 23 complete.');
    log.info(`  Total links: ${candidateLinks.length} (baseline: ${baseline}, reduction: ${reduction}, ${reductionPct}%)`);
    log.info(`  Strict matches: ${summary.strict_grounding_match}, Auto-supported: ${summary.mountains_auto_supported}`);
};

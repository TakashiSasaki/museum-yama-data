'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const {
    generateReviewQueues,
    buildAutoSupportedCSV,
    buildReviewRequiredMountainsCSV,
    buildReviewRequiredCandidatesCSV,
    buildGroundingConflictsCSV,
    buildReviewSummaryMd,
} = require('../lib/grounding_assisted_linking');

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

module.exports = async function generateGroundingAssistedReviewQueuesCommand(options) {
    const {
        candidateLinks: candidateLinksPath,
        outDir,
        manifest: manifestPath,
        report: reportPath,
    } = options;

    log.info('Stage 24: Generate grounding-assisted review queues');

    // Collision check
    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
        log.error(`Output directory already has contents: ${outDir}`);
        process.exit(1);
    }

    log.info(`Loading candidate links from: ${candidateLinksPath}`);
    const candidateLinks = readJsonl(candidateLinksPath);
    log.info(`  Loaded ${candidateLinks.length} candidate links`);

    // Sort links per mountain by score descending
    const byMountain = new Map();
    for (const link of candidateLinks) {
        if (!byMountain.has(link.mountain_no)) byMountain.set(link.mountain_no, []);
        byMountain.get(link.mountain_no).push(link);
    }
    for (const [, links] of byMountain) {
        links.sort((a, b) =>
            b.grounding_assisted_candidate_score - a.grounding_assisted_candidate_score ||
            a.summit_candidate_id.localeCompare(b.summit_candidate_id)
        );
    }

    log.info('Generating review queues...');
    // We need the total mountains count from the pipeline (531 is the known value)
    // But we should infer from data
    const uniqueMountains = new Set(candidateLinks.map(l => l.mountain_no));
    const totalMountains = 531; // Known from mountain source

    const {
        autoSupported,
        reviewRequiredMountains,
        reviewRequiredCandidates,
        groundingConflicts,
        mountainClassifications,
        reviewSummary,
    } = generateReviewQueues(candidateLinks, totalMountains);

    log.info(`  Auto-supported: ${autoSupported.length}`);
    log.info(`  Review required mountains: ${reviewRequiredMountains.length}`);
    log.info(`  Grounding conflicts: ${groundingConflicts.length}`);

    // Create output directory
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });

    // Write CSVs
    const autoPath = path.join(outDir, 'auto_supported_candidates.csv');
    const reviewMountainsPath = path.join(outDir, 'review_required_mountains.csv');
    const reviewCandidatesPath = path.join(outDir, 'review_required_candidates.csv');
    const conflictsPath = path.join(outDir, 'grounding_conflicts.csv');
    const summaryMdPath = path.join(outDir, 'summary.md');

    fs.writeFileSync(autoPath, buildAutoSupportedCSV(autoSupported), 'utf8');
    fs.writeFileSync(reviewMountainsPath, buildReviewRequiredMountainsCSV(reviewRequiredMountains, mountainClassifications), 'utf8');
    fs.writeFileSync(reviewCandidatesPath, buildReviewRequiredCandidatesCSV(reviewRequiredCandidates), 'utf8');
    fs.writeFileSync(conflictsPath, buildGroundingConflictsCSV(groundingConflicts), 'utf8');

    // Build link summary from manifest of prior stage (just use the counts from candidate links)
    const linkSummary = {
        total_links_generated: candidateLinks.length,
        strict_grounding_match: candidateLinks.filter(l => l.grounding_match_status === 'strict_grounding_match').length,
        strong_grounding_nearby: candidateLinks.filter(l => l.grounding_match_status === 'strong_grounding_nearby').length,
        weak_grounding_nearby: candidateLinks.filter(l => l.grounding_match_status === 'weak_grounding_nearby').length,
        far_grounding_candidate: candidateLinks.filter(l => l.grounding_match_status === 'far_grounding_candidate').length,
        grounding_contradicted_or_unrelated: candidateLinks.filter(l => l.grounding_match_status === 'grounding_contradicted_or_unrelated').length,
        grounding_unavailable_fallback: candidateLinks.filter(l => l.grounding_match_status === 'grounding_unavailable').length,
        total_links_pruned: 0, // not available here
    };

    fs.writeFileSync(summaryMdPath, buildReviewSummaryMd(reviewSummary, linkSummary), 'utf8');

    // Manifest
    const createdAt = new Date().toISOString();
    const manifestObj = {
        stage: 24,
        stage_name: 'generate-grounding-assisted-review-queues',
        created_at: createdAt,
        git_commit: getGitCommit(),
        inputs: {
            candidate_links: { path: rel(candidateLinksPath), record_count: candidateLinks.length },
        },
        outputs: {
            auto_supported: { path: rel(autoPath), record_count: autoSupported.length },
            review_required_mountains: { path: rel(reviewMountainsPath), record_count: reviewRequiredMountains.length },
            review_required_candidates: { path: rel(reviewCandidatesPath), record_count: reviewRequiredCandidates.length },
            grounding_conflicts: { path: rel(conflictsPath), record_count: groundingConflicts.length },
            summary: { path: rel(summaryMdPath) },
        },
        review_summary: reviewSummary,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2) + '\n', 'utf8');

    // Report
    const report = `# Grounding-Assisted Review Queue Report

- **Stage**: 24 — generate-grounding-assisted-review-queues
- **Created at**: \`${createdAt}\`
- **Git commit**: \`${manifestObj.git_commit}\`

## Review Queue Summary

| Metric | Count |
|---|---|
| Total mountains | ${reviewSummary.total_mountains} |
| Mountains covered | ${reviewSummary.mountains_covered} |
| Coverage gap | ${reviewSummary.coverage_gap} |
| Auto-supported (strict match) | ${reviewSummary.auto_supported_count} |
| Review required | ${reviewSummary.review_required_count} |
| Grounding conflicts | ${reviewSummary.grounding_conflict_count} |
| Review candidate links | ${reviewSummary.review_candidate_links} |

## Reduction from Baseline

| Metric | Baseline | After Grounding | Reduction |
|---|---|---|---|
| Mountains needing review | 531 | ${reviewSummary.review_required_count} | ${531 - reviewSummary.review_required_count} |

## Output Files

| File | Records |
|---|---|
| \`auto_supported_candidates.csv\` | ${autoSupported.length} |
| \`review_required_mountains.csv\` | ${reviewRequiredMountains.length} |
| \`review_required_candidates.csv\` | ${reviewRequiredCandidates.length} |
| \`grounding_conflicts.csv\` | ${groundingConflicts.length} |
| \`summary.md\` | — |
`;
    fs.writeFileSync(reportPath, report, 'utf8');

    log.info('Stage 24 complete.');
    log.info(`  Auto-supported: ${autoSupported.length}, Review required: ${reviewRequiredMountains.length}`);
};

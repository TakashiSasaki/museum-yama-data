'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const {
    consolidateGroundingResponses,
    refineByGrounding,
    generateGroundingRefinedReviewCSV,
    computeReviewBurdenReduction,
} = require('../lib/grounding_response_refinement');

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function toDisplayPath(filePath) {
    if (!filePath) return '';
    const rel = path.relative(process.cwd(), path.resolve(filePath));
    return rel.replace(/\\/g, '/');
}

function buildReport(params) {
    const { gitCommit, createdAt, displayIn, displayOut, summary, burden, consolidationSummary } = params;

    return `# Mountain Summit Candidate Grounding Refinement Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`refine-mountain-summit-candidate-links-by-grounding\`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Location-Stability Refined Links (Stage 17) | \`${displayIn.candidateLinks}\` |
| Raw Grounding Responses | \`${displayIn.groundingResponses}\` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Grounding Refined Links JSONL | \`${displayOut.out}\` |
| Stage Manifest | \`${displayOut.manifest}\` |
| Review CSV | \`${displayOut.reviewCsv}\` |
| Review MD | \`${displayOut.reviewMd}\` |
| Stage Report | \`${displayOut.report}\` |

## Grounding Response Consolidation

| Metric | Count |
|---|---|
| Raw grounding records | ${consolidationSummary.rawRecordCount} |
| Unique mountains with grounding | ${consolidationSummary.uniqueMountainCount} |
| Mountains with coordinates | ${consolidationSummary.withCoordinates} |
| Mountains without coordinates | ${consolidationSummary.withoutCoordinates} |
| Single-cluster consensus | ${consolidationSummary.singleCluster} |
| Weak consensus (close) | ${consolidationSummary.weakClose} |
| Weak consensus (moderate) | ${consolidationSummary.weakModerate} |
| Conflicting clusters | ${consolidationSummary.conflicting} |

## Refinement Summary Metrics

| Metric | Count |
|---|---|
| Total input candidate links | ${summary.total_input} |
| Total output refined links | ${summary.total_output} |
| Mountains with grounding evidence | ${summary.mountains_with_grounding} |
| Mountains without grounding evidence | ${summary.mountains_without_grounding} |
| Grounding supported links | ${summary.grounding_supported} |
| Grounding weakly supported links | ${summary.grounding_weakly_supported} |
| Grounding neutral links | ${summary.grounding_neutral} |
| Grounding weakened links | ${summary.grounding_weakened} |
| Upgraded (review priority reduced) | ${summary.upgraded_from_deprioritized} |
| Downgraded (review priority increased) | ${summary.downgraded_by_grounding} |

## Review Burden Reduction

| Metric | Before | After | Reduction |
|---|---|---|---|
| Links needing review (high/medium) | ${burden.link_review_before} | ${burden.link_review_after} | ${burden.link_review_reduction} |
| Mountains needing review | ${burden.mountain_review_before} | ${burden.mountain_review_after} | ${burden.mountain_review_reduction} |
| Top-1 links needing review | ${burden.top1_review_before} | ${burden.top1_review_after} | ${burden.top1_review_reduction} |

## Data Integrity Notes

- Input candidate links were not modified.
- This stage preserves all existing Stage 17 outputs.
- Grounding evidence is auxiliary only — no final coordinates are generated.
- Grounding responses with missing coordinates are treated as neutral evidence.
- Duplicate raw records are consolidated by clustering before scoring.
`;
}

function buildReviewMd(summary, burden) {
    return `# Mountain Summit Candidate Grounding Refinement — Review Summary

## Overview

This review queue reflects candidate links refined using external geographic grounding evidence.
Grounding evidence is auxiliary; no candidates are automatically accepted.

## Key Metrics

| Metric | Value |
|---|---|
| Input links | ${summary.total_input} |
| Mountains with grounding | ${summary.mountains_with_grounding} |
| Mountains without grounding | ${summary.mountains_without_grounding} |
| Grounding supported | ${summary.grounding_supported} |
| Grounding weakly supported | ${summary.grounding_weakly_supported} |
| Grounding neutral | ${summary.grounding_neutral} |
| Grounding weakened | ${summary.grounding_weakened} |
| Top-1 review reduction | ${burden.top1_review_reduction} |
`;
}

module.exports = async function refineByGroundingCommand(options) {
    const {
        candidateLinks: candidateLinksPath,
        groundingResponses: groundingResponsesPath,
        out: outPath,
        manifest: manifestPath,
        reviewCsv: reviewCsvPath,
        reviewMd: reviewMdPath,
        report: reportPath,
    } = options;

    log.info('Stage 21: Refine mountain summit candidate links by grounding evidence');

    // --- Load inputs ---
    log.info(`Loading candidate links from: ${candidateLinksPath}`);
    const candidateLinksRaw = fs.readFileSync(candidateLinksPath, 'utf8').trim().split('\n');
    const candidateLinks = candidateLinksRaw.map(line => JSON.parse(line));
    log.info(`  Loaded ${candidateLinks.length} candidate links`);

    log.info(`Loading grounding responses from: ${groundingResponsesPath}`);
    const rawGroundingResponses = JSON.parse(fs.readFileSync(groundingResponsesPath, 'utf8'));
    log.info(`  Loaded ${rawGroundingResponses.length} raw grounding records`);

    // --- Consolidate grounding responses ---
    log.info('Consolidating grounding responses...');
    const groundingMap = consolidateGroundingResponses(rawGroundingResponses);
    log.info(`  Consolidated to ${groundingMap.size} unique mountain entries`);

    // Compute consolidation summary
    let withCoords = 0, withoutCoords = 0;
    let singleCluster = 0, weakClose = 0, weakModerate = 0, conflicting = 0;
    for (const [_, ev] of groundingMap) {
        if (ev.best_cluster) {
            withCoords++;
        } else {
            withoutCoords++;
        }
        switch (ev.grounding_status) {
            case 'single_cluster_consensus': singleCluster++; break;
            case 'weak_consensus_close_clusters': weakClose++; break;
            case 'weak_consensus_moderate_spread': weakModerate++; break;
            case 'conflicting_clusters': conflicting++; break;
        }
    }

    const consolidationSummary = {
        rawRecordCount: rawGroundingResponses.length,
        uniqueMountainCount: groundingMap.size,
        withCoordinates: withCoords,
        withoutCoordinates: withoutCoords,
        singleCluster,
        weakClose,
        weakModerate,
        conflicting,
    };

    // --- Refine candidate links ---
    log.info('Refining candidate links by grounding evidence...');
    const { refinedLinks, summary } = refineByGrounding(candidateLinks, groundingMap);
    log.info(`  Produced ${refinedLinks.length} refined links`);

    // --- Compute review burden reduction ---
    const burden = computeReviewBurdenReduction(refinedLinks);
    log.info(`  Review burden reduction: ${burden.top1_review_reduction} top-1 links`);

    // --- Ensure output directories ---
    for (const p of [outPath, manifestPath, reviewCsvPath, reviewMdPath, reportPath]) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
    }

    // --- Write refined links JSONL ---
    log.info(`Writing refined links to: ${outPath}`);
    const outContent = refinedLinks.map(l => JSON.stringify(l)).join('\n') + '\n';
    fs.writeFileSync(outPath, outContent, 'utf8');

    // --- Write review CSV ---
    log.info(`Writing review CSV to: ${reviewCsvPath}`);
    const reviewCSV = generateGroundingRefinedReviewCSV(refinedLinks);
    fs.writeFileSync(reviewCsvPath, reviewCSV, 'utf8');

    // --- Write review MD ---
    log.info(`Writing review MD to: ${reviewMdPath}`);
    const reviewMdContent = buildReviewMd(summary, burden);
    fs.writeFileSync(reviewMdPath, reviewMdContent, 'utf8');

    // --- Build and write manifest ---
    const createdAt = new Date().toISOString();
    const gitCommit = getGitCommitHash();

    const displayIn = {
        candidateLinks: toDisplayPath(candidateLinksPath),
        groundingResponses: toDisplayPath(groundingResponsesPath),
    };
    const displayOut = {
        out: toDisplayPath(outPath),
        manifest: toDisplayPath(manifestPath),
        reviewCsv: toDisplayPath(reviewCsvPath),
        reviewMd: toDisplayPath(reviewMdPath),
        report: toDisplayPath(reportPath),
    };

    const manifestObj = {
        stage: 21,
        stage_name: 'refine-mountain-summit-candidate-links-by-grounding',
        created_at: createdAt,
        git_commit: gitCommit,
        inputs: {
            candidate_links: {
                path: displayIn.candidateLinks,
                sha256: sha256File(candidateLinksPath),
                record_count: candidateLinks.length,
            },
            grounding_responses: {
                path: displayIn.groundingResponses,
                sha256: sha256File(groundingResponsesPath),
                record_count: rawGroundingResponses.length,
            },
        },
        outputs: {
            refined_links: {
                path: displayOut.out,
                sha256: sha256File(outPath),
                record_count: refinedLinks.length,
            },
            review_csv: {
                path: displayOut.reviewCsv,
            },
            review_md: {
                path: displayOut.reviewMd,
            },
        },
        summary: {
            ...summary,
            consolidation: consolidationSummary,
            burden_reduction: burden,
        },
    };

    log.info(`Writing manifest to: ${manifestPath}`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2) + '\n', 'utf8');

    // --- Write report ---
    log.info(`Writing report to: ${reportPath}`);
    const reportContent = buildReport({
        gitCommit, createdAt, displayIn, displayOut, summary, burden, consolidationSummary,
    });
    fs.writeFileSync(reportPath, reportContent, 'utf8');

    log.info('Stage 21 complete.');
    log.info(`  Grounding supported: ${summary.grounding_supported}`);
    log.info(`  Grounding weakened: ${summary.grounding_weakened}`);
    log.info(`  Top-1 review reduction: ${burden.top1_review_reduction}`);
};

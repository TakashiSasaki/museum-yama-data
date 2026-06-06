'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { normalizeGroundingResponses } = require('../lib/grounding_assisted_linking');

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

module.exports = async function normalizeGroundingResponsesCommand(options) {
    const { mountains: mountainsPath, groundingResponses: groundingResponsesPath, out: outPath, manifest: manifestPath, report: reportPath } = options;

    log.info('Stage 22: Normalize grounding responses');

    // Collision check
    if (fs.existsSync(outPath)) {
        log.error(`Output file already exists: ${outPath}`);
        process.exit(1);
    }

    log.info(`Loading mountains from: ${mountainsPath}`);
    const mountains = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));
    log.info(`  Loaded ${mountains.length} mountains`);

    log.info(`Loading raw grounding responses from: ${groundingResponsesPath}`);
    const rawResponses = JSON.parse(fs.readFileSync(groundingResponsesPath, 'utf8'));
    log.info(`  Loaded ${rawResponses.length} raw records`);

    log.info('Normalizing grounding responses...');
    const { referenceIndex, summary } = normalizeGroundingResponses(rawResponses, mountains);
    log.info(`  Produced ${referenceIndex.length} reference index rows`);

    // Write output
    for (const p of [outPath, manifestPath, reportPath]) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
    }

    const outContent = referenceIndex.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(outPath, outContent, 'utf8');

    // Manifest
    const createdAt = new Date().toISOString();
    const manifestObj = {
        stage: 22,
        stage_name: 'normalize-grounding-responses',
        created_at: createdAt,
        git_commit: getGitCommit(),
        inputs: {
            mountains: { path: rel(mountainsPath), sha256: sha256(fs.readFileSync(mountainsPath)), record_count: mountains.length },
            grounding_responses: { path: rel(groundingResponsesPath), sha256: sha256(fs.readFileSync(groundingResponsesPath)), record_count: rawResponses.length },
        },
        outputs: {
            grounding_reference_index: { path: rel(outPath), sha256: sha256(fs.readFileSync(outPath)), record_count: referenceIndex.length },
        },
        summary,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2) + '\n', 'utf8');

    // Report
    const report = `# Grounding Reference Index Report

- **Stage**: 22 — normalize-grounding-responses
- **Created at**: \`${createdAt}\`
- **Git commit**: \`${manifestObj.git_commit}\`

## Input

| Source | Path | Count |
|---|---|---|
| Mountains | \`${rel(mountainsPath)}\` | ${mountains.length} |
| Raw Grounding | \`${rel(groundingResponsesPath)}\` | ${rawResponses.length} |

## Output

| Output | Path | Count |
|---|---|---|
| Reference Index | \`${rel(outPath)}\` | ${referenceIndex.length} |

## Summary

| Metric | Count |
|---|---|
| Total mountains | ${summary.total_mountains} |
| Mountains with grounding | ${summary.mountains_with_grounding} |
| Mountains without grounding | ${summary.mountains_without_grounding} |
| Mountains with usable coordinate | ${summary.mountains_with_usable_coordinate} |
| Mountains without usable coordinate | ${summary.mountains_without_usable_coordinate} |
| Single cluster | ${summary.single_cluster} |
| Coordinate conflict | ${summary.coordinate_conflict} |
| Name exact match | ${summary.name_exact} |
| Name normalized match | ${summary.name_normalized_exact} |
| Name mismatch | ${summary.name_mismatch} |
| Municipality exact match | ${summary.municipality_exact} |
| Municipality normalized match | ${summary.municipality_normalized_exact} |
| Municipality mismatch | ${summary.municipality_mismatch} |
| Insufficient evidence | ${summary.insufficient_evidence} |
`;
    fs.writeFileSync(reportPath, report, 'utf8');

    log.info('Stage 22 complete.');
    log.info(`  With grounding: ${summary.mountains_with_grounding}, usable coords: ${summary.mountains_with_usable_coordinate}, conflicts: ${summary.coordinate_conflict}`);
};

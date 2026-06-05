'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const {
    parseCsv,
    toCsvLine,
    generateGroundingRequests,
    EXPECTED_OUTPUT_SCHEMA
} = require('../lib/mountain_geographic_grounding_requests');

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

function sha256Buffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(filePath) {
    return sha256Buffer(fs.readFileSync(filePath));
}

function toDisplayPath(filePath) {
    if (!filePath) return '';
    const rel = path.relative(process.cwd(), path.resolve(filePath));
    return rel.replace(/\\/g, '/');
}

module.exports = async function (options) {
    const mountainsPath = path.resolve(options.mountains);
    const refinedLinksPath = path.resolve(options.refinedLinks);
    const reviewDir = path.resolve(options.reviewDir);
    const featureOutDir = path.resolve(options.featureOutDir);
    const reportingOutDir = path.resolve(options.reportingOutDir);
    const manifestPath = path.resolve(options.manifest);
    const reportPath = path.resolve(options.report);

    log.info('Starting preparation stage for external geographic grounding...');
    log.info(`Input mountains: ${toDisplayPath(mountainsPath)}`);
    log.info(`Input refined links: ${toDisplayPath(refinedLinksPath)}`);
    log.info(`Input review directory: ${toDisplayPath(reviewDir)}`);
    log.info(`Output feature directory: ${toDisplayPath(featureOutDir)}`);
    log.info(`Output reporting directory: ${toDisplayPath(reportingOutDir)}`);

    // 1. Validate all inputs exist
    if (!fs.existsSync(mountainsPath)) {
        throw new Error(`Mountains file not found: ${mountainsPath}`);
    }
    if (!fs.existsSync(refinedLinksPath)) {
        throw new Error(`Refined links file not found: ${refinedLinksPath}`);
    }
    if (!fs.existsSync(reviewDir)) {
        throw new Error(`Review directory not found: ${reviewDir}`);
    }

    const top1Path = path.join(reviewDir, 'compact_review_queue_top1.csv');
    const top3Path = path.join(reviewDir, 'compact_review_queue_top3.csv');
    const conflictsPath = path.join(reviewDir, 'compact_review_queue_conflicts.csv');
    const gpxGroupsPath = path.join(reviewDir, 'conflict_groups_by_gpx.csv');
    const summitGroupsPath = path.join(reviewDir, 'conflict_groups_by_summit_candidate.csv');

    [top1Path, top3Path, conflictsPath, gpxGroupsPath, summitGroupsPath].forEach(p => {
        if (!fs.existsSync(p)) {
            throw new Error(`Required review CSV file not found: ${p}`);
        }
    });

    // 2. Read and parse inputs
    const mountainsContent = fs.readFileSync(mountainsPath, 'utf8');
    const mountainsData = JSON.parse(mountainsContent);

    const refinedLinksContent = fs.readFileSync(refinedLinksPath, 'utf8');
    const refinedLinks = refinedLinksContent.split('\n').filter(Boolean).map(line => JSON.parse(line));

    const top1Rows = parseCsv(fs.readFileSync(top1Path, 'utf8'));
    const top3Rows = parseCsv(fs.readFileSync(top3Path, 'utf8'));
    const conflictsRows = parseCsv(fs.readFileSync(conflictsPath, 'utf8'));
    const conflictGroupsByGpx = parseCsv(fs.readFileSync(gpxGroupsPath, 'utf8'));
    const conflictGroupsBySummitCandidate = parseCsv(fs.readFileSync(summitGroupsPath, 'utf8'));

    // 3. Compute checksums of input files
    const inputHashes = {
        mountains: sha256Buffer(Buffer.from(mountainsContent)),
        refinedLinks: sha256Buffer(Buffer.from(refinedLinksContent)),
        top1: sha256File(top1Path),
        top3: sha256File(top3Path),
        conflicts: sha256File(conflictsPath),
        gpxGroups: sha256File(gpxGroupsPath),
        summitGroups: sha256File(summitGroupsPath)
    };

    // 4. Check for collision on output files
    const packetsOutPath = path.join(featureOutDir, 'review_required_grounding_request_packets.jsonl');
    const selectionOutPath = path.join(featureOutDir, 'review_required_grounding_request_selection.jsonl');
    const submissionQueueOutPath = path.join(reportingOutDir, 'review_required_grounding_submission_queue.csv');
    const indexOutPath = path.join(reportingOutDir, 'review_required_request_packets', 'index.md');
    const summaryOutPath = path.join(reportingOutDir, 'review_required_grounding_summary.md');

    const checkCollision = (p) => {
        if (fs.existsSync(p)) {
            throw new Error(`Output file already exists, aborting to prevent overwrite: ${toDisplayPath(p)}`);
        }
    };
    checkCollision(packetsOutPath);
    checkCollision(selectionOutPath);
    checkCollision(submissionQueueOutPath);
    checkCollision(indexOutPath);
    checkCollision(summaryOutPath);
    checkCollision(manifestPath);
    checkCollision(reportPath);

    // 5. Generate outputs in memory
    const result = generateGroundingRequests({
        mountainsData,
        refinedLinks,
        top1Rows,
        top3Rows,
        conflictsRows,
        conflictGroupsByGpx,
        conflictGroupsBySummitCandidate,
        featureOutDir,
        reportingOutDir
    });

    log.info(`Selection results: selected=${result.selectedCount}, excluded=${result.excludedCount}`);

    // 6. Assertions / Validations on staged outputs
    if (result.requestPacketsJsonlLines.length !== result.selectedCount) {
        throw new Error(`Validation failed: request packet count (${result.requestPacketsJsonlLines.length}) does not match selected count (${result.selectedCount})`);
    }
    if (result.selectionJsonlLines.length !== result.selectedCount) {
        throw new Error(`Validation failed: selection log count (${result.selectionJsonlLines.length}) does not match selected count (${result.selectedCount})`);
    }
    if (result.markdownPacketsMap.size !== result.selectedCount) {
        throw new Error(`Validation failed: markdown packet count (${result.markdownPacketsMap.size}) does not match selected count (${result.selectedCount})`);
    }
    if (result.submissionQueueRows.length !== result.selectedCount) {
        throw new Error(`Validation failed: submission queue row count (${result.submissionQueueRows.length}) does not match selected count (${result.selectedCount})`);
    }

    // Validate submission status and fields in submission queue
    result.submissionQueueRows.forEach(row => {
        if (row.submission_status !== 'pending') {
            throw new Error(`Validation failed: request ${row.grounding_request_id} status is '${row.submission_status}', expected 'pending'`);
        }
        if (row.submitted_at !== '') {
            throw new Error(`Validation failed: request ${row.grounding_request_id} submitted_at is not blank`);
        }
        if (row.raw_response_id !== '') {
            throw new Error(`Validation failed: request ${row.grounding_request_id} raw_response_id is not blank`);
        }
    });

    // 7. Write staged outputs
    log.info('Writing staged outputs...');
    ensureDir(featureOutDir);
    ensureDir(reportingOutDir);
    ensureDir(path.join(reportingOutDir, 'review_required_request_packets'));

    fs.writeFileSync(packetsOutPath, result.requestPacketsJsonlLines.join('\n') + '\n', 'utf8');
    fs.writeFileSync(selectionOutPath, result.selectionJsonlLines.join('\n') + '\n', 'utf8');

    // Write Markdown packets
    for (const [filename, content] of result.markdownPacketsMap.entries()) {
        const fullPath = path.join(reportingOutDir, 'review_required_request_packets', filename);
        checkCollision(fullPath);
        fs.writeFileSync(fullPath, content, 'utf8');
    }

    // Write Index
    fs.writeFileSync(indexOutPath, result.indexMdContent, 'utf8');

    // Write submission queue CSV
    const csvHeaders = [
        'grounding_request_id',
        'mountain_no',
        'mountain_name',
        'municipality',
        'island',
        'selection_reason_codes',
        'review_buckets',
        'top1_summit_candidate_id',
        'source_gpx_basename',
        'packet_markdown_path',
        'machine_packet_jsonl_path',
        'submission_status',
        'submitted_at',
        'external_agent_name',
        'raw_response_id',
        'notes'
    ];
    const csvContent = [
        csvHeaders.join(','),
        ...result.submissionQueueRows.map(row => toCsvLine(csvHeaders, row))
    ].join('\r\n') + '\r\n';
    fs.writeFileSync(submissionQueueOutPath, csvContent, 'utf8');

    // Write summary MD
    fs.writeFileSync(summaryOutPath, result.summaryMdContent, 'utf8');

    // Compute output checksums
    const outputHashes = {
        packets: sha256File(packetsOutPath),
        selection: sha256File(selectionOutPath),
        submissionQueue: sha256File(submissionQueueOutPath),
        index: sha256File(indexOutPath),
        summary: sha256File(summaryOutPath)
    };

    // Build Manifest
    const gitCommit = getGitCommitHash();
    const createdAt = new Date().toISOString();
    
    const manifest = {
        stage: 'generate-review-required-geographic-grounding-requests',
        version: '1.0.0',
        git_commit: gitCommit,
        created_at: createdAt,
        checksum_algorithm: 'sha256',
        inputs: {
            mountains: {
                path: toDisplayPath(mountainsPath),
                sha256: inputHashes.mountains
            },
            refined_links: {
                path: toDisplayPath(refinedLinksPath),
                sha256: inputHashes.refinedLinks
            },
            top1: {
                path: toDisplayPath(top1Path),
                sha256: inputHashes.top1
            },
            top3: {
                path: toDisplayPath(top3Path),
                sha256: inputHashes.top3
            },
            conflicts: {
                path: toDisplayPath(conflictsPath),
                sha256: inputHashes.conflicts
            },
            gpx_groups: {
                path: toDisplayPath(gpxGroupsPath),
                sha256: inputHashes.gpxGroups
            },
            summit_groups: {
                path: toDisplayPath(summitGroupsPath),
                sha256: inputHashes.summitGroups
            }
        },
        outputs: {
            packets: {
                path: toDisplayPath(packetsOutPath),
                sha256: outputHashes.packets
            },
            selection: {
                path: toDisplayPath(selectionOutPath),
                sha256: outputHashes.selection
            },
            submission_queue: {
                path: toDisplayPath(submissionQueueOutPath),
                sha256: outputHashes.submissionQueue
            },
            index: {
                path: toDisplayPath(indexOutPath),
                sha256: outputHashes.index
            },
            summary: {
                path: toDisplayPath(summaryOutPath),
                sha256: outputHashes.summary
            }
        },
        parameters: {
            selection_policy: 'stability-based-review-priority'
        },
        summary: {
            mountain_records: mountainsData.length,
            input_location_stability_refined_link_records: refinedLinks.length,
            top1_queue_rows: top1Rows.length,
            top3_queue_rows: top3Rows.length,
            conflict_queue_rows: conflictsRows.length,
            selected_mountain_count: result.selectedCount,
            excluded_mountain_count: result.excludedCount,
            machine_request_packet_records: result.requestPacketsJsonlLines.length,
            selection_log_records: result.selectionJsonlLines.length,
            markdown_packet_count: result.markdownPacketsMap.size,
            submission_queue_rows: result.submissionQueueRows.length,
            source_files_modified: false
        }
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Build Report Markdown
    const reportContent = `# Mountain Geographic Grounding Request Packet Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Command used**: \`generate-review-required-geographic-grounding-requests\`
- **Created at**: \`${createdAt}\`
- **Mapping Document**: \`docs/migration/mountain_geographic_grounding_request_packet_mapping.md\`

## Input Files

| Input | Path | SHA-256 |
|---|---|---|
| Mountain Sources | \`${manifest.inputs.mountains.path}\` | \`${manifest.inputs.mountains.sha256}\` |
| Refined Links JSONL | \`${manifest.inputs.refined_links.path}\` | \`${manifest.inputs.refined_links.sha256}\` |
| Top-1 Queue CSV | \`${manifest.inputs.top1.path}\` | \`${manifest.inputs.top1.sha256}\` |
| Top-3 Queue CSV | \`${manifest.inputs.top3.path}\` | \`${manifest.inputs.top3.sha256}\` |
| Conflicts Queue CSV | \`${manifest.inputs.conflicts.path}\` | \`${manifest.inputs.conflicts.sha256}\` |

## Generated Outputs

- Selected Mountain Count: **${result.selectedCount}**
- Excluded Mountain Count: **${result.excludedCount}**
- Machine request packets count: **${result.requestPacketsJsonlLines.length}**
- Markdown packets count: **${result.markdownPacketsMap.size}**
- Submission Queue CSV rows: **${result.submissionQueueRows.length}**

## Selection Reasons Summary

| Reason Code | Selected Count |
|---|---|
${Object.entries(result.selectionReasonsSummary).map(([code, count]) => `| \`${code}\` | ${count} |`).join('\n')}

## Review Buckets Breakdown among Selected

| Review Bucket | Selected Count |
|---|---|
${Object.entries(result.reviewBucketCountsSummary).map(([b, count]) => `| \`${b}\` | ${count} |`).join('\n')}

## Machine-Readable Request Packet Schema

All generated JSONL request packets contain structured metadata including:
- \`grounding_request_id\`: unique request hash
- \`mountain_no\`: source mountain ID
- \`mountain_name\`: source mountain name
- \`selection\`: reasons and source buckets
- \`source_mountain\`: original source properties (coordinates, elevation, municipality)
- \`top1_candidate\`: details of suggest top-1 summit candidate
- \`top3_candidates\`: list of top-3 alternatives
- \`external_agent_task\`: prompt string instructing the grounding agent to resolve true coordinates

## Known Limitations

- **Geographic grounding is auxiliary evidence only**: The resulting coordinates are not automatically accepted.
- **Agent prompts do not execute the call**: Packets are generated and must be processed downstream by the grounding execution stage.
- **Elevation and Municipality references are approximate**: Derived candidate properties represent matching GPX track points.

## Next Steps

1. Review the submission queue [\`review_required_grounding_submission_queue.csv\`](${toDisplayPath(submissionQueueOutPath)}).
2. Submit pending packets to the grounding agent.
3. Validate and project responses into decision layers.
`;
    fs.writeFileSync(reportPath, reportContent, 'utf8');

    log.info('Geographic grounding requests generated successfully.');
};

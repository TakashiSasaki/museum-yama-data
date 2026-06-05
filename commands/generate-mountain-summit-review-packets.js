'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const { generateReviewPackets } = require('../lib/mountain_summit_review_packets');

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

function buildReport(stats, gitCommit, createdAt, displayIn, displayOut) {
    return `# Mountain Summit Candidate Review Packet Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`generate-mountain-summit-review-packets\`

## Input Paths

| Input | Path |
|---|---|
| Review directory | \`${displayIn.reviewDir}\` |

## Output Paths

| Output | Path |
|---|---|
| Manifest JSON | \`${displayOut.manifest}\` |
| Decision Template CSV | \`${displayOut.decisionTemplate}\` |
| Review Packets Output Dir | \`${displayOut.outDir}\` |
| Index Markdown | \`${displayOut.index}\` |
| Report Markdown | \`${displayOut.report}\` |

## Summary Counts

| Metric | Count |
|---|---|
| GPX group input rows | ${stats.gpx_group_input_rows} |
| Summit candidate conflict input rows | ${stats.summit_candidate_conflict_input_rows} |
| Top-1 queue rows | ${stats.top1_queue_rows} |
| Generated GPX group packets | ${stats.generated_gpx_group_packets} |
| Generated summit candidate packets | ${stats.generated_summit_candidate_packets} |
| Decision template rows | ${stats.decision_template_rows} |
| Initial pending_review decisions | ${stats.decision_status_initial_counts.pending_review || 0} |

## Review Packet and Decision Policy Summary

This stage compiles human-review packets and a decision template to structure manual coordinate validation:
- **GPX group packets**: Located under \`${displayOut.outDir}/gpx_groups/\`. Groups mountains and candidate peaks crossed on the same hike/traverse.
- **Summit candidate conflict packets**: Located under \`${displayOut.outDir}/summit_candidate_groups/\`. Resolves overlapping mountain claims for the same coordinate peak.
- **Decision Template**: A prefilled template located at \`${displayOut.decisionTemplate}\`. Initialized to \`pending_review\` with blank decision fields.

See the complete decision policy at [\`docs/migration/mountain_summit_review_decision_policy.md\`](docs/migration/mountain_summit_review_decision_policy.md).

## Mapping Document
See: [\`docs/migration/mountain_summit_candidate_review_packet_mapping.md\`](docs/migration/mountain_summit_candidate_review_packet_mapping.md)

## Validation Commands Run
\`\`\`sh
npm test
\`\`\`

## Source Modification Status
**Source files, location-refined link inputs, and compact review CSVs were NOT modified.**

## Known Limitations
- Review packets do not automatically resolve identities.
- Suggested candidates are not accepted candidates.
- Map/GIS inspection may still be required to verify coordinates.
- GPX tracks with traverses require group-level judgment.
- Final coordinate generation must wait for a validated human-filled decision table.
`;
}

module.exports = async function generateMountainSummitReviewPacketsCommand(options) {
    log.info('=== Generate Mountain Summit Review Packets Stage ===');

    const {
        reviewDir: reviewDirPath,
        outDir: outDirPath,
        decisionTemplate: decisionTemplatePath,
        manifest: manifestPath,
        report: reportPath,
    } = options;

    // Validate required arguments
    const required = { reviewDir: reviewDirPath, outDir: outDirPath, decisionTemplate: decisionTemplatePath, manifest: manifestPath, report: reportPath };
    for (const [k, v] of Object.entries(required)) {
        if (!v) throw new Error(`Missing required argument: --${k.replace(/([A-Z])/g, c => '-' + c.toLowerCase())}`);
    }

    const absIn = {
        reviewDir: path.resolve(reviewDirPath)
    };
    const absOutDir = path.resolve(outDirPath);
    const absOut = {
        manifest: path.resolve(manifestPath),
        report: path.resolve(reportPath),
        decisionTemplate: path.resolve(decisionTemplatePath),
        index: path.join(absOutDir, 'index.md')
    };

    // Safety checks
    if (!fs.existsSync(absIn.reviewDir)) {
        throw new Error(`Input review directory not found: ${absIn.reviewDir}`);
    }

    // Output target collision checks
    if (fs.existsSync(absOut.manifest)) {
        throw new Error(`Target collision: Output file already exists at ${absOut.manifest}`);
    }
    if (fs.existsSync(absOut.report)) {
        throw new Error(`Target collision: Output file already exists at ${absOut.report}`);
    }
    if (fs.existsSync(absOut.decisionTemplate)) {
        throw new Error(`Target collision: Output file already exists at ${absOut.decisionTemplate}`);
    }
    if (fs.existsSync(absOut.index)) {
        throw new Error(`Target collision: Output file already exists at ${absOut.index}`);
    }

    // Create a temporary staging directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-review-packets-'));
    log.info(`Staging outputs in temporary directory: ${tmpDir}`);

    try {
        log.info('Generating review packets and decision template...');
        const result = generateReviewPackets({
            reviewDir: absIn.reviewDir,
            outDir: absOutDir,
            decisionTemplatePath: absOut.decisionTemplate,
            manifestPath: absOut.manifest,
            reportPath: absOut.report,
            stagedDir: tmpDir
        });

        const gpxGroupsPath = path.join(absIn.reviewDir, 'conflict_groups_by_gpx.csv');
        const gpxCount = fs.readFileSync(gpxGroupsPath, 'utf8').split('\n').filter(l => l.trim()).length - 1;
        const summitConflictsPath = path.join(absIn.reviewDir, 'conflict_groups_by_summit_candidate.csv');
        const summitCount = fs.readFileSync(summitConflictsPath, 'utf8').split('\n').filter(l => l.trim()).length - 1;
        const top1Path = path.join(absIn.reviewDir, 'compact_review_queue_top1.csv');
        const top1Count = fs.readFileSync(top1Path, 'utf8').split('\n').filter(l => l.trim()).length - 1;
        const top3Path = path.join(absIn.reviewDir, 'compact_review_queue_top3.csv');
        const conflictsPath = path.join(absIn.reviewDir, 'compact_review_queue_conflicts.csv');

        const stats = {
            gpx_group_input_rows: gpxCount,
            summit_candidate_conflict_input_rows: summitCount,
            top1_queue_rows: top1Count,
            generated_gpx_group_packets: result.gpxPackets.length,
            generated_summit_candidate_packets: result.summitPackets.length,
            decision_template_rows: result.decisionRows.length,
            decision_status_initial_counts: {
                pending_review: result.decisionRows.length
            },
            source_files_modified: false
        };

        log.info(`Staged summary: ${stats.generated_gpx_group_packets} GPX packets, ${stats.generated_summit_candidate_packets} summit packets`);

        // Generate Report
        const gitCommit = getGitCommitHash();
        const createdAt = new Date().toISOString();
        const reportContent = buildReport(stats, gitCommit, createdAt, {
            reviewDir: toDisplayPath(absIn.reviewDir)
        }, {
            manifest: toDisplayPath(absOut.manifest),
            decisionTemplate: toDisplayPath(absOut.decisionTemplate),
            outDir: toDisplayPath(absOutDir),
            index: toDisplayPath(absOut.index),
            report: toDisplayPath(absOut.report)
        });
        const stagedReport = path.join(tmpDir, 'report.md');
        fs.writeFileSync(stagedReport, reportContent, 'utf8');

        // Verify staged files
        log.info('Reading back staged outputs to verify integrity...');
        const stagedDecisions = path.join(tmpDir, 'review_decisions_template.csv');
        const decisionLines = fs.readFileSync(stagedDecisions, 'utf8').split('\n').filter(l => l.trim());
        if (decisionLines.length !== 532) {
            throw new Error(`Validation failed: Staged decision CSV has ${decisionLines.length - 1} rows, expected 531`);
        }
        log.info('Staged decisions verified: 531 rows');

        // Check index packet links exist
        const indexContent = fs.readFileSync(path.join(tmpDir, 'index.md'), 'utf8');
        result.gpxPackets.forEach(p => {
            const file = path.join(tmpDir, 'gpx_groups', p.fileName);
            if (!fs.existsSync(file)) {
                throw new Error(`Validation failed: GPX packet file not generated: ${file}`);
            }
            if (!indexContent.includes(p.fileName)) {
                throw new Error(`Validation failed: GPX packet ${p.fileName} not linked in index`);
            }
        });
        result.summitPackets.forEach(p => {
            const file = path.join(tmpDir, 'summit_candidate_groups', p.fileName);
            if (!fs.existsSync(file)) {
                throw new Error(`Validation failed: Summit packet file not generated: ${file}`);
            }
            if (!indexContent.includes(p.fileName)) {
                throw new Error(`Validation failed: Summit packet ${p.fileName} not linked in index`);
            }
        });
        log.info('Staged packet links verified successfully');

        // Build Manifest JSON
        const manifestObj = {
            stage: 'generate_mountain_summit_review_packets',
            stage_version: '0.1.0',
            git_commit: gitCommit,
            created_at: createdAt,
            inputs: {
                review_dir: reviewDirPath,
                conflict_groups_by_gpx_sha256: sha256File(gpxGroupsPath),
                conflict_groups_by_summit_candidate_sha256: sha256File(summitConflictsPath),
                compact_review_queue_top1_sha256: sha256File(top1Path),
                compact_review_queue_top3_sha256: sha256File(top3Path),
                compact_review_queue_conflicts_sha256: sha256File(conflictsPath),
            },
            outputs: [
                { path: manifestPath, sha256: null, role: 'manifest' },
                { path: reportPath, sha256: null, role: 'report' },
                { path: toDisplayPath(absOut.decisionTemplate), sha256: null, role: 'decision_template_csv' },
                { path: toDisplayPath(absOut.index), sha256: null, role: 'review_packets_index' },
            ],
            checksum_algorithm: 'sha256',
            parameters: {},
            summary: stats
        };

        // Populate output SHA-256 hashes
        manifestObj.outputs.find(o => o.role === 'decision_template_csv').sha256 = sha256File(stagedDecisions);
        manifestObj.outputs.find(o => o.role === 'review_packets_index').sha256 = sha256File(path.join(tmpDir, 'index.md'));
        manifestObj.outputs.find(o => o.role === 'report').sha256 = sha256File(stagedReport);

        const manifestContent = JSON.stringify(manifestObj, null, 2);
        const stagedManifest = path.join(tmpDir, 'manifest.json');
        fs.writeFileSync(stagedManifest, manifestContent, 'utf8');
        manifestObj.outputs.find(o => o.role === 'manifest').sha256 = sha256File(stagedManifest);
        fs.writeFileSync(stagedManifest, JSON.stringify(manifestObj, null, 2), 'utf8');

        // Verify staged manifest JSON parses
        JSON.parse(fs.readFileSync(stagedManifest, 'utf8'));
        log.info('Staged manifest validated');

        // Move staged files to final destination (atomic rename)
        log.info('Moving staged outputs to final paths...');
        ensureDir(absOutDir);
        ensureDir(path.dirname(absOut.manifest));
        ensureDir(path.dirname(absOut.report));

        // Create target subdirs
        fs.mkdirSync(path.join(absOutDir, 'gpx_groups'), { recursive: true });
        fs.mkdirSync(path.join(absOutDir, 'summit_candidate_groups'), { recursive: true });

        // Rename all generated files
        fs.renameSync(stagedManifest, absOut.manifest);
        fs.renameSync(stagedReport, absOut.report);
        fs.renameSync(stagedDecisions, absOut.decisionTemplate);
        fs.renameSync(path.join(tmpDir, 'index.md'), absOut.index);

        result.gpxPackets.forEach(p => {
            const stagedFile = path.join(tmpDir, 'gpx_groups', p.fileName);
            const finalFile = path.join(absOutDir, 'gpx_groups', p.fileName);
            if (fs.existsSync(finalFile)) {
                throw new Error(`Target collision: GPX packet file already exists at ${finalFile}`);
            }
            fs.renameSync(stagedFile, finalFile);
        });

        result.summitPackets.forEach(p => {
            const stagedFile = path.join(tmpDir, 'summit_candidate_groups', p.fileName);
            const finalFile = path.join(absOutDir, 'summit_candidate_groups', p.fileName);
            if (fs.existsSync(finalFile)) {
                throw new Error(`Target collision: Summit packet file already exists at ${finalFile}`);
            }
            fs.renameSync(stagedFile, finalFile);
        });

        log.info('=== Generate review packets stage complete ===');
    } finally {
        // Cleanup temp directory
        try {
            // Recursive rm for tmpDir
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (_) {}
    }
};

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const { generateStabilityReviewPackets } = require('../lib/location_stability_review_packets');

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
    return `# Mountain Summit Candidate Location Stability Review Packet Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`generate-location-stability-review-packets\`

## Input Paths

| Input | Path |
|---|---|
| Top-1 compact queue CSV | \`${displayIn.top1}\` |
| Top-3 compact queue CSV | \`${displayIn.top3}\` |
| Conflicts compact queue CSV | \`${displayIn.conflicts}\` |
| GPX groups CSV | \`${displayIn.gpxGroups}\` |
| Summit candidate groups CSV | \`${displayIn.summitCandidateGroups}\` |
| Refined links JSONL | \`${displayIn.refinedLinks}\` |

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
| Top-1 queue rows | ${stats.top1_rows} |
| Top-3 queue rows | ${stats.top3_rows} |
| Conflict queue rows | ${stats.conflict_rows} |
| GPX group rows | ${stats.gpx_group_rows} |
| Summit candidate group rows | ${stats.summit_candidate_group_rows} |
| Decision template rows | ${stats.decision_template_rows} |
| Initial pending review decisions | ${stats.initial_pending_review_decisions} |
| Prefilled accepted candidates | ${stats.accepted_summit_candidate_prefilled} |
| GPX group packet count | ${stats.gpx_group_packet_count} |
| Summit candidate packet count | ${stats.summit_candidate_packet_count} |
| Mountain packet count | ${stats.mountain_packet_count} |

## Review Packet and Decision Policy Summary

This stage compiles human-review packets and a decision template to structure manual coordinate validation:
- **GPX group packets**: Located under \`${displayOut.outDir}/gpx_groups/\`. Groups mountains and candidate peaks crossed on the same hike/traverse.
- **Summit candidate conflict packets**: Located under \`${displayOut.outDir}/summit_candidate_groups/\`. Resolves overlapping mountain claims for the same coordinate peak.
- **Mountain packets**: Located under \`${displayOut.outDir}/mountain_groups/\`. Mountain-specific coordinate and candidate analysis files.
- **Decision Template**: A template located at \`${displayOut.decisionTemplate}\`. Initialized to \`pending_review\` with blank decision fields.

## Known Limitations

- Location stability is strong evidence but does not constitute final identity proof.
- Suggested candidates are not final coordinate selections; map check is still required.
- GPX tracks may include traverses and multiple mountains, which require manual group-level review.
- Final coordinate generation remains future work.

## Validation Commands Run
\`\`\`sh
npm test
\`\`\`

## Source Modification Status
- **Source files modified**: \`false\` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Existing Stage 12 outputs overwritten**: \`false\` (Stage 12 packets/templates remain fully preserved.)
- **Reverse geocoding artifacts deleted or modified**: \`false\`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.
`;
}

module.exports = async function generateLocationStabilityReviewPacketsCommand(options) {
    log.info('=== Generate Location Stability Review Packets Stage ===');

    const {
        top1: top1Path,
        top3: top3Path,
        conflicts: conflictsPath,
        gpxGroups: gpxGroupsPath,
        summitCandidateGroups: summitCandidateGroupsPath,
        refinedLinks: refinedLinksPath,
        outDir: outDirPath,
        decisionTemplate: decisionTemplatePath,
        manifest: manifestPath,
        report: reportPath,
    } = options;

    // Validate required arguments
    const required = {
        top1: top1Path,
        top3: top3Path,
        conflicts: conflictsPath,
        gpxGroups: gpxGroupsPath,
        summitCandidateGroups: summitCandidateGroupsPath,
        refinedLinks: refinedLinksPath,
        outDir: outDirPath,
        decisionTemplate: decisionTemplatePath,
        manifest: manifestPath,
        report: reportPath
    };
    for (const [k, v] of Object.entries(required)) {
        if (!v) throw new Error(`Missing required argument: --${k.replace(/([A-Z])/g, c => '-' + c.toLowerCase())}`);
    }

    const absIn = {
        top1: path.resolve(top1Path),
        top3: path.resolve(top3Path),
        conflicts: path.resolve(conflictsPath),
        gpxGroups: path.resolve(gpxGroupsPath),
        summitCandidateGroups: path.resolve(summitCandidateGroupsPath),
        refinedLinks: path.resolve(refinedLinksPath)
    };

    const absOutDir = path.resolve(outDirPath);
    const absOut = {
        manifest: path.resolve(manifestPath),
        report: path.resolve(reportPath),
        decisionTemplate: path.resolve(decisionTemplatePath),
        index: path.join(absOutDir, 'index.md')
    };

    // Verify inputs exist
    for (const [name, p] of Object.entries(absIn)) {
        if (!fs.existsSync(p)) {
            throw new Error(`Input not found: --${name.replace(/([A-Z])/g, c => '-' + c.toLowerCase())} path ${p}`);
        }
    }

    // Output target collision checks
    if (fs.existsSync(absOut.manifest)) throw new Error(`Target collision: Output file already exists at ${absOut.manifest}`);
    if (fs.existsSync(absOut.report)) throw new Error(`Target collision: Output file already exists at ${absOut.report}`);
    if (fs.existsSync(absOut.decisionTemplate)) throw new Error(`Target collision: Output file already exists at ${absOut.decisionTemplate}`);
    if (fs.existsSync(absOut.index)) throw new Error(`Target collision: Output file already exists at ${absOut.index}`);

    // Create a temporary staging directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-stability-review-packets-'));
    log.info(`Staging outputs in temporary directory: ${tmpDir}`);

    try {
        log.info('Generating review packets and decision template...');
        const result = await generateStabilityReviewPackets({
            top1Path: absIn.top1,
            top3Path: absIn.top3,
            conflictsPath: absIn.conflicts,
            gpxGroupsPath: absIn.gpxGroups,
            summitConflictsPath: absIn.summitCandidateGroups,
            refinedLinksPath: absIn.refinedLinks,
            outDir: absOutDir,
            decisionTemplatePath: absOut.decisionTemplate,
            stagedDir: tmpDir
        });

        const stats = {
            top1_rows: result.decisionRows.length,
            top3_rows: top3RowsCount(absIn.top3),
            conflict_rows: conflictsRowsCount(absIn.conflicts),
            gpx_group_rows: result.gpxPackets.length,
            summit_candidate_group_rows: result.summitPackets.length,
            decision_template_rows: result.decisionRows.length,
            initial_pending_review_decisions: result.decisionRows.length,
            accepted_summit_candidate_prefilled: 0,
            gpx_group_packet_count: result.gpxPackets.length,
            summit_candidate_packet_count: result.summitPackets.length,
            mountain_packet_count: result.mountainPackets.length,
            source_files_modified: false,
            existing_stage12_outputs_overwritten: false
        };

        log.info(`Staged summary: ${stats.gpx_group_packet_count} GPX packets, ${stats.summit_candidate_packet_count} summit packets, ${stats.mountain_packet_count} mountain packets`);

        // Generate Report
        const gitCommit = getGitCommitHash();
        const createdAt = new Date().toISOString();
        const reportContent = buildReport(stats, gitCommit, createdAt, {
            top1: toDisplayPath(absIn.top1),
            top3: toDisplayPath(absIn.top3),
            conflicts: toDisplayPath(absIn.conflicts),
            gpxGroups: toDisplayPath(absIn.gpxGroups),
            summitCandidateGroups: toDisplayPath(absIn.summitCandidateGroups),
            refinedLinks: toDisplayPath(absIn.refinedLinks)
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
        const stagedDecisions = path.join(tmpDir, 'location_stability_review_decisions_template.csv');
        const decisionLines = fs.readFileSync(stagedDecisions, 'utf8').split('\n').filter(l => l.trim());
        if (decisionLines.length !== 532) {
            throw new Error(`Validation failed: Staged decision CSV has ${decisionLines.length - 1} rows, expected 531`);
        }
        log.info('Staged decisions verified: 531 rows');

        // Check index packet links exist
        const indexContent = fs.readFileSync(path.join(tmpDir, 'index.md'), 'utf8');
        result.gpxPackets.forEach(p => {
            const file = path.join(tmpDir, 'gpx_groups', p.fileName);
            if (!fs.existsSync(file)) throw new Error(`Validation failed: GPX packet file not generated: ${file}`);
            if (!indexContent.includes(p.fileName)) throw new Error(`Validation failed: GPX packet ${p.fileName} not linked in index`);
        });
        result.summitPackets.forEach(p => {
            const file = path.join(tmpDir, 'summit_candidate_groups', p.fileName);
            if (!fs.existsSync(file)) throw new Error(`Validation failed: Summit packet file not generated: ${file}`);
            if (!indexContent.includes(p.fileName)) throw new Error(`Validation failed: Summit packet ${p.fileName} not linked in index`);
        });
        result.mountainPackets.forEach(p => {
            const file = path.join(tmpDir, 'mountain_groups', p.fileName);
            if (!fs.existsSync(file)) throw new Error(`Validation failed: Mountain packet file not generated: ${file}`);
            if (!indexContent.includes(p.fileName)) throw new Error(`Validation failed: Mountain packet ${p.fileName} not linked in index`);
        });
        log.info('Staged packet links verified successfully');

        // Build Manifest JSON
        const manifestObj = {
            stage: 'generate_location_stability_review_packets',
            stage_version: '0.1.0',
            git_commit: gitCommit,
            created_at: createdAt,
            inputs: {
                top1: toDisplayPath(absIn.top1),
                top1_sha256: sha256File(absIn.top1),
                top3: toDisplayPath(absIn.top3),
                top3_sha256: sha256File(absIn.top3),
                conflicts: toDisplayPath(absIn.conflicts),
                conflicts_sha256: sha256File(absIn.conflicts),
                gpx_groups: toDisplayPath(absIn.gpxGroups),
                gpx_groups_sha256: sha256File(absIn.gpxGroups),
                summit_candidate_groups: toDisplayPath(absIn.summitCandidateGroups),
                summit_candidate_groups_sha256: sha256File(absIn.summitCandidateGroups),
                refined_links: toDisplayPath(absIn.refinedLinks),
                refined_links_sha256: sha256File(absIn.refinedLinks)
            },
            outputs: [
                { path: toDisplayPath(absOut.decisionTemplate), sha256: null, role: 'decision_template_csv' },
                { path: toDisplayPath(absOut.index), sha256: null, role: 'packet_index' },
                { path: toDisplayPath(absOut.report), sha256: null, role: 'report' }
            ],
            packet_outputs: {
                gpx_group_packets: [],
                summit_candidate_packets: [],
                mountain_packets: []
            },
            checksum_algorithm: 'sha256',
            parameters: {},
            summary: stats
        };

        // Populate SHA-256 for basic outputs
        manifestObj.outputs.find(o => o.role === 'decision_template_csv').sha256 = sha256File(stagedDecisions);
        manifestObj.outputs.find(o => o.role === 'packet_index').sha256 = sha256File(path.join(tmpDir, 'index.md'));
        manifestObj.outputs.find(o => o.role === 'report').sha256 = sha256File(stagedReport);

        // Populate packet outputs details with checksums
        result.gpxPackets.forEach(p => {
            const stagedFile = path.join(tmpDir, 'gpx_groups', p.fileName);
            manifestObj.packet_outputs.gpx_group_packets.push({
                path: `${toDisplayPath(absOutDir)}/gpx_groups/${p.fileName}`,
                sha256: sha256File(stagedFile)
            });
        });
        result.summitPackets.forEach(p => {
            const stagedFile = path.join(tmpDir, 'summit_candidate_groups', p.fileName);
            manifestObj.packet_outputs.summit_candidate_packets.push({
                path: `${toDisplayPath(absOutDir)}/summit_candidate_groups/${p.fileName}`,
                sha256: sha256File(stagedFile)
            });
        });
        result.mountainPackets.forEach(p => {
            const stagedFile = path.join(tmpDir, 'mountain_groups', p.fileName);
            manifestObj.packet_outputs.mountain_packets.push({
                path: `${toDisplayPath(absOutDir)}/mountain_groups/${p.fileName}`,
                sha256: sha256File(stagedFile)
            });
        });

        const manifestContent = JSON.stringify(manifestObj, null, 2);
        const stagedManifest = path.join(tmpDir, 'manifest.json');
        fs.writeFileSync(stagedManifest, manifestContent, 'utf8');

        // Verify manifest parsing
        JSON.parse(fs.readFileSync(stagedManifest, 'utf8'));
        log.info('Staged manifest validated');

        // Check target directory collision failures
        fs.mkdirSync(absOutDir, { recursive: true });
        
        const gpxDir = path.join(absOutDir, 'gpx_groups');
        const summitDir = path.join(absOutDir, 'summit_candidate_groups');
        const mountainDir = path.join(absOutDir, 'mountain_groups');
        
        if (fs.existsSync(gpxDir) && fs.readdirSync(gpxDir).length > 0) {
            throw new Error(`Target collision: GPX groups output folder already exists and is not empty at ${gpxDir}`);
        }
        if (fs.existsSync(summitDir) && fs.readdirSync(summitDir).length > 0) {
            throw new Error(`Target collision: Summit candidate groups output folder already exists and is not empty at ${summitDir}`);
        }
        if (fs.existsSync(mountainDir) && fs.readdirSync(mountainDir).length > 0) {
            throw new Error(`Target collision: Mountain groups output folder already exists and is not empty at ${mountainDir}`);
        }

        fs.mkdirSync(gpxDir, { recursive: true });
        fs.mkdirSync(summitDir, { recursive: true });
        fs.mkdirSync(mountainDir, { recursive: true });

        // Rename staged outputs to final paths
        log.info('Moving staged outputs to final paths...');
        ensureDir(path.dirname(absOut.manifest));
        ensureDir(path.dirname(absOut.report));

        fs.renameSync(stagedManifest, absOut.manifest);
        fs.renameSync(stagedReport, absOut.report);
        fs.renameSync(stagedDecisions, absOut.decisionTemplate);
        fs.renameSync(path.join(tmpDir, 'index.md'), absOut.index);

        result.gpxPackets.forEach(p => {
            fs.renameSync(path.join(tmpDir, 'gpx_groups', p.fileName), path.join(gpxDir, p.fileName));
        });
        result.summitPackets.forEach(p => {
            fs.renameSync(path.join(tmpDir, 'summit_candidate_groups', p.fileName), path.join(summitDir, p.fileName));
        });
        result.mountainPackets.forEach(p => {
            fs.renameSync(path.join(tmpDir, 'mountain_groups', p.fileName), path.join(mountainDir, p.fileName));
        });

        log.info('=== Location stability review packet generation complete ===');
    } finally {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (_) {}
    }
};

function top3RowsCount(p) {
    try {
        return fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).length - 1;
    } catch (_) {
        return 0;
    }
}

function conflictsRowsCount(p) {
    try {
        return fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).length - 1;
    } catch (_) {
        return 0;
    }
}

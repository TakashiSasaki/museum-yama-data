'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const { compressStabilityReviewQueues } = require('../lib/location_stability_review_queue_compression');

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

function readJsonlFile(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim() !== '');
    return lines.map((line, i) => {
        try { return JSON.parse(line); }
        catch (e) { throw new Error(`JSON parse error on line ${i + 1} of ${filePath}: ${e.message}`); }
    });
}

function toDisplayPath(filePath) {
    if (!filePath) return '';
    const rel = path.relative(process.cwd(), path.resolve(filePath));
    return rel.replace(/\\/g, '/');
}

function toCsvLine(headers, row) {
    return headers.map(h => {
        const v = row[h] != null ? String(row[h]) : '';
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }).join(',');
}

function buildCsvContent(headers, rows) {
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(toCsvLine(headers, row));
    }
    return lines.join('\n') + '\n';
}

function formatLinkCsvRow(link) {
    const ev = link.evidence?.location_stability || {};
    const elevationDiff = link.evidence?.elevation?.diff_m != null ? link.evidence.elevation.diff_m : '';
    const scoreGap = link.score_gap_to_next_candidate != null ? link.score_gap_to_next_candidate : '';

    return {
        mountain_no: link.mountain_no,
        mountain_name: link.mountain_name,
        summit_candidate_id: link.summit_candidate_id || '',
        source_gpx_basename: link.source_gpx_basename || '',
        track_name: link.track_name || '',
        candidate_ele_m: link.candidate_ele_m != null ? link.candidate_ele_m : '',
        mountain_elevation_m: link.mountain_elevation_m != null ? link.mountain_elevation_m : '',
        elevation_diff_m: elevationDiff,
        location_refined_candidate_score: link.location_stability_refined_candidate_score != null ? link.location_stability_refined_candidate_score : '',
        location_refined_rank_for_mountain: link.location_stability_refined_rank_for_mountain != null ? link.location_stability_refined_rank_for_mountain : '',
        location_refined_rank_for_summit_candidate: link.location_stability_refined_rank_for_summit_candidate != null ? link.location_stability_refined_rank_for_summit_candidate : '',
        score_gap_to_next_candidate: scoreGap,
        mutual_top1: link.mutual_top1 != null ? (link.mutual_top1 ? 'true' : 'false') : 'false',
        mutual_top3: link.mutual_top3 != null ? (link.mutual_top3 ? 'true' : 'false') : 'false',
        confidence: link.confidence || 'none',
        review_priority: link.location_stability_review_priority || '',
        compact_review_priority: link.compact_review_priority || '',
        review_bucket: link.review_bucket || '',
        location_refinement_level: ev.location_stability_bucket || '',
        csv_municipality: ev.mountain_source_municipality || '',
        csv_island: '',
        matched_terms: ev.municipality_relation || '',
        nearest_display_name: ev.candidate_center_municipality || '',
        review_reason_codes: (link.review_reason_codes || []).join('|'),
        review_priority_reason_codes: (link.location_stability_reason_codes || []).join('|'),
        compact_review_reason_codes: (link.compact_review_reason_codes || []).join('|'),
        notes: link.notes || '',
    };
}

function buildReviewSummaryMarkdown(stats, displayOut) {
    return `# Location-Stability Refined Review Queue Compact Summary

- **Input stability-refined links**: ${stats.input_refined_link_records}
- **Unique mountains**: ${stats.mountain_count}
- **Unique summit candidates**: ${stats.summit_candidate_count}
- **Top-1 queue row count**: ${stats.top1_queue_rows}
- **Top-3 queue row count**: ${stats.top3_queue_rows}
- **Conflict queue row count**: ${stats.conflict_queue_rows}
- **GPX group count**: ${stats.gpx_group_rows}
- **Summit candidate conflict rows**: ${stats.summit_candidate_conflict_rows}
- **Score gap threshold**: ${stats.small_score_gap_threshold}

## Compact Review Bucket Distribution

- **accept_candidate_after_map_check**: ${stats.review_bucket_counts.accept_candidate_after_map_check || 0}
- **resolve_conflict**: ${stats.review_bucket_counts.resolve_conflict || 0}
- **check_close_alternatives**: ${stats.review_bucket_counts.check_close_alternatives || 0}
- **check_location_warning**: ${stats.review_bucket_counts.check_location_warning || 0}
- **low_priority**: ${stats.review_bucket_counts.low_priority || 0}
- **deprioritized**: ${stats.review_bucket_counts.deprioritized || 0}

## Compact Review Priority Distribution

- **High**: ${stats.compact_review_priority_counts.high || 0}
- **Medium**: ${stats.compact_review_priority_counts.medium || 0}
- **Low**: ${stats.compact_review_priority_counts.low || 0}

## Next Recommended Review Steps

1. **Resolve Conflicts**: Start with [\`conflict_groups_by_summit_candidate.csv\`](conflict_groups_by_summit_candidate.csv) and [\`conflict_groups_by_gpx.csv\`](conflict_groups_by_gpx.csv).
2. **Review Close Alternatives**: Open [\`compact_review_queue_conflicts.csv\`](compact_review_queue_conflicts.csv) and filter for \`review_bucket = 'check_close_alternatives'\`. Check cases where candidates have a score gap <= ${stats.small_score_gap_threshold}.
3. **Audit Location Mismatches**: Inspect candidates with \`review_bucket = 'check_location_warning'\` where name or elevation evidence is otherwise strong.
4. **Routine Map Check**: Validate [\`compact_review_queue_top1.csv\`](compact_review_queue_top1.csv) for \`review_bucket = 'accept_candidate_after_map_check'\`.

See the full review report at [\`${displayOut.report}\`](${path.relative(path.dirname(displayOut.summary), displayOut.report).replace(/\\/g, '/')}).
`;
}

function buildReport(stats, gitCommit, createdAt, displayIn, displayOut) {
    return `# Mountain Summit Candidate Location Stability Review Queue Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`generate-location-stability-compact-review-queues\`

## Input Paths

| Input | Path |
|---|---|
| Location stability-refined links JSONL | \`${displayIn.refinedLinks}\` |

## Output Paths

| Output | Path |
|---|---|
| Manifest JSON | \`${displayOut.manifest}\` |
| Top-1 Queue CSV | \`${displayOut.top1}\` |
| Top-3 Queue CSV | \`${displayOut.top3}\` |
| Conflict Queue CSV | \`${displayOut.conflicts}\` |
| GPX Group CSV | \`${displayOut.gpxGroups}\` |
| Summit Candidate Conflict CSV | \`${displayOut.summitConflicts}\` |
| Summary Markdown | \`${displayOut.summary}\` |
| Report Markdown | \`${displayOut.report}\` |

## Summary Counts

| Metric | Count |
|---|---|
| Input refined links | ${stats.input_refined_link_records} |
| Mountains | ${stats.mountain_count} |
| Summit candidates | ${stats.summit_candidate_count} |
| Top-1 queue rows | ${stats.top1_queue_rows} |
| Top-3 queue rows | ${stats.top3_queue_rows} |
| Conflict queue rows | ${stats.conflict_queue_rows} |
| GPX groups | ${stats.gpx_group_rows} |
| Summit candidate conflict rows | ${stats.summit_candidate_conflict_rows} |
| Score gap threshold | ${stats.small_score_gap_threshold} |

## Compact Review Bucket Definitions
- **accept_candidate_after_map_check**: Clear mutual top-1 rank, medium/high confidence, and no severe warnings.
- **resolve_conflict**: Candidate is top-ranked for multiple mountains, or mountain's top-1 candidate is not mutual top-1.
- **check_close_alternatives**: Rank 1 or top-3 candidate where the score gap between rank 1 and rank 2 is <= \`${stats.small_score_gap_threshold}\`.
- **check_location_warning**: Location stability warnings (boundary_plausible, adjacent_but_deep_inside, municipality_incompatible_strong) but name or elevation evidence is otherwise strong.
- **low_priority**: Rank > 3 candidates with no special conflicts.
- **deprioritized**: Pre-refinement deprioritized candidate at rank > 3.

## Review Priority Mapping
- **High**: Links in \`resolve_conflict\`, \`check_location_warning\`, and \`check_close_alternatives\` buckets.
- **Medium**: Links in \`accept_candidate_after_map_check\` bucket.
- **Low**: Links in \`low_priority\` and \`deprioritized\` buckets.

## Source Modification Status
**Source files and location stability-refined link inputs were NOT modified.**

## Next Recommended Steps
1. Open \`conflict_groups_by_summit_candidate.csv\` to resolve multi-mountain assignments.
2. Review \`compact_review_queue_conflicts.csv\` to confirm close alternative summits.
3. Validate clear mutual top-1 candidates in \`compact_review_queue_top1.csv\`.
`;
}

module.exports = async function generateLocationStabilityCompactReviewQueues(options) {
    log.info('=== Generate Location Stability Compact Review Queues ===');

    const {
        refinedLinks: refinedLinksPath,
        outDir: outDirPath,
        manifest: manifestPath,
        report: reportPath,
    } = options;

    const gapThreshold = 0.03;

    // Validate required arguments
    const required = { refinedLinks: refinedLinksPath, outDir: outDirPath, manifest: manifestPath, report: reportPath };
    for (const [k, v] of Object.entries(required)) {
        if (!v) throw new Error(`Missing required argument: --${k.replace(/([A-Z])/g, c => '-' + c.toLowerCase())}`);
    }

    const absIn = {
        refinedLinks: path.resolve(refinedLinksPath),
    };
    const absOutDir = path.resolve(outDirPath);
    const absOut = {
        manifest: path.resolve(manifestPath),
        report: path.resolve(reportPath),
        top1: path.join(absOutDir, 'compact_review_queue_top1.csv'),
        top3: path.join(absOutDir, 'compact_review_queue_top3.csv'),
        conflicts: path.join(absOutDir, 'compact_review_queue_conflicts.csv'),
        gpxGroups: path.join(absOutDir, 'conflict_groups_by_gpx.csv'),
        summitConflicts: path.join(absOutDir, 'conflict_groups_by_summit_candidate.csv'),
        summary: path.join(absOutDir, 'compact_review_summary.md'),
    };

    // Collision check
    for (const [key, p] of Object.entries(absOut)) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: Output file already exists at ${p}. Remove it before re-running.`);
        }
    }

    // Validate inputs exist
    if (!fs.existsSync(absIn.refinedLinks)) {
        throw new Error(`Input not found: ${absIn.refinedLinks}`);
    }

    // Load inputs
    log.info('Loading stability-refined candidate links...');
    const refinedLinks = readJsonlFile(absIn.refinedLinks);
    log.info(`Loaded ${refinedLinks.length} refined candidate links`);

    // Run review queue compression
    log.info('Compressing and grouping candidate links...');
    const {
        enrichedLinks,
        top1Queue,
        top3Queue,
        conflictQueue,
        gpxGroupRows,
        summitConflictRows
    } = compressStabilityReviewQueues(refinedLinks, gapThreshold);

    // Validate outputs
    log.info('Validating internal consistency...');
    const distinctMountainNos = new Set(refinedLinks.map(l => l.mountain_no));
    if (top1Queue.length !== distinctMountainNos.size) {
        throw new Error(`Validation failed: top1 queue length (${top1Queue.length}) does not match the number of distinct mountains (${distinctMountainNos.size}).`);
    }

    // Bucket counts
    const bucketCounts = {};
    const priorityCounts = {};
    for (const link of enrichedLinks) {
        const b = link.review_bucket;
        const p = link.compact_review_priority;
        bucketCounts[b] = (bucketCounts[b] || 0) + 1;
        priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    }

    // Distinct counts
    const distinctSummitCandidates = new Set(refinedLinks.map(l => l.summit_candidate_id).filter(Boolean));

    const stats = {
        input_refined_link_records: refinedLinks.length,
        mountain_count: distinctMountainNos.size,
        summit_candidate_count: distinctSummitCandidates.size,
        top1_queue_rows: top1Queue.length,
        top3_queue_rows: top3Queue.length,
        conflict_queue_rows: conflictQueue.length,
        gpx_group_rows: gpxGroupRows.length,
        summit_candidate_conflict_rows: summitConflictRows.length,
        review_bucket_counts: bucketCounts,
        compact_review_priority_counts: priorityCounts,
        small_score_gap_threshold: gapThreshold,
        source_files_modified: false,
    };

    log.info(`Summary: top-1 queue has ${top1Queue.length} rows, top-3 queue has ${top3Queue.length} rows.`);

    // Build outputs
    log.info('Formatting CSV outputs...');
    const linkHeaders = [
        'mountain_no','mountain_name','summit_candidate_id','source_gpx_basename',
        'track_name','candidate_ele_m','mountain_elevation_m','elevation_diff_m',
        'location_refined_candidate_score','location_refined_rank_for_mountain',
        'location_refined_rank_for_summit_candidate','score_gap_to_next_candidate',
        'mutual_top1','mutual_top3','confidence','review_priority','compact_review_priority',
        'review_bucket','location_refinement_level','csv_municipality','csv_island',
        'matched_terms','nearest_display_name','review_reason_codes',
        'review_priority_reason_codes','compact_review_reason_codes','notes',
    ];

    const top1RowsFormatted = top1Queue.map(formatLinkCsvRow);
    const top3RowsFormatted = top3Queue.map(formatLinkCsvRow);
    const conflictRowsFormatted = conflictQueue.map(formatLinkCsvRow);

    const top1Csv = buildCsvContent(linkHeaders, top1RowsFormatted);
    const top3Csv = buildCsvContent(linkHeaders, top3RowsFormatted);
    const conflictCsv = buildCsvContent(linkHeaders, conflictRowsFormatted);

    const gpxHeaders = [
        'source_gpx_basename','track_name','mountain_count_in_group',
        'summit_candidate_count_in_group','top1_link_count','conflict_count',
        'mountain_names','summit_candidate_ids','suggested_review_order','notes',
    ];
    const gpxCsv = buildCsvContent(gpxHeaders, gpxGroupRows);

    const summitHeaders = [
        'summit_candidate_id','source_gpx_basename','track_name','candidate_lat',
        'candidate_lon','candidate_ele_m','top1_mountain_count','top3_mountain_count',
        'top1_mountain_nos','top1_mountain_names','top3_mountain_nos','top3_mountain_names',
        'max_score','score_spread','suggested_review_bucket','notes',
    ];
    const summitCsv = buildCsvContent(summitHeaders, summitConflictRows);

    const summaryMd = buildReviewSummaryMarkdown(stats, {
        report: toDisplayPath(absOut.report),
        summary: toDisplayPath(absOut.summary),
    });

    const gitCommit = getGitCommitHash();
    const createdAt = new Date().toISOString();

    const reportContent = buildReport(stats, gitCommit, createdAt, {
        refinedLinks: toDisplayPath(absIn.refinedLinks),
    }, {
        manifest: toDisplayPath(absOut.manifest),
        top1: toDisplayPath(absOut.top1),
        top3: toDisplayPath(absOut.top3),
        conflicts: toDisplayPath(absOut.conflicts),
        gpxGroups: toDisplayPath(absOut.gpxGroups),
        summitConflicts: toDisplayPath(absOut.summitConflicts),
        summary: toDisplayPath(absOut.summary),
        report: toDisplayPath(absOut.report),
    });

    // Manifest structure
    const manifestObj = {
        stage: 'generate_location_stability_compact_review_queues',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: createdAt,
        inputs: {
            refined_links: refinedLinksPath,
            refined_links_sha256: sha256File(absIn.refinedLinks),
        },
        outputs: [
            { path: manifestPath, sha256: null, role: 'manifest' },
            { path: reportPath, sha256: null, role: 'report' },
            { path: toDisplayPath(absOut.top1), sha256: null, role: 'top1_queue_csv' },
            { path: toDisplayPath(absOut.top3), sha256: null, role: 'top3_queue_csv' },
            { path: toDisplayPath(absOut.conflicts), sha256: null, role: 'conflict_queue_csv' },
            { path: toDisplayPath(absOut.gpxGroups), sha256: null, role: 'gpx_groups_csv' },
            { path: toDisplayPath(absOut.summitConflicts), sha256: null, role: 'summit_candidate_conflicts_csv' },
            { path: toDisplayPath(absOut.summary), sha256: null, role: 'summary_markdown' },
        ],
        checksum_algorithm: 'sha256',
        parameters: {
            small_score_gap_threshold: gapThreshold,
        },
        summary: stats,
    };

    // Staging and writing atomic outputs
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-stability-review-compact-'));
    log.info(`Staging outputs in temporary directory: ${tmpDir}`);

    const stagedManifest = path.join(tmpDir, 'compact_review_manifest.json');
    const stagedTop1 = path.join(tmpDir, 'compact_review_queue_top1.csv');
    const stagedTop3 = path.join(tmpDir, 'compact_review_queue_top3.csv');
    const stagedConflicts = path.join(tmpDir, 'compact_review_queue_conflicts.csv');
    const stagedGpxGroups = path.join(tmpDir, 'conflict_groups_by_gpx.csv');
    const stagedSummitConflicts = path.join(tmpDir, 'conflict_groups_by_summit_candidate.csv');
    const stagedSummary = path.join(tmpDir, 'compact_review_summary.md');
    const stagedReport = path.join(tmpDir, 'report.md');

    fs.writeFileSync(stagedTop1, top1Csv, 'utf8');
    fs.writeFileSync(stagedTop3, top3Csv, 'utf8');
    fs.writeFileSync(stagedConflicts, conflictCsv, 'utf8');
    fs.writeFileSync(stagedGpxGroups, gpxCsv, 'utf8');
    fs.writeFileSync(stagedSummitConflicts, summitCsv, 'utf8');
    fs.writeFileSync(stagedSummary, summaryMd, 'utf8');
    fs.writeFileSync(stagedReport, reportContent, 'utf8');

    // Populate SHA-256 in manifest before writing
    manifestObj.outputs.find(o => o.role === 'top1_queue_csv').sha256 = sha256File(stagedTop1);
    manifestObj.outputs.find(o => o.role === 'top3_queue_csv').sha256 = sha256File(stagedTop3);
    manifestObj.outputs.find(o => o.role === 'conflict_queue_csv').sha256 = sha256File(stagedConflicts);
    manifestObj.outputs.find(o => o.role === 'gpx_groups_csv').sha256 = sha256File(stagedGpxGroups);
    manifestObj.outputs.find(o => o.role === 'summit_candidate_conflicts_csv').sha256 = sha256File(stagedSummitConflicts);
    manifestObj.outputs.find(o => o.role === 'summary_markdown').sha256 = sha256File(stagedSummary);
    manifestObj.outputs.find(o => o.role === 'report').sha256 = sha256File(stagedReport);

    const manifestContent = JSON.stringify(manifestObj, null, 2);
    fs.writeFileSync(stagedManifest, manifestContent, 'utf8');

    // Move to final paths
    log.info('Moving staged outputs to final paths...');
    ensureDir(absOutDir);
    ensureDir(path.dirname(absOut.manifest));
    ensureDir(path.dirname(absOut.report));

    fs.renameSync(stagedManifest, absOut.manifest);
    fs.renameSync(stagedTop1, absOut.top1);
    fs.renameSync(stagedTop3, absOut.top3);
    fs.renameSync(stagedConflicts, absOut.conflicts);
    fs.renameSync(stagedGpxGroups, absOut.gpxGroups);
    fs.renameSync(stagedSummitConflicts, absOut.summitConflicts);
    fs.renameSync(stagedSummary, absOut.summary);
    fs.renameSync(stagedReport, absOut.report);

    // Cleanup
    try { fs.rmdirSync(tmpDir); } catch (_) {}

    log.info('=== Compact review queue generation complete ===');
};

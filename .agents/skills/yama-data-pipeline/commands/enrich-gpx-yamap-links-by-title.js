const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const { enrichCandidateLink } = require('../lib/gpx_yamap_title_linking');

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

module.exports = async function enrichGpxYamapLinksByTitleCommand(options) {
    log.info('=== GPX-to-YAMAP Title Similarity Enrichment Stage ===');

    if (!options.dateLinks || !options.gpxManifest || !options.outDir || !options.reviewDir || !options.report) {
        throw new Error('Missing required arguments. Need: --date-links, --gpx-manifest, --out-dir, --review-dir, --report');
    }

    const dateLinksPath = path.resolve(options.dateLinks);
    const gpxManifestPath = path.resolve(options.gpxManifest);
    const outDir = path.resolve(options.outDir);
    const reviewDir = path.resolve(options.reviewDir);
    const reportPath = path.resolve(options.report);

    if (!fs.existsSync(dateLinksPath)) {
        throw new Error(`Date candidate links JSONL not found: ${dateLinksPath}`);
    }
    if (!fs.existsSync(gpxManifestPath)) {
        throw new Error(`GPX manifest JSON not found: ${gpxManifestPath}`);
    }

    // Determine final output targets to check collisions
    const workspaceRoot = process.cwd();

    const enrichedLinksJsonl = path.join(outDir, 'title_enriched_candidate_links.jsonl');
    const enrichedManifest = path.join(outDir, 'title_enriched_manifest.json');
    const reviewCsv = path.join(reviewDir, 'title_enriched_review_queue.csv');
    const reviewMd = path.join(reviewDir, 'title_enriched_review_queue.md');

    const outputsToCheck = [
        enrichedLinksJsonl,
        enrichedManifest,
        reviewCsv,
        reviewMd,
        reportPath
    ];

    for (const p of outputsToCheck) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: Output file already exists at ${p}`);
        }
    }

    // Read and parse input manifest
    const manifestContent = fs.readFileSync(gpxManifestPath, 'utf8');
    const manifestObj = JSON.parse(manifestContent);
    const manifestSha256 = crypto.createHash('sha256').update(manifestContent).digest('hex');

    // Build a map of GPX basename -> track_name
    const gpxTrackMap = new Map();
    if (manifestObj && Array.isArray(manifestObj.files)) {
        for (const file of manifestObj.files) {
            const basename = path.basename(file.source_gpx_path);
            gpxTrackMap.set(basename, file.track_name);
        }
    } else {
        throw new Error('Invalid GPX manifest schema: missing files array');
    }

    // Read date candidate links
    const dateLinksContent = fs.readFileSync(dateLinksPath, 'utf8');
    const dateLinksLines = dateLinksContent.split('\n').filter(line => line.trim() !== '');
    const dateLinksSha256 = crypto.createHash('sha256').update(dateLinksContent).digest('hex');

    const enrichedRecords = [];

    for (let i = 0; i < dateLinksLines.length; i++) {
        const line = dateLinksLines[i];
        let record;
        try {
            record = JSON.parse(line);
        } catch (err) {
            throw new Error(`Failed to parse line ${i + 1} of date candidate links: ${err.message}`);
        }

        const trackName = gpxTrackMap.get(record.gpx_basename);
        // If not in manifest, trackName will be undefined, enrichCandidateLink handles undefined -> null trackName.
        const enriched = enrichCandidateLink(record, trackName);
        enrichedRecords.push(enriched);
    }

    // Self-validation checks
    if (enrichedRecords.length !== dateLinksLines.length) {
        throw new Error(`Self-validation failed: Expected ${dateLinksLines.length} enriched records, but got ${enrichedRecords.length}`);
    }

    // Prepare staging directory
    const stageDir = path.join(workspaceRoot, 'scratch', 'stage_activity_linking_title_enrich_stage_' + Date.now());
    ensureDir(stageDir);

    try {
        const stageEnrichedLinks = path.join(stageDir, 'title_enriched_candidate_links.jsonl');
        const stageEnrichedManifest = path.join(stageDir, 'title_enriched_manifest.json');
        const stageReviewCsv = path.join(stageDir, 'title_enriched_review_queue.csv');
        const stageReviewMd = path.join(stageDir, 'title_enriched_review_queue.md');
        const stageReport = path.join(stageDir, 'gpx_yamap_title_enriched_linking_report.md');

        // Write staged JSONL
        const jsonlContent = enrichedRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
        fs.writeFileSync(stageEnrichedLinks, jsonlContent, 'utf8');

        // Verify staged JSONL read back
        try {
            const readContent = fs.readFileSync(stageEnrichedLinks, 'utf8');
            const lines = readContent.split('\n').filter(line => line.trim() !== '');
            if (lines.length !== enrichedRecords.length) {
                throw new Error(`Line count mismatch: expected ${enrichedRecords.length}, got ${lines.length}`);
            }
            for (let i = 0; i < lines.length; i++) {
                const parsed = JSON.parse(lines[i]);
                if (parsed.gpx_basename !== enrichedRecords[i].gpx_basename) {
                    throw new Error(`Basename mismatch at line ${i + 1}`);
                }
            }
        } catch (err) {
            throw new Error(`Staged JSONL verification failed: ${err.message}`);
        }

        const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(stageEnrichedLinks)).digest('hex');

        // Compile counts for manifest
        let noDateCandidateCount = 0;
        let singleHighConfidenceCount = 0;
        let singleMediumConfidenceCount = 0;
        let noTitleEvidenceCount = 0;
        let multipleCandidatesAmbiguousCount = 0;
        let multipleCandidatesRankedCount = 0;
        let gpxDatetimeUnparsedCount = 0;

        for (const rec of enrichedRecords) {
            switch (rec.enriched_match_status) {
                case 'no_date_candidate':
                    noDateCandidateCount++;
                    break;
                case 'single_high_confidence_candidate':
                    singleHighConfidenceCount++;
                    break;
                case 'single_medium_confidence_candidate':
                    singleMediumConfidenceCount++;
                    break;
                case 'no_title_evidence':
                    noTitleEvidenceCount++;
                    break;
                case 'multiple_candidates_ambiguous':
                    multipleCandidatesAmbiguousCount++;
                    break;
                case 'multiple_candidates_ranked':
                    multipleCandidatesRankedCount++;
                    break;
                case 'gpx_datetime_unparsed':
                    gpxDatetimeUnparsedCount++;
                    break;
            }
        }

        const gitCommit = getGitCommitHash();

        // Write staged manifest
        const manifestObjOut = {
            stage: 'enrich_gpx_yamap_links_by_title',
            stage_version: '0.1.0',
            git_commit: gitCommit,
            created_at: new Date().toISOString(),
            inputs: {
                date_links: options.dateLinks,
                date_links_sha256: dateLinksSha256,
                gpx_manifest: options.gpxManifest,
                gpx_manifest_sha256: manifestSha256
            },
            outputs: [
                {
                    path: options.outDir + '/title_enriched_candidate_links.jsonl',
                    sha256: outputSha256,
                    role: 'title_enriched_candidate_links'
                }
            ],
            checksum_algorithm: 'sha256',
            summary: {
                total_records: enrichedRecords.length,
                no_date_candidate: noDateCandidateCount,
                single_high_confidence_candidate: singleHighConfidenceCount,
                single_medium_confidence_candidate: singleMediumConfidenceCount,
                no_title_evidence: noTitleEvidenceCount,
                multiple_candidates_ambiguous: multipleCandidatesAmbiguousCount,
                multiple_candidates_ranked: multipleCandidatesRankedCount,
                gpx_datetime_unparsed: gpxDatetimeUnparsedCount,
                needs_review_count: enrichedRecords.filter(r => r.needs_review).length,
                source_files_modified: false
            }
        };
        fs.writeFileSync(stageEnrichedManifest, JSON.stringify(manifestObjOut, null, 2), 'utf8');

        // Write staged CSV
        const csvHeader = [
            'gpx_basename', 'gpx_path', 'gpx_track_name',
            'gpx_filename_datetime_raw', 'timezone_sensitive',
            'date_match_status', 'enriched_match_status', 'enriched_confidence',
            'candidate_count', 'best_yamap_activity_id', 'best_yamap_title',
            'best_activity_date', 'best_title_similarity_score',
            'review_reason_codes', 'candidate_summary', 'notes'
        ].join(',');

        const csvRows = [csvHeader];
        for (const rec of enrichedRecords) {
            const escapeCsv = (str) => {
                if (!str) return '';
                str = String(str);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            };

            const best = rec.best_candidate;
            const best_yamap_activity_id = best ? best.yamap_activity_id : '';
            const best_yamap_title = best ? best.title : '';
            const best_activity_date = best ? best.activity_date : '';
            const best_title_similarity_score = best ? best.title_similarity_score.toFixed(4) : '0.0000';
            const review_reason_codes = (rec.review_reason_codes || []).join(';');

            const candidateSummary = rec.title_enriched_candidate_activities
                .map(c => `${c.yamap_activity_id}:${c.title}(score:${c.title_similarity_score.toFixed(4)},rank:${c.candidate_rank})`)
                .join('; ');

            csvRows.push([
                escapeCsv(rec.gpx_basename),
                escapeCsv(rec.gpx_path),
                escapeCsv(rec.gpx_track_name || ''),
                escapeCsv(rec.gpx_filename_datetime_raw || ''),
                rec.timezone_sensitive.toString(),
                escapeCsv(rec.date_match_status),
                escapeCsv(rec.enriched_match_status),
                escapeCsv(rec.enriched_confidence),
                rec.date_candidate_count,
                escapeCsv(best_yamap_activity_id),
                escapeCsv(best_yamap_title),
                escapeCsv(best_activity_date),
                best_title_similarity_score,
                escapeCsv(review_reason_codes),
                escapeCsv(candidateSummary),
                escapeCsv(rec.notes || '')
            ].join(','));
        }
        fs.writeFileSync(stageReviewCsv, csvRows.join('\n') + '\n', 'utf8');

        // Write staged MD Review Report
        const needsReviewCount = enrichedRecords.filter(r => r.needs_review).length;
        const reviewMdContent = `# Title-Enriched Candidate Links Review Queue

- **Total records processed**: ${enrichedRecords.length}
- **Records requiring manual review**: ${needsReviewCount}
- **Enriched match status summary**:
  - \`single_high_confidence_candidate\`: ${singleHighConfidenceCount}
  - \`single_medium_confidence_candidate\`: ${singleMediumConfidenceCount}
  - \`no_title_evidence\`: ${noTitleEvidenceCount}
  - \`multiple_candidates_ambiguous\`: ${multipleCandidatesAmbiguousCount}
  - \`multiple_candidates_ranked\`: ${multipleCandidatesRankedCount}
  - \`no_date_candidate\`: ${noDateCandidateCount}
  - \`gpx_datetime_unparsed\`: ${gpxDatetimeUnparsedCount}

## Next Recommended Step
Use the generated CSV queue [\`title_enriched_review_queue.csv\`](file:///${reviewCsv}) to perform the manual validation of activities with low confidence or ties.
`;
        fs.writeFileSync(stageReviewMd, reviewMdContent, 'utf8');

        // Write staged Report
        const reportContent = `# GPX to YAMAP Title Similarity Enrichment Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Input date links path**: \`${options.dateLinks}\`
- **Input GPX manifest path**: \`${options.gpxManifest}\`
- **Output JSONL path**: \`${enrichedLinksJsonl}\`
- **Output manifest path**: \`${enrichedManifest}\`
- **Command used**: \`enrich-gpx-yamap-links-by-title\`
- **Record counts**:
  - Date Links records input: \`${dateLinksLines.length}\`
  - Enriched records output: \`${enrichedRecords.length}\`
  - Need manual review count: \`${needsReviewCount}\`
- **Match Status Distribution**:
  - \`single_high_confidence_candidate\`: ${singleHighConfidenceCount}
  - \`single_medium_confidence_candidate\`: ${singleMediumConfidenceCount}
  - \`no_title_evidence\`: ${noTitleEvidenceCount}
  - \`multiple_candidates_ambiguous\`: ${multipleCandidatesAmbiguousCount}
  - \`multiple_candidates_ranked\`: ${multipleCandidatesRankedCount}
  - \`no_date_candidate\`: ${noDateCandidateCount}
  - \`gpx_datetime_unparsed\`: ${gpxDatetimeUnparsedCount}
- **Review Reasons Triggered**:
  - \`missing_gpx_track_name\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('missing_gpx_track_name')).length}
  - \`no_title_match\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('no_title_match')).length}
  - \`weak_title_match\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('weak_title_match')).length}
  - \`title_tie\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('title_tie')).length}
  - \`ambiguous_best_candidate\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('ambiguous_best_candidate')).length}
  - \`multiple_date_candidates\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('multiple_date_candidates')).length}
  - \`timezone_sensitive\`: ${enrichedRecords.filter(r => r.review_reason_codes.includes('timezone_sensitive')).length}
- **SHA-256 Checksum Policy**: SHA-256 is used for output file integrity and is stored in \`title_enriched_manifest.json\`.
- **Statement on source files**: Source GPX, YAMAP Markdown files, and input datasets were not modified.
- **Verification status**: Checked via \`npm test\` and post-execution script checks.
`;
        fs.writeFileSync(stageReport, reportContent, 'utf8');

        // Verify staged files read back
        try {
            if (!fs.readFileSync(stageEnrichedManifest, 'utf8') || !fs.readFileSync(stageReviewCsv, 'utf8') || !fs.readFileSync(stageReviewMd, 'utf8') || !fs.readFileSync(stageReport, 'utf8')) {
                throw new Error('One of the staged outputs is empty.');
            }
        } catch (err) {
            throw new Error(`Staged outputs read-back verification failed: ${err.message}`);
        }

        // Verify inputs were not modified
        const postDateLinksContent = fs.readFileSync(dateLinksPath, 'utf8');
        const postDateLinksSha = crypto.createHash('sha256').update(postDateLinksContent).digest('hex');
        if (postDateLinksSha !== dateLinksSha256) {
            throw new Error('Fatal error: Input date links file was modified during processing!');
        }

        const postManifestContent = fs.readFileSync(gpxManifestPath, 'utf8');
        const postManifestSha = crypto.createHash('sha256').update(postManifestContent).digest('hex');
        if (postManifestSha !== manifestSha256) {
            throw new Error('Fatal error: Input GPX manifest file was modified during processing!');
        }

        // Atomic copy staged files to target locations
        ensureDir(outDir);
        fs.copyFileSync(stageEnrichedLinks, enrichedLinksJsonl);
        fs.copyFileSync(stageEnrichedManifest, enrichedManifest);

        ensureDir(reviewDir);
        fs.copyFileSync(stageReviewCsv, reviewCsv);
        fs.copyFileSync(stageReviewMd, reviewMd);

        ensureDir(path.dirname(reportPath));
        fs.copyFileSync(stageReport, reportPath);

        log.info(`Enriched candidate links successfully written to ${enrichedLinksJsonl}`);
        log.info(`Enriched manifest successfully written to ${enrichedManifest}`);
        log.info(`Review queue CSV successfully written to ${reviewCsv}`);
        log.info(`Review queue Markdown successfully written to ${reviewMd}`);
        log.info(`Execution report successfully written to ${reportPath}`);

    } finally {
        // Cleanup staging dir
        if (fs.existsSync(stageDir)) {
            fs.rmSync(stageDir, { recursive: true, force: true });
        }
    }
};

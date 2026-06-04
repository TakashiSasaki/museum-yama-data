const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/log');
const { parseGpxFilename } = require('../lib/gpx_filename');
const { parseYamapMarkdown } = require('../lib/yamap_markdown');
const { getFileSha256 } = require('../lib/sha256');
const { ensureDir } = require('../lib/fs_safe');
const { execSync } = require('child_process');

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

module.exports = async function linkGpxYamapByDate(options) {
    log.info('=== GPX-to-YAMAP Date Linking Stage ===');

    if (!options.gpxDir || !options.yamapDir || !options.outDir || !options.intermediateDir || !options.reviewDir || !options.report) {
        throw new Error('Missing required arguments. Need: --gpx-dir, --yamap-dir, --out-dir, --intermediate-dir, --review-dir, --report');
    }

    const gpxDir = path.resolve(options.gpxDir);
    const yamapDir = path.resolve(options.yamapDir);
    const outDir = path.resolve(options.outDir);
    const intermediateDir = path.resolve(options.intermediateDir);
    const reviewDir = path.resolve(options.reviewDir);
    const reportPath = path.resolve(options.report);

    if (!fs.existsSync(gpxDir)) {
        throw new Error(`GPX directory not found: ${gpxDir}`);
    }
    if (!fs.existsSync(yamapDir)) {
        throw new Error(`YAMAP directory not found: ${yamapDir}`);
    }

    // Determine final output targets to check collisions
    const workspaceRoot = process.cwd();
    const relativeGpxDirName = path.basename(gpxDir); // e.g. "2026-05-12"

    const gpxIndexDir = path.join(intermediateDir, 'gpx_filename_index', relativeGpxDirName);
    const gpxIndexJsonl = path.join(gpxIndexDir, 'gpx_filename_index.jsonl');
    const gpxIndexManifest = path.join(gpxIndexDir, 'manifest.json');

    const yamapIndexDir = path.join(intermediateDir, 'yamap_activity_index');
    const yamapIndexJsonl = path.join(yamapIndexDir, 'yamap_activity_index.jsonl');
    const yamapIndexManifest = path.join(yamapIndexDir, 'manifest.json');

    const candidateLinksJsonl = path.join(outDir, 'date_candidate_links.jsonl');
    const candidateLinksManifest = path.join(outDir, 'manifest.json');

    const reviewCsv = path.join(reviewDir, 'date_review_queue.csv');
    const reviewMd = path.join(reviewDir, 'date_review_queue.md');

    const outputsToCheck = [
        gpxIndexJsonl, gpxIndexManifest,
        yamapIndexJsonl, yamapIndexManifest,
        candidateLinksJsonl, candidateLinksManifest,
        reviewCsv, reviewMd,
        reportPath
    ];

    for (const p of outputsToCheck) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: Output file already exists at ${p}`);
        }
    }

    // Read inputs
    const gpxFiles = fs.readdirSync(gpxDir)
        .filter(f => f.toLowerCase().endsWith('.gpx'))
        .sort();

    const yamapFiles = fs.readdirSync(yamapDir)
        .filter(f => f.toLowerCase().endsWith('.md'))
        .sort();

    log.info(`Found ${gpxFiles.length} GPX files and ${yamapFiles.length} YAMAP Markdown files to link.`);

    // 1. Stage 1: Build GPX filename datetime/date index
    const gpxRecords = [];
    let unparsedGpxCount = 0;

    for (const file of gpxFiles) {
        const filePath = path.join(gpxDir, file);
        const sha256 = getFileSha256(filePath);
        const parsed = parseGpxFilename(file);
        
        let record;
        if (parsed) {
            record = {
                gpx_path: path.relative(workspaceRoot, filePath).replace(/\\/g, '/'),
                gpx_basename: file,
                gpx_sha256: sha256,
                ...parsed
            };
        } else {
            unparsedGpxCount++;
            record = {
                gpx_path: path.relative(workspaceRoot, filePath).replace(/\\/g, '/'),
                gpx_basename: file,
                gpx_sha256: sha256,
                gpx_filename_datetime_raw: null,
                filename_as_jst: null,
                filename_as_utc_to_jst: null,
                candidate_dates_jst: [],
                timezone_ambiguity: false,
                timezone_sensitive: false,
                inference_method: 'filename_pattern',
                filename_pattern: null,
                parse_status: 'unparsed',
                notes: 'Could not parse datetime from filename.'
            };
        }
        gpxRecords.push(record);
    }

    // 2. Stage 2: Build YAMAP Markdown index
    const yamapRecords = [];
    let unparsedYamapCount = 0;

    for (const file of yamapFiles) {
        const filePath = path.join(yamapDir, file);
        const sha256 = getFileSha256(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = parseYamapMarkdown(content);
        const activityId = path.basename(file, '.md');

        const record = {
            yamap_activity_id: activityId,
            yamap_markdown_path: path.relative(workspaceRoot, filePath).replace(/\\/g, '/'),
            yamap_markdown_sha256: sha256,
            ...parsed
        };
        if (record.parse_status === 'unparsed') {
            unparsedYamapCount++;
        }
        yamapRecords.push(record);
    }

    // 3. Stage 3: Generate date-only candidate links
    const candidateLinks = [];
    let singleDateCandidateCount = 0;
    let multipleDateCandidatesCount = 0;
    let noDateCandidateCount = 0;
    let gpxDatetimeUnparsedCount = 0;
    let timezoneSensitiveCount = 0;

    for (const gpxRec of gpxRecords) {
        if (gpxRec.parse_status === 'unparsed') {
            gpxDatetimeUnparsedCount++;
            candidateLinks.push({
                gpx_path: gpxRec.gpx_path,
                gpx_basename: gpxRec.gpx_basename,
                gpx_sha256: gpxRec.gpx_sha256,
                gpx_filename_datetime_raw: null,
                candidate_dates_jst: [],
                candidate_yamap_activities: [],
                candidate_count: 0,
                match_status: 'gpx_datetime_unparsed',
                confidence: 'none',
                timezone_ambiguity: false,
                timezone_sensitive: false,
                evidence: {
                    method: 'gpx_filename_candidate_dates_vs_yamap_markdown_date',
                    date_match: false,
                    used_gpx_field: 'candidate_dates_jst',
                    used_yamap_field: 'activity_date'
                },
                needs_review: true,
                notes: 'GPX filename datetime was unparseable.'
            });
            continue;
        }

        if (gpxRec.timezone_sensitive) {
            timezoneSensitiveCount++;
        }

        const candidateDates = gpxRec.candidate_dates_jst.map(d => d.date);
        const matches = [];

        for (const yamapRec of yamapRecords) {
            if (yamapRec.activity_date && candidateDates.includes(yamapRec.activity_date)) {
                // Find which timezone assumption matched
                const matchedAssumptions = gpxRec.candidate_dates_jst
                    .filter(d => d.date === yamapRec.activity_date)
                    .map(d => d.assumption);

                matches.push({
                    yamap_activity_id: yamapRec.yamap_activity_id,
                    yamap_markdown_path: yamapRec.yamap_markdown_path,
                    yamap_markdown_sha256: yamapRec.yamap_markdown_sha256,
                    activity_date: yamapRec.activity_date,
                    matched_gpx_date_assumptions: matchedAssumptions,
                    title: yamapRec.title
                });
            }
        }

        let matchStatus = 'no_date_candidate';
        let confidence = 'none';

        if (matches.length === 1) {
            matchStatus = 'single_date_candidate';
            confidence = gpxRec.timezone_sensitive ? 'medium_low' : 'medium';
            singleDateCandidateCount++;
        } else if (matches.length > 1) {
            matchStatus = 'multiple_date_candidates';
            confidence = 'low';
            multipleDateCandidatesCount++;
        } else {
            noDateCandidateCount++;
        }

        candidateLinks.push({
            gpx_path: gpxRec.gpx_path,
            gpx_basename: gpxRec.gpx_basename,
            gpx_sha256: gpxRec.gpx_sha256,
            gpx_filename_datetime_raw: gpxRec.gpx_filename_datetime_raw,
            candidate_dates_jst: gpxRec.candidate_dates_jst,
            candidate_yamap_activities: matches,
            candidate_count: matches.length,
            match_status: matchStatus,
            confidence: confidence,
            timezone_ambiguity: gpxRec.timezone_ambiguity,
            timezone_sensitive: gpxRec.timezone_sensitive,
            evidence: {
                method: 'gpx_filename_candidate_dates_vs_yamap_markdown_date',
                date_match: matches.length > 0,
                used_gpx_field: 'candidate_dates_jst',
                used_yamap_field: 'activity_date'
            },
            needs_review: true,
            notes: matches.length === 0 ? 'No matching YAMAP activity date found.' : ''
        });
    }

    // 4. Staging and writing all outputs atomically
    const stageDir = path.join(workspaceRoot, 'scratch', 'stage_activity_linking_' + Date.now());
    ensureDir(stageDir);

    try {
        const stageGpxIndex = path.join(stageDir, 'gpx_filename_index.jsonl');
        const stageGpxManifest = path.join(stageDir, 'gpx_manifest.json');
        const stageYamapIndex = path.join(stageDir, 'yamap_activity_index.jsonl');
        const stageYamapManifest = path.join(stageDir, 'yamap_manifest.json');
        const stageCandidateLinks = path.join(stageDir, 'date_candidate_links.jsonl');
        const stageCandidateManifest = path.join(stageDir, 'candidate_manifest.json');
        const stageReviewCsv = path.join(stageDir, 'date_review_queue.csv');
        const stageReviewMd = path.join(stageDir, 'date_review_queue.md');
        const stageReport = path.join(stageDir, 'gpx_yamap_date_linking_report.md');

        // Write Stage 1
        fs.writeFileSync(stageGpxIndex, gpxRecords.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
        const gpxIndexManifestObj = {
            stage: "gpx_filename_index",
            stage_version: "0.1.0",
            git_commit: getGitCommitHash(),
            created_at: new Date().toISOString(),
            inputs: [path.relative(workspaceRoot, gpxDir).replace(/\\/g, '/')],
            outputs: [path.relative(workspaceRoot, gpxIndexJsonl).replace(/\\/g, '/')],
            summary: {
                total_gpx_files: gpxFiles.length,
                parsed_gpx_count: gpxFiles.length - unparsedGpxCount,
                unparsed_gpx_count: unparsedGpxCount
            },
            checksum_algorithm: "sha256",
            source_files_modified: false
        };
        fs.writeFileSync(stageGpxManifest, JSON.stringify(gpxIndexManifestObj, null, 2), 'utf8');

        // Write Stage 2
        fs.writeFileSync(stageYamapIndex, yamapRecords.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
        const yamapIndexManifestObj = {
            stage: "yamap_activity_index",
            stage_version: "0.1.0",
            git_commit: getGitCommitHash(),
            created_at: new Date().toISOString(),
            inputs: [path.relative(workspaceRoot, yamapDir).replace(/\\/g, '/')],
            outputs: [path.relative(workspaceRoot, yamapIndexJsonl).replace(/\\/g, '/')],
            summary: {
                total_yamap_files: yamapFiles.length,
                parsed_yamap_count: yamapFiles.length - unparsedYamapCount,
                unparsed_yamap_count: unparsedYamapCount
            },
            checksum_algorithm: "sha256",
            source_files_modified: false
        };
        fs.writeFileSync(stageYamapManifest, JSON.stringify(yamapIndexManifestObj, null, 2), 'utf8');

        // Write Stage 3
        fs.writeFileSync(stageCandidateLinks, candidateLinks.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
        const candidateLinksManifestObj = {
            stage: "generate_date_candidate_links",
            stage_version: "0.1.0",
            git_commit: getGitCommitHash(),
            created_at: new Date().toISOString(),
            inputs: [
                path.relative(workspaceRoot, gpxIndexJsonl).replace(/\\/g, '/'),
                path.relative(workspaceRoot, yamapIndexJsonl).replace(/\\/g, '/')
            ],
            outputs: [path.relative(workspaceRoot, candidateLinksJsonl).replace(/\\/g, '/')],
            summary: {
                total_gpx_files: gpxFiles.length,
                single_date_candidate: singleDateCandidateCount,
                multiple_date_candidates: multipleDateCandidatesCount,
                no_date_candidate: noDateCandidateCount,
                gpx_datetime_unparsed: gpxDatetimeUnparsedCount,
                timezone_sensitive_count: timezoneSensitiveCount
            },
            checksum_algorithm: "sha256",
            source_files_modified: false
        };
        fs.writeFileSync(stageCandidateManifest, JSON.stringify(candidateLinksManifestObj, null, 2), 'utf8');

        // Write Stage 4: Review queue files
        // CSV Write
        const csvHeader = [
            'gpx_basename', 'gpx_path', 'gpx_filename_datetime_raw',
            'filename_as_jst_date', 'filename_as_utc_to_jst_date',
            'candidate_dates_jst', 'timezone_ambiguity', 'timezone_sensitive',
            'match_status', 'confidence', 'candidate_count',
            'candidate_yamap_activity_ids', 'candidate_dates_matched',
            'candidate_titles', 'needs_review', 'notes'
        ].join(',');

        const csvRows = [csvHeader];
        for (const link of candidateLinks) {
            const escapeCsv = (str) => str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            
            // Derive dates for CSV
            const gpxRec = gpxRecords.find(r => r.gpx_basename === link.gpx_basename);
            const filename_as_jst_date = gpxRec && gpxRec.filename_as_jst ? gpxRec.filename_as_jst.date : '';
            const filename_as_utc_to_jst_date = gpxRec && gpxRec.filename_as_utc_to_jst ? gpxRec.filename_as_utc_to_jst.date : '';
            
            const candidateDatesJstStr = link.candidate_dates_jst.map(d => `${d.date}(${d.assumption})`).join(';');
            const candidateYamapIds = link.candidate_yamap_activities.map(a => a.yamap_activity_id).join(';');
            const candidateDatesMatched = link.candidate_yamap_activities.map(a => a.activity_date).join(';');
            const candidateTitles = link.candidate_yamap_activities.map(a => a.title).join(';');

            csvRows.push([
                link.gpx_basename,
                link.gpx_path,
                link.gpx_filename_datetime_raw || '',
                filename_as_jst_date,
                filename_as_utc_to_jst_date,
                escapeCsv(candidateDatesJstStr),
                link.timezone_ambiguity.toString(),
                link.timezone_sensitive.toString(),
                link.match_status,
                link.confidence,
                link.candidate_count,
                escapeCsv(candidateYamapIds),
                escapeCsv(candidateDatesMatched),
                escapeCsv(candidateTitles),
                link.needs_review.toString(),
                escapeCsv(link.notes)
            ].join(','));
        }
        fs.writeFileSync(stageReviewCsv, csvRows.join('\n') + '\n', 'utf8');

        // Markdown Review Report Write
        const reviewMdContent = `# Date-Only Candidate Links Review Queue

* **GPX files processed**: ${gpxFiles.length}
* **YAMAP Markdown files processed**: ${yamapFiles.length}
* **parsed GPX filename datetimes**: ${gpxFiles.length - unparsedGpxCount}
* **unparsed GPX filename datetimes**: ${unparsedGpxCount}
* **parsed YAMAP activity dates**: ${yamapFiles.length - unparsedYamapCount}
* **unparsed YAMAP activity dates**: ${unparsedYamapCount}
* **single_date_candidate count**: ${singleDateCandidateCount}
* **multiple_date_candidates count**: ${multipleDateCandidatesCount}
* **no_date_candidate count**: ${noDateCandidateCount}
* **gpx_datetime_unparsed count**: ${gpxDatetimeUnparsedCount}
* **timezone_sensitive count**: ${timezoneSensitiveCount}
* **Generated output paths**:
  - \`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/date_candidate_links.jsonl\`
  - \`data/08_reporting/activity_linking/gpx_yamap_review_queue/2026-05-12/date_review_queue.csv\`
* **Next recommended step**: Enrich matches using GPX track-name matching, YAMAP activity title matching, and chronological sequencing matching to resolve remaining date ambiguity.
`;
        fs.writeFileSync(stageReviewMd, reviewMdContent, 'utf8');

        // Write Stage 5: Human-readable report
        const reportContent = `# GPX to YAMAP Date Linking Report

* **Branch and HEAD commit**: ${gpxIndexManifestObj.git_commit}
* **Selected GPX input directory**: \`data/01_raw/gpx/2026-05-12\`
* **Selected YAMAP Markdown input directory**: \`data/01_raw/yamap_markdown\`
* **Command used**: \`node .agents/skills/yama-data-pipeline/cli.js link-gpx-yamap-by-date ...\`
* **Output paths**:
  - Intermediate GPX Index: \`data/02_intermediate/activity_linking/gpx_filename_index/2026-05-12/gpx_filename_index.jsonl\`
  - Intermediate YAMAP Index: \`data/02_intermediate/activity_linking/yamap_activity_index/yamap_activity_index.jsonl\`
  - Candidate Links: \`data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/date_candidate_links.jsonl\`
  - Review Queue CSV: \`data/08_reporting/activity_linking/gpx_yamap_review_queue/2026-05-12/date_review_queue.csv\`
* **Record counts**:
  - GPX Indexed: ${gpxFiles.length}
  - YAMAP Indexed: ${yamapFiles.length}
  - Candidate Link Records: ${candidateLinks.length}
* **SHA-256 Checksum Policy**: SHA-256 is explicitly used for all project-level file integrity.
* **Timezone Ambiguity Handling Policy**: Parsed datetimes from filenames are evaluated under both direct JST interpretation and UTC-to-JST conversions (+9 hours shift) to preserve ambiguity across all indexes, candidate feature lists, and review queues.
* **Status counts**:
  - \`single_date_candidate\`: ${singleDateCandidateCount}
  - \`multiple_date_candidates\`: ${multipleDateCandidatesCount}
  - \`no_date_candidate\`: ${noDateCandidateCount}
  - \`gpx_datetime_unparsed\`: ${gpxDatetimeUnparsedCount}
* **Timezone-sensitive count**: ${timezoneSensitiveCount}
* **Limitations of date-only matching**: High date match ambiguity due to potential overlaps, timezone shift variants, or multiple activities on the same calendar day.
* **Statement on canonical files**: No final canonical links were created (data/03_primary/ was not modified).
* **Statement on source files**: Source GPX and YAMAP Markdown files were not modified.
* **Next steps**: Run title-based matching and merge records into the confirmed link tables.
`;
        fs.writeFileSync(stageReport, reportContent, 'utf8');

        // Self-validation checks
        if (gpxRecords.length !== gpxFiles.length) {
            throw new Error(`Self-validation failed: Expected ${gpxFiles.length} GPX index records, but found ${gpxRecords.length}`);
        }
        if (yamapRecords.length !== yamapFiles.length) {
            throw new Error(`Self-validation failed: Expected ${yamapFiles.length} YAMAP index records, but found ${yamapRecords.length}`);
        }
        if (candidateLinks.length !== gpxFiles.length) {
            throw new Error(`Self-validation failed: Expected ${gpxFiles.length} candidate link records, but found ${candidateLinks.length}`);
        }
        const csvLineCount = csvRows.length;
        if (csvLineCount - 1 !== gpxFiles.length) {
            throw new Error(`Self-validation failed: Expected ${gpxFiles.length} rows in CSV (excluding header), but found ${csvLineCount - 1}`);
        }

        // Copy staged files to final destination (atomic promo)
        ensureDir(gpxIndexDir);
        fs.copyFileSync(stageGpxIndex, gpxIndexJsonl);
        fs.copyFileSync(stageGpxManifest, gpxIndexManifest);

        ensureDir(yamapIndexDir);
        fs.copyFileSync(stageYamapIndex, yamapIndexJsonl);
        fs.copyFileSync(stageYamapManifest, yamapIndexManifest);

        ensureDir(outDir);
        fs.copyFileSync(stageCandidateLinks, candidateLinksJsonl);
        fs.copyFileSync(stageCandidateManifest, candidateLinksManifest);

        ensureDir(reviewDir);
        fs.copyFileSync(stageReviewCsv, reviewCsv);
        fs.copyFileSync(stageReviewMd, reviewMd);

        ensureDir(path.dirname(reportPath));
        fs.copyFileSync(stageReport, reportPath);

        log.info(`GPX-to-YAMAP date linking successfully complete.`);
    } finally {
        // Cleanup staging dir
        if (fs.existsSync(stageDir)) {
            fs.rmSync(stageDir, { recursive: true, force: true });
        }
    }
};

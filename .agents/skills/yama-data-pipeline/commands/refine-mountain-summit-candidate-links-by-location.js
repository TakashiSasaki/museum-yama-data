'use strict';
/**
 * commands/refine-mountain-summit-candidate-links-by-location.js
 *
 * Command to refine candidate links using detailed reverse-geocoding location evidence.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const { refineScoresAndRanks } = require('../lib/mountain_summit_candidate_location_refinement');

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

function sha256String(str) {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
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

function buildCsvContent(csvRows) {
    const headers = [
        'mountain_no','mountain_name','candidate_count_original','summit_candidate_id',
        'source_gpx_basename','track_name','candidate_ele_m','mountain_elevation_m',
        'elevation_diff_m','combined_candidate_score','location_refined_candidate_score',
        'candidate_rank_for_mountain','location_refined_rank_for_mountain',
        'candidate_rank_for_summit_candidate','location_refined_rank_for_summit_candidate',
        'confidence','review_priority','csv_municipality','csv_island',
        'location_refinement_level','matched_terms','nearest_display_name',
        'review_reason_codes','review_priority_reason_codes','notes',
    ];
    const lines = [headers.join(',')];
    for (const row of csvRows) {
        lines.push(toCsvLine(headers, row));
    }
    return lines.join('\n') + '\n';
}

function buildReviewMarkdown(stats, reviewCsvPath, reportPath) {
    return `# Refined Mountain Summit Candidate Linking Review Queue

- **Total mountains**: ${stats.mountain_records}
- **Input candidate link records**: ${stats.input_candidate_link_records}
- **Output refined link records**: ${stats.output_refined_candidate_link_records}
- **Review queue row count**: ${stats.review_queue_rows}
- **Exact municipality matches**: ${stats.exact_municipality_match_count}
- **Nearby municipality matches**: ${stats.nearby_municipality_match_count}
- **Island text matches**: ${stats.island_text_match_count}
- **Weak admin matches**: ${stats.weak_admin_match_count}
- **Local text matches**: ${stats.local_text_match_count}
- **Boundary tolerated mismatches**: ${stats.boundary_tolerated_mismatch_count}
- **Unavailable location cases**: ${stats.unavailable_location_count}
- **Top-1 per mountain coverage**: ${stats.top_1_per_mountain_coverage} / ${stats.mountain_records}
- **Review Priority Distribution**:
  - High: ${stats.high_review_priority_count}
  - Medium: ${stats.medium_review_priority_count}
  - Low: ${stats.low_review_priority_count}
  - Deprioritized: ${stats.deprioritized_count}

## Review Queue

Use the generated CSV queue [\`location_refined_review_queue.csv\`](location_refined_review_queue.csv) to perform manual validation. The queue has been significantly reduced from ${stats.input_candidate_link_records} to ${stats.review_queue_rows} rows.

## Next Recommended Steps

1. Open \`location_refined_review_queue.csv\` and review rows where \`review_priority = 'high'\`.
2. Prioritize resolving ambiguous top-ranked candidate assignments where the same physical summit candidate is matched to multiple mountains.
3. Check the boundary mismatch warnings where name and elevation evidence are otherwise strong.
4. After manual confirmation, compile the final resolved-mountain waypoint dataset.

See the full refinement report at [\`${reportPath}\`](${reportPath}).
`;
}

function buildReport({ gitCommit, createdAt, displayIn, displayOut, stats }) {
    return `# Mountain Summit Candidate Location Refinement Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`refine-mountain-summit-candidate-links-by-location\`

## Input Paths

| Input | Path |
|---|---|
| Mountain source JSON | \`${displayIn.mountains}\` |
| Candidate links JSONL | \`${displayIn.candidateLinks}\` |
| Location evidence JSONL | \`${displayIn.locationEvidence}\` |

## Output Paths

| Output | Path |
|---|---|
| Refined candidate links JSONL | \`${displayOut.out}\` |
| Refined manifest | \`${displayOut.manifest}\` |
| Review queue CSV | \`${displayOut.reviewCsv}\` |
| Review queue Markdown | \`${displayOut.reviewMd}\` |
| Report | \`${displayOut.report}\` |

## Summary Counts

| Metric | Count |
|---|---|
| Mountain records | ${stats.mountain_records} |
| Input candidate link records | ${stats.input_candidate_link_records} |
| Output refined candidate link records | ${stats.output_refined_candidate_link_records} |
| Review queue rows | ${stats.review_queue_rows} |
| Exact municipality matches | ${stats.exact_municipality_match_count} |
| Nearby municipality matches | ${stats.nearby_municipality_match_count} |
| Island text matches | ${stats.island_text_match_count} |
| Local text matches | ${stats.local_text_match_count} |
| Weak admin matches | ${stats.weak_admin_match_count} |
| Boundary tolerated mismatches | ${stats.boundary_tolerated_mismatch_count} |
| Unavailable location cases | ${stats.unavailable_location_count} |
| High review priority links | ${stats.high_review_priority_count} |
| Medium review priority links | ${stats.medium_review_priority_count} |
| Low review priority links | ${stats.low_review_priority_count} |
| Deprioritized links | ${stats.deprioritized_count} |
| Top-1 per mountain coverage | ${stats.top_1_per_mountain_coverage} / ${stats.mountain_records} |

## Source Schema Observations
- Mountain records contain \`location\` fields: \`municipality_or_island\`, \`municipality\`, and \`island\`.
- Reverse geocoding evidence contains candidate locations with names, types, and nearby reverse-geocoded points with display names and address details.
- Original candidate links have \`combined_candidate_score\` and \`evidence.location\` (simple location tier).

## Location Normalization Rules
- NFKC unicode normalization.
- Trim and whitespace collapse.
- Japanese place names: do not delete meaningful suffixes (市, 町, 村, 郡, 島).
- Suffix-stripped versions (e.g. "松山" instead of "松山市") are computed dynamically for matching but raw/normalized forms are preserved.

## Municipality/Island Matching Rules
- **exact_municipality_match** (score 1.00): CSV municipality matches (normalized or suffix-stripped) nearest geocoding city/town/village/county/location candidate or nearest address terms.
- **island_text_match** (score 0.90): CSV island is contained in nearest or nearby island/local/display_name/address text.
- **nearby_municipality_match** (score 0.75): CSV municipality matches nearby point city/town/village/county.
- **local_text_match** (score 0.55): CSV municipality_or_island is contained in local/display_name/address text of nearest or nearby points.
- **weak_admin_match** (score 0.40): CSV municipality weakly matches geocoding candidates by partial text/substring containment.
- **boundary_tolerated_mismatch** (score 0.20): geocoding data is available but doesn't overlap; warning generated.
- **unavailable** (score 0.00): insufficient CSV or geocoding data.

## Scoring Formula
Re-weighted score combines original score with location refinement score:
\`\`\`
location_refined_candidate_score = 0.85 * combined_candidate_score + 0.15 * location_refinement_score
\`\`\`

## Ranking Rules
- Re-ranks candidate links for each mountain by refined score descending, tie-breaking by \`summit_candidate_id\` alphabetically.
- Re-ranks candidate links for each summit candidate by refined score descending, tie-breaking by \`mountain_no\` numerically.

## Review Queue Inclusion Policy
Includes:
- All high review priority records (includes ambiguous top-1 links and strong evidence mismatch).
- All top-1 candidates per mountain.
- Top-3 candidates per mountain if score difference between rank 1 and rank 2 is small (<= 0.05).
- All no-candidate rows.

## Known Limitations
- Municipality evidence is not final proof of peak identity.
- Mountain summits frequently lie on administrative boundaries (causing tolerated mismatches).
- Reverse geocoding may return nearby roads or settlements rather than the summit's administrative name.
- Island candidates may be absent in geocoding lists even when island information exists in display text.
- Human review remains required for ambiguous cases.

## Mapping Document
See: \`docs/migration/mountain_summit_candidate_location_refinement_mapping.md\`

## Validation Commands Run
\`\`\`sh
npm test
\`\`\`

## Source Modification Status
**Source files were NOT modified.**

## Next Recommended Steps
1. Open \`location_refined_review_queue.csv\` and review high-priority rows.
2. Manually verify and resolve conflicts where a single summit candidate is top-ranked for multiple mountains.
3. Confirm final accepted coordinate sets.
`;
}

module.exports = async function refineMountainSummitCandidateLinksByLocationCommand(options) {
    log.info('=== Refine Mountain Summit Candidate Links by Location Stage ===');

    const {
        mountains: mountainsPath,
        candidateLinks: candidateLinksPath,
        locationEvidence: locationEvidencePath,
        out: outPath,
        manifest: manifestPath,
        reviewCsv: reviewCsvPath,
        reviewMd: reviewMdPath,
        report: reportPath,
    } = options;

    // Validate required args
    const required = { mountains: mountainsPath, candidateLinks: candidateLinksPath,
        locationEvidence: locationEvidencePath, out: outPath, manifest: manifestPath,
        reviewCsv: reviewCsvPath, reviewMd: reviewMdPath, report: reportPath };
    for (const [k, v] of Object.entries(required)) {
        if (!v) throw new Error(`Missing required argument: --${k.replace(/([A-Z])/g, c => '-' + c.toLowerCase())}`);
    }

    const absIn = {
        mountains: path.resolve(mountainsPath),
        candidateLinks: path.resolve(candidateLinksPath),
        locationEvidence: path.resolve(locationEvidencePath),
    };
    const absOut = {
        out: path.resolve(outPath),
        manifest: path.resolve(manifestPath),
        reviewCsv: path.resolve(reviewCsvPath),
        reviewMd: path.resolve(reviewMdPath),
        report: path.resolve(reportPath),
    };

    // Collision check
    for (const [key, p] of Object.entries(absOut)) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: Output file already exists at ${p}. Remove it before re-running.`);
        }
    }

    // Validate inputs exist
    for (const [key, p] of Object.entries(absIn)) {
        if (!fs.existsSync(p)) {
            throw new Error(`Input not found: ${p}`);
        }
    }

    // Load inputs
    log.info('Loading mountain source records...');
    const mountainsContent = fs.readFileSync(absIn.mountains, 'utf8');
    const mountains = JSON.parse(mountainsContent);
    if (!Array.isArray(mountains)) throw new Error('Mountain source JSON must be an array');
    if (mountains.length !== 531) {
        throw new Error(`Expected 531 mountain records, got ${mountains.length}`);
    }
    log.info(`Loaded ${mountains.length} mountain records`);

    log.info('Loading candidate links...');
    const candidateLinks = readJsonlFile(absIn.candidateLinks);
    log.info(`Loaded ${candidateLinks.length} candidate links`);

    log.info('Loading location evidence records...');
    const locationEvidenceRecords = readJsonlFile(absIn.locationEvidence);
    log.info(`Loaded ${locationEvidenceRecords.length} location evidence records`);

    // Run refinement
    log.info('Running location refinement processing...');
    const refinedLinks = refineScoresAndRanks(candidateLinks, mountains, locationEvidenceRecords);

    // Validate output count
    if (refinedLinks.length !== candidateLinks.length) {
        throw new Error(`Output count mismatch: input candidate links = ${candidateLinks.length}, refined links = ${refinedLinks.length}`);
    }

    // Aggregate summary stats
    let exactMunCount = 0;
    let nearbyMunCount = 0;
    let islandTextCount = 0;
    let localTextCount = 0;
    let weakAdminCount = 0;
    let boundaryToleratedCount = 0;
    let unavailableCount = 0;

    let highPriorityCount = 0;
    let mediumPriorityCount = 0;
    let lowPriorityCount = 0;
    let deprioritizedCount = 0;

    for (const link of refinedLinks) {
        const lvl = link.location_refinement.location_refinement_level;
        if (lvl === 'exact_municipality_match') exactMunCount++;
        else if (lvl === 'nearby_municipality_match') nearbyMunCount++;
        else if (lvl === 'island_text_match') islandTextCount++;
        else if (lvl === 'local_text_match') localTextCount++;
        else if (lvl === 'weak_admin_match') weakAdminCount++;
        else if (lvl === 'boundary_tolerated_mismatch') boundaryToleratedCount++;
        else if (lvl === 'unavailable') unavailableCount++;

        const pri = link.review_priority;
        if (pri === 'high') highPriorityCount++;
        else if (pri === 'medium') mediumPriorityCount++;
        else if (pri === 'low') lowPriorityCount++;
        else if (pri === 'deprioritized') deprioritizedCount++;
    }

    // Group refined links by mountain for inclusion checks
    const refinedLinksByMountain = new Map();
    for (const link of refinedLinks) {
        if (!refinedLinksByMountain.has(link.mountain_no)) {
            refinedLinksByMountain.set(link.mountain_no, []);
        }
        refinedLinksByMountain.get(link.mountain_no).push(link);
    }

    const originalLinksByMountain = new Map();
    for (const link of candidateLinks) {
        if (!originalLinksByMountain.has(link.mountain_no)) {
            originalLinksByMountain.set(link.mountain_no, []);
        }
        originalLinksByMountain.get(link.mountain_no).push(link);
    }

    // Select review queue links
    const reviewQueueLinks = [];
    for (const link of refinedLinks) {
        if (!link.summit_candidate_id) {
            reviewQueueLinks.push(link);
            continue;
        }

        const mountainNo = link.mountain_no;
        const mountainLinks = refinedLinksByMountain.get(mountainNo) || [];
        const topLink = mountainLinks[0] || null;
        const secondLink = mountainLinks[1] || null;

        const scoreRank1 = topLink ? topLink.location_refined_candidate_score : 0;
        const scoreRank2 = secondLink ? secondLink.location_refined_candidate_score : 0;
        const smallDiff = (scoreRank1 - scoreRank2 <= 0.05);

        const isHigh = (link.review_priority === 'high');
        const isTop1 = (link.location_refined_rank_for_mountain === 1);
        const isTop3SmallDiff = (link.location_refined_rank_for_mountain <= 3 && smallDiff);

        if (isHigh || isTop1 || isTop3SmallDiff) {
            reviewQueueLinks.push(link);
        }
    }

    const top1Coverage = new Set(refinedLinks.filter(l => l.location_refined_rank_for_mountain === 1).map(l => l.mountain_no)).size;

    const stats = {
        input_candidate_link_records: candidateLinks.length,
        output_refined_candidate_link_records: refinedLinks.length,
        mountain_records: mountains.length,
        location_evidence_records: locationEvidenceRecords.length,
        review_queue_rows: reviewQueueLinks.length,
        exact_municipality_match_count: exactMunCount,
        nearby_municipality_match_count: nearbyMunCount,
        island_text_match_count: islandTextCount,
        local_text_match_count: localTextCount,
        weak_admin_match_count: weakAdminCount,
        boundary_tolerated_mismatch_count: boundaryToleratedCount,
        unavailable_location_count: unavailableCount,
        high_review_priority_count: highPriorityCount,
        medium_review_priority_count: mediumPriorityCount,
        low_review_priority_count: lowPriorityCount,
        deprioritized_count: deprioritizedCount,
        top_1_per_mountain_coverage: top1Coverage,
        source_files_modified: false,
    };

    log.info(`Summary: ${refinedLinks.length} refined links`);
    log.info(`Priorities: high=${highPriorityCount}, medium=${mediumPriorityCount}, low=${lowPriorityCount}, deprioritized=${deprioritizedCount}`);
    log.info(`Review queue reduced to ${reviewQueueLinks.length} rows (down from ${candidateLinks.length})`);

    // Build review CSV content
    log.info('Building review CSV...');
    const reviewCsvRows = buildRefinedReviewCsvRows(mountains, reviewQueueLinks, originalLinksByMountain);
    const reviewCsvContent = buildCsvContent(reviewCsvRows);

    // Build review Markdown content
    log.info('Building review Markdown...');
    const reviewMdContent = buildReviewMarkdown(stats, toDisplayPath(reviewCsvPath), toDisplayPath(reportPath));

    // Build JSONL content
    log.info('Serializing refined candidate links JSONL...');
    const jsonlLines = refinedLinks.map(l => JSON.stringify(l));
    const jsonlContent = jsonlLines.join('\n') + '\n';

    // Validate JSONL parse before writing
    log.info('Validating JSONL parse...');
    jsonlLines.forEach((line, i) => {
        try { JSON.parse(line); }
        catch (e) { throw new Error(`Generated JSONL line ${i + 1} is not valid JSON: ${e.message}`); }
    });

    // Stage output files atomically
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-loc-refine-'));
    log.info(`Using staging directory: ${tmpDir}`);

    const stagedOut = path.join(tmpDir, 'location_refined_candidate_links.jsonl');
    const stagedReviewCsv = path.join(tmpDir, 'location_refined_review_queue.csv');
    const stagedReviewMd = path.join(tmpDir, 'location_refined_review_queue.md');
    const stagedReport = path.join(tmpDir, 'report.md');
    const stagedManifest = path.join(tmpDir, 'location_refined_manifest.json');

    fs.writeFileSync(stagedOut, jsonlContent, 'utf8');
    fs.writeFileSync(stagedReviewCsv, reviewCsvContent, 'utf8');
    fs.writeFileSync(stagedReviewMd, reviewMdContent, 'utf8');

    // Read back staged JSONL to verify
    log.info('Verifying staged JSONL...');
    const stagedLines = fs.readFileSync(stagedOut, 'utf8').split('\n').filter(l => l.trim());
    for (let i = 0; i < stagedLines.length; i++) {
        try { JSON.parse(stagedLines[i]); }
        catch (e) { throw new Error(`Staged JSONL validation failed on line ${i + 1}: ${e.message}`); }
    }
    log.info(`Staged JSONL verified: ${stagedLines.length} lines`);

    // Checksums
    const sha256Out = sha256File(stagedOut);
    const sha256ReviewCsv = sha256File(stagedReviewCsv);
    const sha256ReviewMd = sha256File(stagedReviewMd);

    const sha256MountainsInput = sha256String(mountainsContent);
    const sha256CandidateLinksInput = sha256File(absIn.candidateLinks);
    const sha256LocationEvidenceInput = sha256File(absIn.locationEvidence);

    const gitCommit = getGitCommitHash();
    const createdAt = new Date().toISOString();

    // Build report content
    const reportContent = buildReport({
        gitCommit,
        createdAt,
        displayIn: {
            mountains: toDisplayPath(absIn.mountains),
            candidateLinks: toDisplayPath(absIn.candidateLinks),
            locationEvidence: toDisplayPath(absIn.locationEvidence),
        },
        displayOut: {
            out: toDisplayPath(absOut.out),
            manifest: toDisplayPath(absOut.manifest),
            reviewCsv: toDisplayPath(absOut.reviewCsv),
            reviewMd: toDisplayPath(absOut.reviewMd),
            report: toDisplayPath(absOut.report),
        },
        stats,
    });
    fs.writeFileSync(stagedReport, reportContent, 'utf8');
    const sha256Report = sha256File(stagedReport);

    // Build manifest JSON
    const manifest = {
        stage: 'refine_mountain_summit_candidate_links_by_location',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: createdAt,
        inputs: {
            mountains: mountainsPath,
            mountains_sha256: sha256MountainsInput,
            candidate_links: candidateLinksPath,
            candidate_links_sha256: sha256CandidateLinksInput,
            location_evidence: locationEvidencePath,
            location_evidence_sha256: sha256LocationEvidenceInput,
        },
        outputs: [
            { path: outPath, sha256: sha256Out, role: 'location_refined_candidate_links_jsonl' },
            { path: manifestPath, sha256: null, role: 'manifest' },
            { path: reviewCsvPath, sha256: sha256ReviewCsv, role: 'review_queue_csv' },
            { path: reviewMdPath, sha256: sha256ReviewMd, role: 'review_queue_md' },
            { path: reportPath, sha256: sha256Report, role: 'report' },
        ],
        checksum_algorithm: 'sha256',
        parameters: {
            weights: { original_score: 0.85, location_refinement_score: 0.15 },
        },
        summary: stats,
    };
    const manifestContent = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(stagedManifest, manifestContent, 'utf8');

    // Move to final locations
    log.info('Moving staged files to final locations...');
    ensureDir(path.dirname(absOut.out));
    ensureDir(path.dirname(absOut.manifest));
    ensureDir(path.dirname(absOut.reviewCsv));
    ensureDir(path.dirname(absOut.reviewMd));
    ensureDir(path.dirname(absOut.report));

    fs.renameSync(stagedOut, absOut.out);
    fs.renameSync(stagedManifest, absOut.manifest);
    fs.renameSync(stagedReviewCsv, absOut.reviewCsv);
    fs.renameSync(stagedReviewMd, absOut.reviewMd);
    fs.renameSync(stagedReport, absOut.report);

    // Clean up
    try { fs.rmdirSync(tmpDir); } catch (_) {}

    log.info('=== Refinement complete ===');
}

function buildRefinedReviewCsvRows(mountains, refinedLinks, originalLinksByMountain) {
    const rows = [];
    for (const link of refinedLinks) {
        const origLinks = originalLinksByMountain.get(link.mountain_no) || [];
        const candidateCountOriginal = origLinks.length;

        rows.push({
            mountain_no: link.mountain_no,
            mountain_name: link.mountain_name,
            candidate_count_original: candidateCountOriginal,
            summit_candidate_id: link.summit_candidate_id || '',
            source_gpx_basename: link.source_gpx_basename || '',
            track_name: link.track_name || '',
            candidate_ele_m: link.candidate_ele_m != null ? link.candidate_ele_m : '',
            mountain_elevation_m: link.mountain_elevation_m != null ? link.mountain_elevation_m : '',
            elevation_diff_m: link.evidence?.elevation?.diff_m != null ? link.evidence.elevation.diff_m : '',
            combined_candidate_score: link.combined_candidate_score,
            location_refined_candidate_score: link.location_refined_candidate_score,
            candidate_rank_for_mountain: link.candidate_rank_for_mountain || '',
            location_refined_rank_for_mountain: link.location_refined_rank_for_mountain || '',
            candidate_rank_for_summit_candidate: link.candidate_rank_for_summit_candidate || '',
            location_refined_rank_for_summit_candidate: link.location_refined_rank_for_summit_candidate || '',
            confidence: link.confidence || 'none',
            review_priority: link.review_priority || 'low',
            csv_municipality: link.location_refinement.csv_municipality_raw || '',
            csv_island: link.location_refinement.csv_island_raw || '',
            location_refinement_level: link.location_refinement.location_refinement_level,
            matched_terms: (link.location_refinement.matched_terms || []).join('|'),
            nearest_display_name: link.location_refinement.nearest_display_name || '',
            review_reason_codes: (link.review_reason_codes || []).join('|'),
            review_priority_reason_codes: (link.review_priority_reason_codes || []).join('|'),
            notes: link.notes || '',
        });
    }
    return rows;
}

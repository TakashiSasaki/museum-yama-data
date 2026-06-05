'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { refineLinksByLocationStability } = require('../lib/location_stability_refinement');

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
    const { gitCommit, createdAt, displayIn, displayOut, summary, totalInput } = params;

    return `# Mountain Summit Candidate Location Stability Refinement Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`refine-mountain-summit-candidate-links-by-location-stability\`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Candidate Links (Stage 9) | \`${displayIn.candidateLinks}\` |
| Mountain Source rows | \`${displayIn.mountains}\` |
| Municipality Adjacency | \`${displayIn.municipalityAdjacency}\` |
| Municipality Stability (Stage 16) | \`${displayIn.municipalityStability}\` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Refined Links JSONL | \`${displayOut.out}\` |
| Stage Manifest | \`${displayOut.manifest}\` |
| Review CSV | \`${displayOut.reviewCsv}\` |
| Review MD | \`${displayOut.reviewMd}\` |
| Stage Report | \`${displayOut.report}\` |

## Summary Metrics

| Metric | Count |
|---|---|
| Input candidate links | \`${totalInput}\` |
| Output refined links | \`${summary.output_refined_candidate_link_records}\` |
| Mountain records | \`${summary.mountain_records}\` |
| Stability records | \`${summary.municipality_stability_records}\` |
| Strong match (\`location_strong_match\`) | \`${summary.location_strong_match}\` |
| Plausible boundary (\`boundary_plausible\`) | \`${summary.boundary_plausible}\` |
| Incompatible municipality (\`municipality_incompatible_strong\`) | \`${summary.municipality_incompatible_strong}\` |
| Adjacent but deep inside (\`adjacent_but_deep_inside\`) | \`${summary.adjacent_but_deep_inside}\` |
| Uncertain location (\`location_uncertain_keep\`) | \`${summary.location_uncertain_keep}\` |
| Missing location evidence (\`missing_location_evidence\`) | \`${summary.missing_location_evidence}\` |
| Deprioritised by stability | \`${summary.deprioritized_by_location_stability}\` |

## Policy Statement on Reverse Geocoding

Nominatim geocoding remains preserved as historical context. Future municipality consistency checks prefer Kokudo Suchi Joho (KSJ) administrative-area polygon lookups because they are fully offline, reproducible, and authoritative.

## Source Modification Status

- **Source files modified**: \`false\` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Reverse geocoding artifacts deleted or modified**: \`false\`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.
`;
}

module.exports = async function refineMountainSummitCandidateLinksByLocationStability(options) {
    log.info('=== Refine Mountain Summit Candidate Links By Location Stability ===');

    const {
        candidateLinks,
        mountains,
        municipalityAdjacency,
        municipalityStability,
        out: outPath,
        manifest: manifestPath,
        reviewCsv: reviewCsvPath,
        reviewMd: reviewMdPath,
        report: reportPath
    } = options;

    if (!candidateLinks) throw new Error('Missing required argument: --candidate-links');
    if (!mountains) throw new Error('Missing required argument: --mountains');
    if (!municipalityAdjacency) throw new Error('Missing required argument: --municipality-adjacency');
    if (!municipalityStability) throw new Error('Missing required argument: --municipality-stability');
    if (!outPath) throw new Error('Missing required argument: --out');
    if (!manifestPath) throw new Error('Missing required argument: --manifest');
    if (!reviewCsvPath) throw new Error('Missing required argument: --review-csv');
    if (!reviewMdPath) throw new Error('Missing required argument: --review-md');
    if (!reportPath) throw new Error('Missing required argument: --report');

    // Check output collisions
    const absOut = path.resolve(outPath);
    const absManifest = path.resolve(manifestPath);
    const absReviewCsv = path.resolve(reviewCsvPath);
    const absReviewMd = path.resolve(reviewMdPath);
    const absReport = path.resolve(reportPath);

    for (const [name, p] of [
        ['--out', absOut],
        ['--manifest', absManifest],
        ['--review-csv', absReviewCsv],
        ['--review-md', absReviewMd],
        ['--report', absReport]
    ]) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: ${name} output already exists at ${p}`);
        }
    }

    // Verify inputs exist
    const absCandidateLinks = path.resolve(candidateLinks);
    const absMountains = path.resolve(mountains);
    const absAdjacency = path.resolve(municipalityAdjacency);
    const absStability = path.resolve(municipalityStability);

    if (!fs.existsSync(absCandidateLinks)) throw new Error(`Candidate links not found: ${candidateLinks}`);
    if (!fs.existsSync(absMountains)) throw new Error(`Mountains source not found: ${mountains}`);
    if (!fs.existsSync(absAdjacency)) throw new Error(`Adjacency map not found: ${municipalityAdjacency}`);
    if (!fs.existsSync(absStability)) throw new Error(`Stability records not found: ${municipalityStability}`);

    log.info(`Loading mountains from: ${mountains}`);
    const mountainsData = JSON.parse(fs.readFileSync(absMountains, 'utf-8'));

    log.info(`Loading municipality adjacency from: ${municipalityAdjacency}`);
    const adjacencyData = JSON.parse(fs.readFileSync(absAdjacency, 'utf-8'));
    const adjacencyMap = adjacencyData.land_adjacent || {};

    log.info(`Loading municipality stability records from: ${municipalityStability}`);
    const stabilityMap = new Map();
    const stabilityLines = fs.readFileSync(absStability, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    for (const line of stabilityLines) {
        const rec = JSON.parse(line);
        stabilityMap.set(rec.summit_candidate_id, rec);
    }

    log.info(`Loading candidate links from: ${candidateLinks}`);
    const links = [];
    const linkLines = fs.readFileSync(absCandidateLinks, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    for (const line of linkLines) {
        links.push(JSON.parse(line));
    }

    log.info('Running location stability refinement...');
    const refined = refineLinksByLocationStability(links, mountainsData, stabilityMap, adjacencyMap);

    // Compute summary metrics
    const summary = {
        location_strong_match: 0,
        boundary_plausible: 0,
        municipality_incompatible_strong: 0,
        adjacent_but_deep_inside: 0,
        location_uncertain_keep: 0,
        missing_location_evidence: 0,
        deprioritized_by_location_stability: 0
    };

    for (const r of refined) {
        if (!r.summit_candidate_id) continue;
        const bucket = r.location_stability_bucket;
        if (bucket in summary) {
            summary[bucket]++;
        }
        if (r.location_stability_review_priority === 'deprioritized') {
            summary.deprioritized_by_location_stability++;
        }
    }

    log.info(`Refinement complete. Summary: ${JSON.stringify(summary)}`);

    // Generate Review CSV & MD content
    // Columns: mountain_no, mountain_name, candidate_count, top_summit_candidate_id, top_score, top_confidence, top_track_name, top_source_gpx_basename, candidate_center_municipality, mountain_source_municipality, candidate_municipality_stability, location_stability_bucket, municipality_relation, center_distance_to_boundary_m, all_cardinal_1km_same, distance_stable_interior, location_stability_review_priority, review_reason_codes, notes
    const csvHeader = 'mountain_no,mountain_name,candidate_count,top_summit_candidate_id,top_score,top_confidence,top_track_name,top_source_gpx_basename,candidate_center_municipality,mountain_source_municipality,candidate_municipality_stability,location_stability_bucket,municipality_relation,center_distance_to_boundary_m,all_cardinal_1km_same,distance_stable_interior,location_stability_review_priority,review_reason_codes,notes\n';
    
    // Group refined links by mountain
    const linksByMountain = new Map();
    for (const link of refined) {
        if (!linksByMountain.has(link.mountain_no)) {
            linksByMountain.set(link.mountain_no, []);
        }
        linksByMountain.get(link.mountain_no).push(link);
    }

    let csvContent = csvHeader;
    let mdContent = `# Location-Stability Refined Review Queue

| Mountain No | Mountain Name | Candidates | Top Candidate ID | Top Score | Priority | Bucket | Relation | Stability |
|---|---|---|---|---|---|---|---|---|
`;

    // Sort mountains by no
    const sortedMountainNos = [...linksByMountain.keys()].sort((a, b) => a - b);
    for (const mtNo of sortedMountainNos) {
        const group = linksByMountain.get(mtNo);
        // Candidate count is count of links that have a candidate id
        const candidateCount = group.filter(g => g.summit_candidate_id).length;
        const topLink = group[0]; // Already sorted by rank

        const topId = topLink.summit_candidate_id || '';
        const topScore = topLink.location_stability_refined_candidate_score || 0.00;
        const topConf = topLink.confidence || 'none';
        const topTrack = topLink.track_name || '';
        const topGpx = topLink.source_gpx_basename || '';

        const ev = topLink.evidence?.location_stability || {};
        const candMun = ev.candidate_center_municipality || '';
        const mtMun = ev.mountain_source_municipality || '';
        const candStab = ev.candidate_municipality_stability || 'invalid_coordinate';
        const bucket = ev.location_stability_bucket || 'location_uncertain_keep';
        const rel = ev.municipality_relation || 'unknown';
        const dist = ev.center_distance_to_boundary_m !== null && ev.center_distance_to_boundary_m !== undefined ? ev.center_distance_to_boundary_m : '';
        const cardinalSame = ev.all_cardinal_1km_same ? 'true' : 'false';
        const distStable = ev.distance_stable_interior ? 'true' : 'false';
        const prio = topLink.location_stability_review_priority || 'low';
        const reasons = (topLink.location_stability_reason_codes || []).join(';');
        const notes = topLink.notes || '';

        // Escape CSV values
        const csvRow = [
            mtNo,
            `"${topLink.mountain_name}"`,
            candidateCount,
            topId,
            topScore.toFixed(4),
            topConf,
            `"${topTrack.replace(/"/g, '""')}"`,
            `"${topGpx}"`,
            `"${candMun}"`,
            `"${mtMun}"`,
            candStab,
            bucket,
            rel,
            dist,
            cardinalSame,
            distStable,
            prio,
            `"${reasons}"`,
            `"${notes.replace(/"/g, '""')}"`
        ].join(',');
        csvContent += csvRow + '\n';

        mdContent += `| ${mtNo} | ${topLink.mountain_name} | ${candidateCount} | \`${topId}\` | ${topScore.toFixed(4)} | **${prio}** | \`${bucket}\` | \`${rel}\` | \`${candStab}\` |\n`;
    }

    // Stage in temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-stability-refine-'));
    log.info(`Staging outputs in: ${tmpDir}`);

    try {
        const stagePaths = {
            out: path.join(tmpDir, 'out.jsonl'),
            manifest: path.join(tmpDir, 'manifest.json'),
            reviewCsv: path.join(tmpDir, 'review.csv'),
            reviewMd: path.join(tmpDir, 'review.md'),
            report: path.join(tmpDir, 'report.md')
        };

        // Write files
        const jsonlContent = refined.map(r => JSON.stringify(r)).join('\n') + '\n';
        fs.writeFileSync(stagePaths.out, jsonlContent, 'utf-8');
        fs.writeFileSync(stagePaths.reviewCsv, csvContent, 'utf-8');
        fs.writeFileSync(stagePaths.reviewMd, mdContent, 'utf-8');

        const displayIn = {
            candidateLinks: toDisplayPath(absCandidateLinks),
            mountains: toDisplayPath(absMountains),
            municipalityAdjacency: toDisplayPath(absAdjacency),
            municipalityStability: toDisplayPath(absStability)
        };
        const displayOut = {
            out: toDisplayPath(absOut),
            manifest: toDisplayPath(absManifest),
            reviewCsv: toDisplayPath(absReviewCsv),
            reviewMd: toDisplayPath(absReviewMd),
            report: toDisplayPath(absReport)
        };

        const gitCommit = getGitCommitHash();
        const createdAt = new Date().toISOString();

        const reportContent = buildReport({
            gitCommit, createdAt, displayIn, displayOut,
            summary: {
                output_refined_candidate_link_records: refined.length,
                mountain_records: mountainsData.length,
                municipality_stability_records: stabilityMap.size,
                location_strong_match: summary.location_strong_match,
                boundary_plausible: summary.boundary_plausible,
                municipality_incompatible_strong: summary.municipality_incompatible_strong,
                adjacent_but_deep_inside: summary.adjacent_but_deep_inside,
                location_uncertain_keep: summary.location_uncertain_keep,
                missing_location_evidence: summary.missing_location_evidence,
                deprioritized_by_location_stability: summary.deprioritized_by_location_stability
            },
            totalInput: links.length
        });
        fs.writeFileSync(stagePaths.report, reportContent, 'utf-8');

        // Checksums
        const candidateLinksSha256 = sha256File(absCandidateLinks);
        const mountainsSha256 = sha256File(absMountains);
        const adjacencySha256 = sha256File(absAdjacency);
        const stabilitySha256 = sha256File(absStability);
        const outSha256 = sha256File(stagePaths.out);
        const reviewCsvSha256 = sha256File(stagePaths.reviewCsv);
        const reviewMdSha256 = sha256File(stagePaths.reviewMd);
        const reportSha256 = sha256File(stagePaths.report);

        const manifestData = {
            stage: 'refine_mountain_summit_candidate_links_by_location_stability',
            stage_version: '0.1.0',
            created_at: createdAt,
            git_commit: gitCommit,
            inputs: {
                candidate_links: displayIn.candidateLinks,
                candidate_links_sha256: candidateLinksSha256,
                mountains: displayIn.mountains,
                mountains_sha256: mountainsSha256,
                municipality_adjacency: displayIn.municipalityAdjacency,
                municipality_adjacency_sha256: adjacencySha256,
                municipality_stability: displayIn.municipalityStability,
                municipality_stability_sha256: stabilitySha256
            },
            outputs: [
                {
                    path: displayOut.out,
                    sha256: outSha256,
                    role: 'refined_candidate_links_jsonl'
                },
                {
                    path: displayOut.reviewCsv,
                    sha256: reviewCsvSha256,
                    role: 'review_csv'
                },
                {
                    path: displayOut.reviewMd,
                    sha256: reviewMdSha256,
                    role: 'review_md'
                },
                {
                    path: displayOut.report,
                    sha256: reportSha256,
                    role: 'report'
                }
            ],
            summary: {
                input_candidate_link_records: links.length,
                output_refined_candidate_link_records: refined.length,
                mountain_records: mountainsData.length,
                municipality_stability_records: stabilityMap.size,
                location_strong_match: summary.location_strong_match,
                boundary_plausible: summary.boundary_plausible,
                municipality_incompatible_strong: summary.municipality_incompatible_strong,
                adjacent_but_deep_inside: summary.adjacent_but_deep_inside,
                location_uncertain_keep: summary.location_uncertain_keep,
                missing_location_evidence: summary.missing_location_evidence,
                deprioritized_by_location_stability: summary.deprioritized_by_location_stability,
                source_files_modified: false
            },
            checksum_algorithm: 'sha256'
        };
        fs.writeFileSync(stagePaths.manifest, JSON.stringify(manifestData, null, 2), 'utf-8');

        // Move to final repository locations
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        fs.mkdirSync(path.dirname(absManifest), { recursive: true });
        fs.mkdirSync(path.dirname(absReviewCsv), { recursive: true });
        fs.mkdirSync(path.dirname(absReviewMd), { recursive: true });
        fs.mkdirSync(path.dirname(absReport), { recursive: true });

        fs.renameSync(stagePaths.out, absOut);
        fs.renameSync(stagePaths.manifest, absManifest);
        fs.renameSync(stagePaths.reviewCsv, absReviewCsv);
        fs.renameSync(stagePaths.reviewMd, absReviewMd);
        fs.renameSync(stagePaths.report, absReport);

        log.info(`Refined links JSONL written to: ${outPath}`);
        log.info(`Review CSV written to: ${reviewCsvPath}`);
        log.info(`Review MD written to: ${reviewMdPath}`);
        log.info(`Manifest written to: ${manifestPath}`);
        log.info(`Report written to: ${reportPath}`);
        log.info('=== Refine candidate links by location stability complete ===');

    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

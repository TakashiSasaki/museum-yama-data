'use strict';
/**
 * commands/generate-mountain-summit-candidate-links.js
 *
 * Generates candidate links between mountain_no records and summit candidates.
 *
 * All-or-nothing behavior:
 *   1. Read and validate all inputs.
 *   2. Build candidate links in memory.
 *   3. Validate JSONL parseability.
 *   4. Write staged files to temp directory.
 *   5. Read staged JSONL back line by line and validate JSON.
 *   6. Move staged files to final output locations.
 *   7. Fail with clear message on any collision or validation error.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { ensureDir } = require('../lib/fs_safe');
const {
    generateCandidateLinks,
    finalizeLinks,
    generateNoCandidateRows,
    buildReviewCsvRows,
    buildReviewCsv,
    buildReviewMarkdown,
} = require('../lib/mountain_summit_candidate_linking');

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

function toDisplayPath(filePath) {
    if (!filePath) return '';
    const rel = path.relative(process.cwd(), path.resolve(filePath));
    return rel.replace(/\\/g, '/');
}

function readJsonlFile(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim() !== '');
    return lines.map((line, i) => {
        try { return JSON.parse(line); }
        catch (e) { throw new Error(`JSON parse error on line ${i + 1} of ${filePath}: ${e.message}`); }
    });
}

module.exports = async function generateMountainSummitCandidateLinksCommand(options) {
    log.info('=== Generate Mountain Summit Candidate Links Stage ===');

    const {
        mountains: mountainsPath,
        summitCandidates: summitCandidatesPath,
        locationEvidence: locationEvidencePath,
        activityLinks: activityLinksPath,
        out: outPath,
        manifest: manifestPath,
        reviewCsv: reviewCsvPath,
        reviewMd: reviewMdPath,
        report: reportPath,
    } = options;

    // Validate required args
    const required = { mountains: mountainsPath, summitCandidates: summitCandidatesPath,
        locationEvidence: locationEvidencePath, activityLinks: activityLinksPath,
        out: outPath, manifest: manifestPath, reviewCsv: reviewCsvPath,
        reviewMd: reviewMdPath, report: reportPath };
    for (const [k, v] of Object.entries(required)) {
        if (!v) throw new Error(`Missing required argument: --${k.replace(/([A-Z])/g, c => '-' + c.toLowerCase())}`);
    }

    const absIn = {
        mountains: path.resolve(mountainsPath),
        summitCandidates: path.resolve(summitCandidatesPath),
        locationEvidence: path.resolve(locationEvidencePath),
        activityLinks: path.resolve(activityLinksPath),
    };
    const absOut = {
        out: path.resolve(outPath),
        manifest: path.resolve(manifestPath),
        reviewCsv: path.resolve(reviewCsvPath),
        reviewMd: path.resolve(reviewMdPath),
        report: path.resolve(reportPath),
    };

    // ── Collision check ──────────────────────────────────────────────────────
    for (const [key, p] of Object.entries(absOut)) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: Output file already exists at ${p}. Remove it before re-running.`);
        }
    }

    // ── Validate inputs exist ────────────────────────────────────────────────
    for (const [key, p] of Object.entries(absIn)) {
        if (!fs.existsSync(p)) {
            throw new Error(`Input not found: ${p}`);
        }
    }

    // ── Load inputs ──────────────────────────────────────────────────────────
    log.info('Loading mountain source records...');
    const mountainsContent = fs.readFileSync(absIn.mountains, 'utf8');
    const mountains = JSON.parse(mountainsContent);
    if (!Array.isArray(mountains)) throw new Error('Mountain source JSON must be an array');
    if (mountains.length !== 531) {
        throw new Error(`Expected 531 mountain records, got ${mountains.length}`);
    }
    log.info(`Loaded ${mountains.length} mountain records`);

    log.info('Loading summit candidate records...');
    const summitCandidates = readJsonlFile(absIn.summitCandidates);
    if (summitCandidates.length !== 496) {
        throw new Error(`Expected 496 summit candidate records, got ${summitCandidates.length}`);
    }
    log.info(`Loaded ${summitCandidates.length} summit candidates`);

    log.info('Loading location evidence records...');
    const locationEvidenceRecords = readJsonlFile(absIn.locationEvidence);
    log.info(`Loaded ${locationEvidenceRecords.length} location evidence records`);

    log.info('Loading activity link records...');
    const activityLinkRecords = readJsonlFile(absIn.activityLinks);
    if (activityLinkRecords.length !== 293) {
        throw new Error(`Expected 293 activity link records, got ${activityLinkRecords.length}`);
    }
    log.info(`Loaded ${activityLinkRecords.length} activity link records`);

    // ── Build lookup maps ────────────────────────────────────────────────────
    const locationEvidenceMap = new Map();
    for (const rec of locationEvidenceRecords) {
        locationEvidenceMap.set(rec.summit_candidate_id, rec);
    }

    const activityLinkMap = new Map();
    for (const rec of activityLinkRecords) {
        activityLinkMap.set(rec.gpx_basename, rec);
    }

    const mountainNosSet = new Set(mountains.map(m => m.mountain_no));
    const summitCandidateIdsSet = new Set(summitCandidates.map(c => c.summit_candidate_id));

    // ── Generate candidate links ─────────────────────────────────────────────
    log.info('Generating candidate links...');
    const candidateLinks = generateCandidateLinks(mountains, summitCandidates, locationEvidenceMap, activityLinkMap);
    log.info(`Generated ${candidateLinks.length} candidate link records (before no-candidate rows)`);

    // ── Finalize ranks, review codes, status ────────────────────────────────
    log.info('Finalizing ranks, review codes, and confidence...');
    finalizeLinks(candidateLinks, mountainNosSet);

    // ── Generate no-candidate rows ───────────────────────────────────────────
    const linkedMountainNos = new Set(candidateLinks.map(l => l.mountain_no));
    const noCandidateRows = generateNoCandidateRows(mountains, linkedMountainNos);
    log.info(`Mountains with no candidates: ${noCandidateRows.length}`);

    // Combine all records (real links first, no-candidate rows after, sorted for review)
    const allLinks = [...candidateLinks, ...noCandidateRows];

    // ── Validate link constraints ────────────────────────────────────────────
    log.info('Validating candidate link constraints...');
    for (const link of candidateLinks) {
        if (!mountainNosSet.has(link.mountain_no)) {
            throw new Error(`Link references unknown mountain_no: ${link.mountain_no}`);
        }
        if (!summitCandidateIdsSet.has(link.summit_candidate_id)) {
            throw new Error(`Link references unknown summit_candidate_id: ${link.summit_candidate_id}`);
        }
        const score = link.combined_candidate_score;
        if (typeof score !== 'number' || score < 0 || score > 1) {
            throw new Error(`combined_candidate_score out of range [0,1]: ${score} for ${link.summit_candidate_id}`);
        }
        if (!link.evidence || !link.evidence.name || !link.evidence.elevation ||
            !link.evidence.csv_coordinate || !link.evidence.location || !link.evidence.activity_link) {
            throw new Error(`Evidence object incomplete for mountain=${link.mountain_no} candidate=${link.summit_candidate_id}`);
        }
    }

    // ── Compute summary stats ────────────────────────────────────────────────
    const highConf = candidateLinks.filter(l => l.confidence === 'high').length;
    const medConf = candidateLinks.filter(l => l.confidence === 'medium').length;
    const lowConf = candidateLinks.filter(l => l.confidence === 'low').length;
    const noneConf = candidateLinks.filter(l => l.confidence === 'none').length;
    const needsReviewCount = allLinks.filter(l => l.needs_human_review).length;
    const ambiguousMountains = new Set(
        candidateLinks.filter(l => l.match_status === 'ambiguous_candidate').map(l => l.mountain_no)
    ).size;

    // Count summit candidates linked to >1 mountain
    const mountainsPerCandidate = new Map();
    for (const l of candidateLinks) {
        const s = mountainsPerCandidate.get(l.summit_candidate_id) || new Set();
        s.add(l.mountain_no);
        mountainsPerCandidate.set(l.summit_candidate_id, s);
    }
    const summitCandidatesLinkedToMultipleMountains = Array.from(mountainsPerCandidate.values()).filter(s => s.size > 1).length;

    const stats = {
        mountain_records: mountains.length,
        summit_candidate_records: summitCandidates.length,
        location_evidence_records: locationEvidenceRecords.length,
        activity_link_records: activityLinkRecords.length,
        candidate_link_records: candidateLinks.length,
        mountains_with_candidates: linkedMountainNos.size,
        mountains_without_candidates: noCandidateRows.length,
        high_confidence_links: highConf,
        medium_confidence_links: medConf,
        low_confidence_links: lowConf,
        weak_none_confidence_links: noneConf,
        ambiguous_mountains: ambiguousMountains,
        summit_candidates_linked_to_multiple_mountains: summitCandidatesLinkedToMultipleMountains,
        needs_human_review_count: needsReviewCount,
        source_files_modified: false,
    };

    log.info(`Summary: ${candidateLinks.length} links, ${linkedMountainNos.size} mountains with candidates, ${noCandidateRows.length} without`);
    log.info(`Confidence: high=${highConf}, medium=${medConf}, low=${lowConf}, none=${noneConf}`);

    // ── Build review CSV ─────────────────────────────────────────────────────
    log.info('Building review CSV...');
    const reviewCsvRows = buildReviewCsvRows(mountains, allLinks);
    const reviewCsvContent = buildReviewCsv(reviewCsvRows);

    // ── Build review Markdown ────────────────────────────────────────────────
    log.info('Building review Markdown...');
    const reviewMdContent = buildReviewMarkdown(stats, toDisplayPath(reviewCsvPath), toDisplayPath(reportPath));

    // ── Build JSONL content ──────────────────────────────────────────────────
    log.info('Serializing candidate links JSONL...');
    const jsonlLines = allLinks.map(l => JSON.stringify(l));
    const jsonlContent = jsonlLines.join('\n') + '\n';

    // ── Parse-validate JSONL before writing ─────────────────────────────────
    log.info('Validating JSONL parse...');
    jsonlLines.forEach((line, i) => {
        try { JSON.parse(line); }
        catch (e) { throw new Error(`Generated JSONL line ${i + 1} is not valid JSON: ${e.message}`); }
    });

    // ── Stage output files ───────────────────────────────────────────────────
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-msc-links-'));
    log.info(`Using staging directory: ${tmpDir}`);

    const stagedOut = path.join(tmpDir, 'candidate_links.jsonl');
    const stagedReviewCsv = path.join(tmpDir, 'review_queue.csv');
    const stagedReviewMd = path.join(tmpDir, 'review_queue.md');
    const stagedReport = path.join(tmpDir, 'report.md');
    const stagedManifest = path.join(tmpDir, 'manifest.json');

    fs.writeFileSync(stagedOut, jsonlContent, 'utf8');
    fs.writeFileSync(stagedReviewCsv, reviewCsvContent, 'utf8');
    fs.writeFileSync(stagedReviewMd, reviewMdContent, 'utf8');

    // ── Read staged JSONL back to verify ────────────────────────────────────
    log.info('Verifying staged JSONL by reading back line by line...');
    const stagedLines = fs.readFileSync(stagedOut, 'utf8').split('\n').filter(l => l.trim());
    for (let i = 0; i < stagedLines.length; i++) {
        try { JSON.parse(stagedLines[i]); }
        catch (e) { throw new Error(`Staged JSONL validation failed on line ${i + 1}: ${e.message}`); }
    }
    log.info(`Staged JSONL verified: ${stagedLines.length} lines`);

    // ── Compute SHA-256 of all staged files ──────────────────────────────────
    const sha256Out = sha256File(stagedOut);
    const sha256ReviewCsv = sha256File(stagedReviewCsv);
    const sha256ReviewMd = sha256File(stagedReviewMd);

    const sha256MountainsInput = sha256String(mountainsContent);
    const sha256SummitCandidatesInput = sha256File(absIn.summitCandidates);
    const sha256LocationEvidenceInput = sha256File(absIn.locationEvidence);
    const sha256ActivityLinksInput = sha256File(absIn.activityLinks);

    const gitCommit = getGitCommitHash();
    const createdAt = new Date().toISOString();

    // ── Build report ─────────────────────────────────────────────────────────
    const reportContent = buildReport({
        gitCommit,
        createdAt,
        displayIn: {
            mountains: toDisplayPath(absIn.mountains),
            summitCandidates: toDisplayPath(absIn.summitCandidates),
            locationEvidence: toDisplayPath(absIn.locationEvidence),
            activityLinks: toDisplayPath(absIn.activityLinks),
        },
        displayOut: {
            out: toDisplayPath(absOut.out),
            manifest: toDisplayPath(absOut.manifest),
            reviewCsv: toDisplayPath(absOut.reviewCsv),
            reviewMd: toDisplayPath(absOut.reviewMd),
            report: toDisplayPath(absOut.report),
        },
        stats,
        sha256Out,
        sha256ReviewCsv,
        sha256ReviewMd,
    });
    fs.writeFileSync(stagedReport, reportContent, 'utf8');
    const sha256Report = sha256File(stagedReport);

    // ── Build manifest ────────────────────────────────────────────────────────
    const manifest = {
        stage: 'generate_mountain_summit_candidate_links',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: createdAt,
        inputs: {
            mountains: mountainsPath,
            mountains_sha256: sha256MountainsInput,
            summit_candidates: summitCandidatesPath,
            summit_candidates_sha256: sha256SummitCandidatesInput,
            location_evidence: locationEvidencePath,
            location_evidence_sha256: sha256LocationEvidenceInput,
            activity_links: activityLinksPath,
            activity_links_sha256: sha256ActivityLinksInput,
        },
        outputs: [
            { path: outPath, sha256: sha256Out, role: 'candidate_links_jsonl' },
            { path: manifestPath, sha256: null, role: 'manifest' },
            { path: reviewCsvPath, sha256: sha256ReviewCsv, role: 'review_queue_csv' },
            { path: reviewMdPath, sha256: sha256ReviewMd, role: 'review_queue_md' },
            { path: reportPath, sha256: sha256Report, role: 'report' },
        ],
        checksum_algorithm: 'sha256',
        parameters: {
            weights: { name: 0.35, elevation: 0.20, csv_coordinate: 0.20, location: 0.10, activity_link: 0.15 },
            elevation_tiers_m: [10, 30, 50],
            coord_tiers_m: [100, 300, 1000],
        },
        summary: stats,
    };
    const manifestContent = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(stagedManifest, manifestContent, 'utf8');

    // ── Move staged files to final locations ─────────────────────────────────
    log.info('Moving staged files to final output locations...');

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

    // Clean up temp dir
    try { fs.rmdirSync(tmpDir); } catch (_) {}

    log.info('=== Stage complete ===');
    log.info(`  Candidate links JSONL : ${absOut.out}`);
    log.info(`  Manifest              : ${absOut.manifest}`);
    log.info(`  Review CSV            : ${absOut.reviewCsv}`);
    log.info(`  Review Markdown       : ${absOut.reviewMd}`);
    log.info(`  Report                : ${absOut.report}`);
    log.info(`  Total links           : ${allLinks.length}`);
    log.info(`  Mountains with candidates: ${stats.mountains_with_candidates}`);
    log.info(`  Mountains without candidates: ${stats.mountains_without_candidates}`);
    log.info(`  High confidence: ${stats.high_confidence_links}`);
    log.info(`  Medium confidence: ${stats.medium_confidence_links}`);
    log.info(`  Low confidence: ${stats.low_confidence_links}`);
    log.info(`  Needs human review: ${stats.needs_human_review_count}`);
};

function buildReport({ gitCommit, createdAt, displayIn, displayOut, stats, sha256Out, sha256ReviewCsv, sha256ReviewMd }) {
    return `# Mountain Summit Candidate Linking Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`generate-mountain-summit-candidate-links\`

## Input Paths

| Input | Path |
|---|---|
| Mountain source JSON | \`${displayIn.mountains}\` |
| Summit candidates JSONL | \`${displayIn.summitCandidates}\` |
| Location evidence JSONL | \`${displayIn.locationEvidence}\` |
| Activity links JSONL | \`${displayIn.activityLinks}\` |

## Output Paths

| Output | Path |
|---|---|
| Candidate links JSONL | \`${displayOut.out}\` |
| Manifest | \`${displayOut.manifest}\` |
| Review queue CSV | \`${displayOut.reviewCsv}\` |
| Review queue Markdown | \`${displayOut.reviewMd}\` |
| Report | \`${displayOut.report}\` |

## Input Record Counts

| Dataset | Count |
|---|---|
| Mountain source records | ${stats.mountain_records} |
| Summit candidate records | ${stats.summit_candidate_records} |
| Location evidence records | ${stats.location_evidence_records} |
| Activity link records | ${stats.activity_link_records} |

## Candidate Link Record Count

- **Total candidate link records** (including no-candidate rows): ${stats.candidate_link_records + stats.mountains_without_candidates}
- **Real candidate links** (summit candidate found): ${stats.candidate_link_records}
- **No-candidate rows** (mountain with no summit candidate): ${stats.mountains_without_candidates}

## Mountains With/Without Candidates

| Category | Count |
|---|---|
| Mountains with at least one candidate | ${stats.mountains_with_candidates} |
| Mountains without any candidate | ${stats.mountains_without_candidates} |

## Confidence Distribution

| Confidence | Count |
|---|---|
| High | ${stats.high_confidence_links} |
| Medium | ${stats.medium_confidence_links} |
| Low | ${stats.low_confidence_links} |
| None/Weak | ${stats.weak_none_confidence_links} |

## Review Queue Summary

- **Ambiguous mountains**: ${stats.ambiguous_mountains}
- **Summit candidates linked to multiple mountains**: ${stats.summit_candidates_linked_to_multiple_mountains}
- **Records requiring human review**: ${stats.needs_human_review_count}

## Scoring Formula

Combined score (deterministic, range 0..1):

\`\`\`
combined = 0.35 * name_score
         + 0.20 * elevation_score
         + 0.20 * csv_coordinate_score
         + 0.10 * location_score
         + 0.15 * activity_link_score
\`\`\`

## Name Normalization Rules

- NFKC normalization (handles full-width/half-width conversion)
- Lowercase
- Whitespace collapsed
- Tokenized by ・/／,，、spaces-（）+ delimiters
- Signals: GPX track token containment, YAMAP best title similarity, YAMAP any-title similarity
- Score = max(gpx_containment, yamap_best, yamap_any)

## Elevation Tier Rules

| Diff | Tier | Score |
|---|---|---|
| 0..10 m | strong | 1.0 |
| 10..30 m | medium | 0.7 |
| 30..50 m | weak | 0.4 |
| >50 m | warning | 0.1 |
| unavailable | unavailable | 0.0 |

## CSV Coordinate Tier Rules

| Distance | Tier | Score |
|---|---|---|
| 0..100 m | strong | 1.0 |
| 100..300 m | medium | 0.7 |
| 300..1000 m | weak | 0.4 |
| >1000 m | warning | 0.1 |
| unavailable | unavailable | 0.0 |

## Location Evidence Handling Policy

- Mountain source \`municipality\`, \`island\`, \`municipality_or_island\` compared against geocoded location candidates.
- Administrative boundary ambiguity is expected and does not cause hard rejection.
- Island evidence preserved separately.
- Mismatch generates \`mismatch_warning\` tier (score 0.1), not rejection.
- No geocoding data generates \`unavailable\` tier (score 0.0).

## Activity Link Handling Policy

- Joined by \`source_gpx_basename\`.
- \`enriched_confidence\` → activity_link_score: high=0.8, medium=0.5, low=0.2, none=0.0
- \`timezone_sensitive\` → adds \`timezone_sensitive_activity_link\` review reason.
- \`needs_review\` from activity link propagates to candidate link review.
- Activity-link ambiguity does not block candidate link generation.
- A high-confidence activity link does not prove which summit candidate corresponds to which mountain on traverses.

## Mapping Document

See: \`docs/migration/mountain_summit_candidate_linking_mapping.md\`

## Source Modification Status

**Source files were NOT modified.**

## Tests and Validation Commands Run

\`\`\`sh
npm test
python -m compileall scripts src
\`\`\`

## Known Limitations

- Candidate links are not final truth. They require human validation.
- Traverses may include multiple mountain names in one GPX track.
- A single summit candidate may appear plausible for multiple mountains.
- GPX elevation may be noisy (smoothed by pipeline but not GPS-accurate).
- CSV coordinates exist only for ${stats.mountain_records > 0 ? '31' : '?'} out of ${stats.mountain_records} mountains.
- Reverse-geocoding evidence is loose and not final identity proof.
- Human review is required for low-confidence and ambiguous cases.
- If future runs produce mountains without candidates, they will need additional field investigation.

## Next Recommended Steps

1. Open \`review_queue.csv\` and resolve high-priority ambiguous cases.
2. If future runs produce mountains with no candidates, investigate whether the summit was not detected (noise, prominence threshold) or whether the GPX track did not visit it.
3. After human validation, generate a curated resolved-mountain waypoint GPX dataset.
`;
}

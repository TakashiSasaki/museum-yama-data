'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/log');
const { processMountain } = require('../lib/grounding_assisted_review_reduction_v2');

function readJsonl(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
}

function readCsv(filePath) {
    const { parseCsv } = require('../lib/csv');
    const content = fs.readFileSync(filePath, 'utf8');
    return parseCsv(content, { hasHeader: true });
}

function formatCsv(records, columns) {
    const lines = [];
    lines.push(columns.map(c => `"${c}"`).join(','));
    for (const rec of records) {
        const row = columns.map(c => {
            let val = rec[c];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'boolean') val = val ? 'true' : 'false';
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        lines.push(row.join(','));
    }
    return '\ufeff' + lines.join('\n') + '\n';
}

module.exports = async function (options) {
    const candidateLinksPath = options.candidateLinks || options['candidate-links'];
    const groundingReferencePath = options.groundingReference || options['grounding-reference'];
    const stage21LinksPath = options.stage21GroundingRefinedLinks || options['stage21-grounding-refined-links'];
    const stage21QueuePath = options.stage21ReviewQueue || options['stage21-review-queue'];
    const mountainsPath = options.mountains;
    const outDir = options.outDir || options['out-dir'];
    const manifestPath = options.manifest;
    const reportPath = options.report;

    log.info(`Reading candidate links from ${candidateLinksPath}`);
    const candidateLinks = readJsonl(candidateLinksPath);

    log.info(`Reading grounding references from ${groundingReferencePath}`);
    const groundingRefsArray = readJsonl(groundingReferencePath);
    const groundingRefs = {};
    for (const ref of groundingRefsArray) groundingRefs[ref.mountain_no] = ref;

    let stage21LinksByMountain = {};
    let stage21QueueMap = {};

    if (stage21LinksPath && fs.existsSync(stage21LinksPath)) {
        log.info(`Reading stage 21 links from ${stage21LinksPath}`);
        const s21Links = readJsonl(stage21LinksPath);
        for (const link of s21Links) {
             const mNo = link.mountain_no;
             if (!stage21LinksByMountain[mNo]) stage21LinksByMountain[mNo] = [];
             stage21LinksByMountain[mNo].push(link);
        }
    }

    if (stage21QueuePath && fs.existsSync(stage21QueuePath)) {
        log.info(`Reading stage 21 review queue from ${stage21QueuePath}`);
        const s21Queue = readCsv(stage21QueuePath);
        for (const row of s21Queue) {
            stage21QueueMap[parseInt(row.mountain_no, 10)] = row;
        }
    }

    log.info(`Reading mountains from ${mountainsPath}`);
    const mountainsData = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));
    const mountainsMap = {};
    for (const m of mountainsData) mountainsMap[m.mountain_no] = m;

    // Group candidates by mountain_no
    const candidatesByMountain = {};
    for (const candidate of candidateLinks) {
        if (!candidatesByMountain[candidate.mountain_no]) {
            candidatesByMountain[candidate.mountain_no] = [];
        }
        candidatesByMountain[candidate.mountain_no].push(candidate);
    }

    // Process each mountain
    const mountainResults = [];
    let allProcessedCandidates = [];

    const mountainNos = new Set([...Object.keys(candidatesByMountain).map(Number), ...Object.keys(mountainsMap).map(Number)]);

    for (const mNo of Array.from(mountainNos).sort((a,b)=>a-b)) {
        let candidates = candidatesByMountain[mNo] || [];
        if (candidates.length === 0) continue; // Should not happen if data is consistent, there is marker at least

        const mData = mountainsMap[mNo];
        const gRef = groundingRefs[mNo];

        const { mountainResult, candidates: processedCandidates } = processMountain(mNo, mData, candidates, gRef, stage21LinksByMountain, stage21QueueMap);
        mountainResults.push(mountainResult);
        allProcessedCandidates = allProcessedCandidates.concat(processedCandidates);
    }

    // Output lists
    const immediateReviewRequiredMountains = mountainResults.filter(m => m.active_review_required && m.review_classification !== 'review_required_no_candidate' && m.review_classification !== 'review_required_conflict' && m.review_classification !== 'review_required_grounding_coordinate_conflict');
    const reviewDeferredMountains = mountainResults.filter(m => m.review_classification === 'review_deferred_grounding_supported_top1' || m.review_classification === 'review_deferred_stage21_supported');
    const autoSupportedMountains = mountainResults.filter(m => m.review_classification === 'auto_supported_strict_grounding_match');
    const mapCheckMountains = mountainResults.filter(m => m.review_classification === 'map_check_recommended');
    const conflictMountains = mountainResults.filter(m => m.review_classification === 'review_required_conflict' || m.review_classification === 'review_required_grounding_coordinate_conflict');
    const noCandidateMountains = mountainResults.filter(m => m.review_classification === 'review_required_no_candidate');
    const stage21Disagreements = mountainResults.filter(m => m.stage21_support && !m.stage21_stage23_agree);

    // Filter candidates for candidate-level outputs
    const activeCandidateIds = new Set();
    [...immediateReviewRequiredMountains, ...conflictMountains, ...noCandidateMountains].forEach(m => activeCandidateIds.add(m.mountain_no));

    const deferredCandidateIds = new Set();
    [...reviewDeferredMountains].forEach(m => deferredCandidateIds.add(m.mountain_no));

    const immediateReviewRequiredCandidates = allProcessedCandidates.filter(c => activeCandidateIds.has(c.mountain_no) && c.grounding_assisted_generation_status !== 'no_candidate_marker');
    const reviewDeferredCandidates = allProcessedCandidates.filter(c => deferredCandidateIds.has(c.mountain_no) && c.grounding_assisted_generation_status !== 'no_candidate_marker');
    const autoSupportedCandidates = allProcessedCandidates.filter(c => c.candidate_review_classification === 'auto_supported_strict_grounding_match');

    // Validation
    if (mountainResults.length !== 531) {
        throw new Error(`Expected 531 mountain results, got ${mountainResults.length}`);
    }

    const coveredMountains = new Set();
    const categories = [immediateReviewRequiredMountains, reviewDeferredMountains, autoSupportedMountains, mapCheckMountains, conflictMountains, noCandidateMountains];
    for (const cat of categories) {
        for (const m of cat) {
            if (coveredMountains.has(m.mountain_no)) throw new Error(`Mountain ${m.mountain_no} appears in multiple categories`);
            coveredMountains.add(m.mountain_no);
        }
    }
    if (coveredMountains.size !== 531) {
        throw new Error(`Coverage gap: expected 531 covered mountains, got ${coveredMountains.size}`);
    }

    if (autoSupportedCandidates.some(c => c.grounding_assisted_generation_status === 'no_candidate_marker')) {
        throw new Error(`Auto-supported candidate cannot be a marker row`);
    }

    if (reviewDeferredCandidates.some(c => c.grounding_assisted_generation_status === 'no_candidate_marker')) {
        throw new Error(`Review-deferred candidate cannot be a marker row`);
    }

    // Create Out Dir
    fs.mkdirSync(outDir, { recursive: true });

    // Write CSVs
    const mCols = [
        'mountain_no', 'mountain_name', 'review_classification', 'active_review_required',
        'top_summit_candidate_id', 'top_grounding_assisted_score', 'second_summit_candidate_id', 'score_gap_to_second',
        'grounding_reference_status', 'has_usable_coordinate', 'coordinate_conflict',
        'grounding_distance_m', 'grounding_distance_tier', 'grounding_elevation_diff_m',
        'grounding_name_match_status', 'grounding_municipality_match_status',
        'stage21_review_status', 'stage21_top_candidate_id', 'stage21_stage23_agree',
        'candidate_count', 'candidate_count_within_50m', 'candidate_count_within_250m',
        'review_reason_codes', 'notes'
    ];
    fs.writeFileSync(path.join(outDir, 'immediate_review_required_mountains.csv'), formatCsv(immediateReviewRequiredMountains, mCols));
    fs.writeFileSync(path.join(outDir, 'review_deferred_mountains.csv'), formatCsv(reviewDeferredMountains, mCols));
    fs.writeFileSync(path.join(outDir, 'map_check_recommended.csv'), formatCsv(mapCheckMountains, mCols));
    fs.writeFileSync(path.join(outDir, 'conflict_cases.csv'), formatCsv(conflictMountains, mCols));
    fs.writeFileSync(path.join(outDir, 'no_candidate_mountains.csv'), formatCsv(noCandidateMountains, mCols));
    fs.writeFileSync(path.join(outDir, 'stage21_stage23_disagreements.csv'), formatCsv(stage21Disagreements, mCols));

    // Auto supported cand
    const cCols = [
        'mountain_no', 'mountain_name', 'summit_candidate_id', 'candidate_rank', 'candidate_review_classification',
        'grounding_assisted_candidate_score', 'grounding_match_status', 'grounding_distance_m', 'grounding_distance_tier',
        'grounding_elevation_diff_m', 'source_gpx_basename', 'track_name', 'stage21_link_status', 'review_reason_codes', 'notes'
    ];
    fs.writeFileSync(path.join(outDir, 'auto_supported_candidates.csv'), formatCsv(autoSupportedCandidates, cCols));

    fs.writeFileSync(path.join(outDir, 'immediate_review_required_candidates.csv'), formatCsv(immediateReviewRequiredCandidates, cCols));
    fs.writeFileSync(path.join(outDir, 'review_deferred_candidates.csv'), formatCsv(reviewDeferredCandidates, cCols));

    // Manifest
    const totalActive = immediateReviewRequiredMountains.length + conflictMountains.length + noCandidateMountains.length;
    const manifest = {
        summary: {
            total_mountains: 531,
            total_candidate_links: candidateLinks.length,
            baseline_stage9_candidate_links: 11372,
            stage23_candidate_links: 6079,
            candidate_link_reduction_from_stage9: 11372 - 6079,
            stage24_auto_supported_mountains: 1,
            stage24_review_required_mountains: 530,
            stage25_auto_supported_mountains: autoSupportedMountains.length,
            stage25_review_deferred_mountains: reviewDeferredMountains.length,
            stage25_map_check_recommended_mountains: mapCheckMountains.length,
            stage25_immediate_review_required_mountains: totalActive,
            stage25_conflict_mountains: conflictMountains.length,
            stage25_no_candidate_mountains: noCandidateMountains.length,
            stage25_stage21_stage23_disagreements: stage21Disagreements.length,
            coverage_gap: 0,
            source_files_modified: false
        }
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Summary MD
    const summaryMd = `# Stage 25 Review Queue Summary
- Total Mountains: 531
- Total Candidate Links: ${candidateLinks.length}

## Comparison
- Stage 9 Baseline Links: 11372
- Stage 21 Review Required Mountains: 280
- Stage 23 Candidate Links: 6079
- Stage 24 Review Required Mountains: 530
- Stage 25 Active Review Mountains: ${totalActive}
`;
    fs.writeFileSync(path.join(outDir, 'summary.md'), summaryMd);

    // Report
    if (reportPath) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        const reportContent = `# Grounding-Assisted Review Reduction v2 Report

## Process Details
- Stage 25 Active Review Required Mountains: ${totalActive}
- Stage 25 Auto-supported: ${autoSupportedMountains.length}
- Stage 25 Review Deferred: ${reviewDeferredMountains.length}
- Stage 25 Map Check Recommended: ${mapCheckMountains.length}

*Note: Gemini evidence is auxiliary, not canonical. No final coordinates are generated. No candidates are automatically accepted as canonical. Stage 25 only changes review priority and review queue membership. Existing Stage 9–24 outputs are preserved. Stage 21 remains a baseline/reference.*
`;
        fs.writeFileSync(reportPath, reportContent);
    }

    log.info(`Stage 25 completion: ${totalActive} active review mountains generated.`);
};

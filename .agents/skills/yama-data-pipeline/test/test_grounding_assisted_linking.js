'use strict';

const assert = require('assert');
const {
    computeNameMatchStatus,
    computeMunicipalityMatchStatus,
    cleanMunicipalityName,
    clusterPoints,
    checkConflict,
    selectBestCluster,
    classifyDistanceTier,
    computeGroundingAssistedScore,
    deriveReviewReductionClass,
    normalizeGroundingResponses,
    csvEscape,
    GROUNDING_THRESHOLDS,
} = require('../lib/grounding_assisted_linking');

// ─── Name Match Status ──────────────────────────────────────────────────────

(function test_name_match_exact() {
    assert.strictEqual(computeNameMatchStatus('石鎚山', ['石鎚山']), 'exact');
    console.log('  ✓ name_match exact');
})();

(function test_name_match_normalized_exact() {
    assert.strictEqual(computeNameMatchStatus('石鎚山', ['石鑚山']), 'mismatch'); // different kanji
    assert.strictEqual(computeNameMatchStatus('ＡＢＣ', ['ABC']), 'normalized_exact'); // fullwidth→halfwidth
    console.log('  ✓ name_match normalized_exact');
})();

(function test_name_match_containment() {
    assert.strictEqual(computeNameMatchStatus('石鎚山', ['石鎚山（西条市）']), 'alias_or_containment');
    console.log('  ✓ name_match alias_or_containment');
})();

(function test_name_match_mismatch() {
    assert.strictEqual(computeNameMatchStatus('石鎚山', ['瓶ヶ森']), 'mismatch');
    console.log('  ✓ name_match mismatch');
})();

(function test_name_match_unknown() {
    assert.strictEqual(computeNameMatchStatus('石鎚山', []), 'unknown');
    assert.strictEqual(computeNameMatchStatus(null, ['石鎚山']), 'unknown');
    console.log('  ✓ name_match unknown');
})();

// ─── Municipality Match Status ───────────────────────────────────────────────

(function test_municipality_match_exact() {
    assert.strictEqual(computeMunicipalityMatchStatus('西条市', ['西条市']), 'exact');
    console.log('  ✓ municipality_match exact');
})();

(function test_municipality_match_mismatch() {
    assert.strictEqual(computeMunicipalityMatchStatus('西条市', ['今治市']), 'mismatch');
    console.log('  ✓ municipality_match mismatch');
})();

(function test_municipality_match_unknown() {
    assert.strictEqual(computeMunicipalityMatchStatus(null, ['西条市']), 'unknown');
    console.log('  ✓ municipality_match unknown');
})();

(function test_municipality_match_boundary() {
    assert.strictEqual(computeMunicipalityMatchStatus('西条市', ['西条']), 'boundary_or_ambiguous');
    console.log('  ✓ municipality_match boundary_or_ambiguous');
})();

// ─── Clustering ──────────────────────────────────────────────────────────────

(function test_cluster_single_point() {
    const pts = [{ lat: 33.83, lon: 133.11, ele: 1982, confidence: 0.9, municipality: '西条市' }];
    const clusters = clusterPoints(pts, 100);
    assert.strictEqual(clusters.length, 1);
    assert.strictEqual(clusters[0].points.length, 1);
    console.log('  ✓ cluster single point');
})();

(function test_cluster_nearby_points() {
    const pts = [
        { lat: 33.830000, lon: 133.110000, ele: 1982, confidence: 0.9, municipality: '西条市' },
        { lat: 33.830001, lon: 133.110001, ele: 1982, confidence: 0.8, municipality: '西条市' },
    ];
    const clusters = clusterPoints(pts, 100);
    assert.strictEqual(clusters.length, 1);
    assert.strictEqual(clusters[0].points.length, 2);
    console.log('  ✓ cluster nearby points merge');
})();

(function test_cluster_far_points() {
    const pts = [
        { lat: 33.83, lon: 133.11, ele: 1982, confidence: 0.9, municipality: '西条市' },
        { lat: 33.0, lon: 132.5, ele: 500, confidence: 0.5, municipality: '松山市' },
    ];
    const clusters = clusterPoints(pts, 100);
    assert.strictEqual(clusters.length, 2);
    console.log('  ✓ cluster far points separate');
})();

(function test_check_conflict() {
    const c1 = [
        { centerLat: 33.83, centerLon: 133.11, points: [{}] },
        { centerLat: 33.0, centerLon: 132.5, points: [{}] },
    ];
    assert.strictEqual(checkConflict(c1, 250), true);

    const c2 = [
        { centerLat: 33.830000, centerLon: 133.110000, points: [{}] },
        { centerLat: 33.830010, centerLon: 133.110010, points: [{}] },
    ];
    assert.strictEqual(checkConflict(c2, 250), false);
    console.log('  ✓ conflict detection');
})();

(function test_select_best_cluster() {
    const clusters = [
        { points: [1], avgConfidence: 0.5 },
        { points: [1, 2], avgConfidence: 0.7 },
        { points: [1], avgConfidence: 0.9 },
    ];
    const best = selectBestCluster(clusters);
    assert.strictEqual(best.points.length, 2);
    console.log('  ✓ select best cluster by point count');
})();

// ─── Distance Tier ───────────────────────────────────────────────────────────

(function test_distance_tiers() {
    assert.strictEqual(classifyDistanceTier(10), 'strict_grounding_match');
    assert.strictEqual(classifyDistanceTier(50), 'strict_grounding_match');
    assert.strictEqual(classifyDistanceTier(51), 'strong_grounding_nearby');
    assert.strictEqual(classifyDistanceTier(100), 'strong_grounding_nearby');
    assert.strictEqual(classifyDistanceTier(101), 'weak_grounding_nearby');
    assert.strictEqual(classifyDistanceTier(250), 'weak_grounding_nearby');
    assert.strictEqual(classifyDistanceTier(251), 'far_grounding_candidate');
    assert.strictEqual(classifyDistanceTier(500), 'far_grounding_candidate');
    assert.strictEqual(classifyDistanceTier(501), 'grounding_contradicted_or_unrelated');
    console.log('  ✓ distance tier classification');
})();

// ─── Scoring ─────────────────────────────────────────────────────────────────

(function test_strict_score() {
    const score = computeGroundingAssistedScore('strict_grounding_match', 10, 5, 0.5, 1.0);
    assert(score >= 0.95 && score <= 1.0, `strict score ${score}`);
    console.log('  ✓ strict grounding score');
})();

(function test_strong_score() {
    const score = computeGroundingAssistedScore('strong_grounding_nearby', 80, 20, 0.5, 0.8);
    assert(score >= 0.80 && score <= 0.90, `strong score ${score}`);
    console.log('  ✓ strong grounding score');
})();

(function test_fallback_score() {
    const score = computeGroundingAssistedScore('grounding_unavailable', null, null, 0.6, 0.5);
    assert.strictEqual(score, 0.6);
    console.log('  ✓ fallback score equals existing blend');
})();

(function test_contradicted_score() {
    const score = computeGroundingAssistedScore('grounding_contradicted_or_unrelated', 5000, null, 0.7, 0.5);
    assert.strictEqual(score, Math.round(0.7 * 0.8 * 1000) / 1000);
    console.log('  ✓ contradicted score penalized');
})();

(function test_scores_in_range() {
    for (const tier of ['strict_grounding_match', 'strong_grounding_nearby', 'weak_grounding_nearby', 'far_grounding_candidate', 'grounding_contradicted_or_unrelated', 'grounding_unavailable']) {
        for (const blend of [0, 0.5, 1.0]) {
            for (const ns of [0, 0.5, 1.0]) {
                const s = computeGroundingAssistedScore(tier, 100, 10, blend, ns);
                assert(s >= 0 && s <= 1, `${tier} blend=${blend} ns=${ns} → ${s}`);
            }
        }
    }
    console.log('  ✓ all scores in [0,1]');
})();

// ─── Review Reduction Class ──────────────────────────────────────────────────

(function test_review_reduction_strict() {
    assert.strictEqual(deriveReviewReductionClass('strict_grounding_match', 0.98, true, true), 'auto_supported_strict_grounding_match');
    console.log('  ✓ review reduction: strict → auto_supported');
})();

(function test_review_reduction_strong() {
    assert.strictEqual(deriveReviewReductionClass('strong_grounding_nearby', 0.85, false, false), 'grounding_supported_but_map_check_recommended');
    console.log('  ✓ review reduction: strong → map_check_recommended');
})();

(function test_review_reduction_weak() {
    assert.strictEqual(deriveReviewReductionClass('weak_grounding_nearby', 0.65, false, false), 'grounding_ambiguous_multiple_candidates');
    console.log('  ✓ review reduction: weak → ambiguous');
})();

(function test_review_reduction_fallback() {
    assert.strictEqual(deriveReviewReductionClass('grounding_unavailable', 0.5, false, false), 'fallback_review_required');
    console.log('  ✓ review reduction: fallback → review_required');
})();

// ─── Grounding Response Normalization ────────────────────────────────────────

(function test_normalize_no_grounding() {
    const mountains = [{ mountain_no: 1, name: 'テスト山', location: { municipality: 'テスト市' }, coordinates: null }];
    const raw = [];
    const { referenceIndex, summary } = normalizeGroundingResponses(raw, mountains);
    assert.strictEqual(referenceIndex.length, 1);
    assert.strictEqual(referenceIndex[0].grounding_reference_status, 'no_grounding_response');
    assert.strictEqual(summary.mountains_without_grounding, 1);
    console.log('  ✓ normalize: no grounding response');
})();

(function test_normalize_with_usable_coordinate() {
    const mountains = [{ mountain_no: 1, name: 'テスト山', location: { municipality: 'テスト市' }, coordinates: null }];
    const raw = [{
        mountain_no: 1, mountain_name: 'テスト山', grounding_status: 'grounded_verified',
        grounded_lat: 33.83, grounded_lon: 133.11, grounded_elevation_m: 1500,
        grounded_municipality: 'テスト市', confidence_score: 0.9, evidence_links: ['https://example.com'],
        _source_document_safe_name: 'test.md', _json_block_index: 0, _lat_lon_status: 'numeric',
    }];
    const { referenceIndex, summary } = normalizeGroundingResponses(raw, mountains);
    assert.strictEqual(referenceIndex.length, 1);
    assert.strictEqual(referenceIndex[0].has_usable_coordinate, true);
    assert.strictEqual(referenceIndex[0].grounding_reference_status, 'usable');
    assert.strictEqual(referenceIndex[0].name_match_status, 'exact');
    assert.strictEqual(referenceIndex[0].municipality_match_status, 'exact');
    assert.strictEqual(summary.mountains_with_usable_coordinate, 1);
    console.log('  ✓ normalize: usable coordinate');
})();

(function test_normalize_insufficient_evidence() {
    const mountains = [{ mountain_no: 1, name: 'テスト山', location: { municipality: 'テスト市' }, coordinates: null }];
    const raw = [{
        mountain_no: 1, mountain_name: 'テスト山', grounding_status: 'insufficient_evidence',
        grounded_lat: null, grounded_lon: null, grounded_elevation_m: null,
        grounded_municipality: null, confidence_score: 0,
    }];
    const { referenceIndex, summary } = normalizeGroundingResponses(raw, mountains);
    assert.strictEqual(referenceIndex[0].has_usable_coordinate, false);
    assert.strictEqual(referenceIndex[0].grounding_reference_status, 'no_usable_coordinate');
    assert.strictEqual(summary.insufficient_evidence, 1);
    console.log('  ✓ normalize: insufficient evidence');
})();

// ─── CSV Escape ──────────────────────────────────────────────────────────────

(function test_csv_escape() {
    assert.strictEqual(csvEscape(null), '');
    assert.strictEqual(csvEscape('hello'), 'hello');
    assert.strictEqual(csvEscape('he,llo'), '"he,llo"');
    assert.strictEqual(csvEscape('he"llo'), '"he""llo"');
    console.log('  ✓ csv_escape');
})();

console.log('All grounding_assisted_linking tests passed.');

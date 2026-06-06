'use strict';

const assert = require('assert');
const { processMountain } = require('../lib/grounding_assisted_review_reduction_v2');

function runTests() {
    console.log('Running test_grounding_assisted_review_reduction_v2.js');

    const defaultMountain = { mountain_no: 1, name: 'Test Mountain' };

    let candidates = [{
        summit_candidate_id: 'c1',
        grounding_distance_m: 30,
        grounding_distance_tier: 'strict',
        grounding_elevation_diff_m: 5,
        grounding_name_match_status: 'exact',
        grounding_municipality_match_status: 'exact',
        grounding_assisted_candidate_score: 0.9,
        grounding_assisted_generation_status: 'ok'
    }];
    let gRef = { has_usable_coordinate: true, coordinate_conflict: false };
    let res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'auto_supported_strict_grounding_match');
    assert.strictEqual(res.mountainResult.active_review_required, false);
    assert.strictEqual(res.candidates[0].candidate_review_classification, 'auto_supported_strict_grounding_match');
    assert.strictEqual(res.candidates[0].grounding_assisted_generation_status !== 'no_candidate_marker', true);

    candidates = [{
        summit_candidate_id: 'c1',
        grounding_distance_m: 150,
        grounding_distance_tier: 'strong',
        grounding_assisted_candidate_score: 0.8,
        grounding_assisted_generation_status: 'ok'
    }];
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_deferred_grounding_supported_top1');

    gRef.coordinate_conflict = true;
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_required_grounding_coordinate_conflict');
    gRef.coordinate_conflict = false;

    candidates = [{
        summit_candidate_id: 'marker',
        grounding_assisted_generation_status: 'no_candidate_marker'
    }];
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_required_no_candidate');

    candidates = [
        { summit_candidate_id: 'c1', grounding_distance_m: 150, grounding_assisted_candidate_score: 0.8 },
        { summit_candidate_id: 'c2', grounding_distance_m: 160, grounding_assisted_candidate_score: 0.78 }
    ];
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_required_close_alternatives');

    candidates = [
        { summit_candidate_id: 'c1', grounding_distance_m: 150, grounding_assisted_candidate_score: 0.8 },
        { summit_candidate_id: 'c2', grounding_distance_m: 160, grounding_assisted_candidate_score: 0.7 }
    ];
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_deferred_grounding_supported_top1');

    candidates = [
        { summit_candidate_id: 'c1', grounding_distance_m: 400, grounding_assisted_candidate_score: 0.6 }
    ];
    let s21Links = { 1: [{ summit_candidate_id: 'c1', grounding_refined_rank_for_mountain: 1 }] };
    let s21Queue = { 1: { grounding_refined_review_priority: 'low' } };
    res = processMountain(1, defaultMountain, candidates, gRef, s21Links, s21Queue);
    assert.strictEqual(res.mountainResult.review_classification, 'review_deferred_stage21_supported');

    s21Links = { 1: [{ summit_candidate_id: 'c2', grounding_refined_rank_for_mountain: 1 }] };
    res = processMountain(1, defaultMountain, candidates, gRef, s21Links, s21Queue);
    assert.strictEqual(res.mountainResult.review_classification, 'review_required_conflict');
    assert.strictEqual(res.mountainResult.review_reason_codes.includes('stage21_stage23_top_candidate_disagreement'), true);

    candidates = [{ summit_candidate_id: 'c1', grounding_distance_m: 150, grounding_municipality_match_status: 'contradiction' }];
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_required_grounding_contradiction');

    gRef.has_usable_coordinate = false;
    candidates = [{ summit_candidate_id: 'c1', grounding_distance_m: null }];
    res = processMountain(1, defaultMountain, candidates, gRef, {}, {});
    assert.strictEqual(res.mountainResult.review_classification, 'review_required_no_grounding');

    console.log('test_grounding_assisted_review_reduction_v2.js passed');
}

if (require.main === module) {
    runTests();
}

module.exports = runTests;

'use strict';

const assert = require('assert');
const { compressStabilityReviewQueues } = require('../lib/location_stability_review_queue_compression');

console.log('--- Running Location Stability Review Queue Compression Tests ---');

let testsPassed = 0;
let testsFailed = 0;

function runAssert(condition, message) {
    if (!condition) {
        console.error(`  ❌ FAIL: ${message}`);
        testsFailed++;
    } else {
        console.log(`  ✅ PASS: ${message}`);
        testsPassed++;
    }
}

try {
    const refinedLinks = [
        // Mountain 1: has high confidence mutual top-1, stable interior. Should be accepted after map check (medium priority)
        {
            mountain_no: 1,
            mountain_name: "Mountain One",
            summit_candidate_id: "sc1",
            source_gpx_basename: "gpx1.gpx",
            track_name: "track1",
            location_stability_bucket: "location_strong_match",
            location_stability_refined_candidate_score: 0.90,
            location_stability_refined_rank_for_mountain: 1,
            location_stability_refined_rank_for_summit_candidate: 1,
            location_stability_review_priority: "medium",
            confidence: "high"
        },
        // Mountain 2: has a conflict (shared candidate with Mountain 3)
        {
            mountain_no: 2,
            mountain_name: "Mountain Two",
            summit_candidate_id: "sc2",
            source_gpx_basename: "gpx2.gpx",
            track_name: "track2",
            location_stability_bucket: "boundary_plausible",
            location_stability_refined_candidate_score: 0.85,
            location_stability_refined_rank_for_mountain: 1,
            location_stability_refined_rank_for_summit_candidate: 1,
            location_stability_review_priority: "high",
            confidence: "high"
        },
        // Mountain 3: also maps to sc2 (not mutual top-1, rank 1 for mountain but rank 2 for candidate)
        {
            mountain_no: 3,
            mountain_name: "Mountain Three",
            summit_candidate_id: "sc2",
            source_gpx_basename: "gpx2.gpx",
            track_name: "track2",
            location_stability_bucket: "boundary_plausible",
            location_stability_refined_candidate_score: 0.80,
            location_stability_refined_rank_for_mountain: 1,
            location_stability_refined_rank_for_summit_candidate: 2,
            location_stability_review_priority: "high",
            confidence: "medium"
        },
        // Mountain 4: incompatible municipality, rank > 3 -> should be deprioritized but retained
        {
            mountain_no: 4,
            mountain_name: "Mountain Four",
            summit_candidate_id: "sc3",
            source_gpx_basename: "gpx3.gpx",
            track_name: "track3",
            location_stability_bucket: "municipality_incompatible_strong",
            location_stability_refined_candidate_score: 0.20,
            location_stability_refined_rank_for_mountain: 4,
            location_stability_refined_rank_for_summit_candidate: 1,
            location_stability_review_priority: "deprioritized",
            confidence: "low"
        }
    ];

    const {
        enrichedLinks,
        top1Queue,
        top3Queue,
        conflictQueue,
        gpxGroupRows,
        summitConflictRows
    } = compressStabilityReviewQueues(refinedLinks, 0.03);

    // 1. Verify all candidate links are preserved
    runAssert(enrichedLinks.length === refinedLinks.length, `Preserved all ${refinedLinks.length} enriched links`);

    // 2. Verify municipality_incompatible_strong is deprioritized, not deleted
    const ref4 = enrichedLinks.find(l => l.mountain_no === 4);
    runAssert(ref4 !== undefined, "Incompatible municipality link is NOT deleted");
    runAssert(ref4.review_bucket === "deprioritized", `Incompatible municipality link bucket is deprioritized (got ${ref4.review_bucket})`);

    // 3. Verify boundary_plausible is retained in top1/top3/conflict as appropriate
    const ref2 = enrichedLinks.find(l => l.mountain_no === 2);
    runAssert(ref2.review_bucket === "resolve_conflict", `Conflict link bucket is resolve_conflict (got ${ref2.review_bucket})`);
    runAssert(ref2.compact_review_priority === "high", "Conflict link has high priority");

    // 4. Verify top1/top3/conflict queue lengths
    runAssert(top1Queue.length === 4, `Top-1 queue has correct count (4, got ${top1Queue.length})`);
    // Top-3 queue has all items with rank <= 3. sc1, sc2 (for mt 2), sc2 (for mt 3) are top-3 (ranks 1, 1, 1).
    // sc3 (mt 4) has rank 4, so it is excluded from top-3 queue.
    const top3Mt4Count = top3Queue.filter(l => l.mountain_no === 4).length;
    runAssert(top3Mt4Count === 0, `Top-3 queue correctly excludes rank 4 (got ${top3Mt4Count})`);

    // Conflict queue should contain resolve_conflict items
    const conflictMt2 = conflictQueue.find(l => l.mountain_no === 2);
    const conflictMt3 = conflictQueue.find(l => l.mountain_no === 3);
    runAssert(conflictMt2 !== undefined && conflictMt3 !== undefined, "Conflict queue contains the conflicting links");

} catch (err) {
    console.error('Error during compression tests:', err);
    testsFailed++;
}

console.log(`--- Location Stability Compression Tests: ${testsPassed} passed, ${testsFailed} failed ---`);
if (testsFailed > 0) {
    throw new Error(`Location stability compression tests failed: ${testsFailed} failures`);
}

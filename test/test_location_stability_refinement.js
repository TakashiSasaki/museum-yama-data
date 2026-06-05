'use strict';

const assert = require('assert');
const { getMunicipalityRelation, getStabilityBucket, refineLinksByLocationStability } = require('../lib/location_stability_refinement');

console.log('--- Running Location Stability Refinement Tests ---');

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
    const adjacencyMap = {
        '西条市': ['久万高原町', '東温市', '新居浜市'],
        '久万高原町': ['西条市', '松山市'],
        '松山市': ['久万高原町', '東温市']
    };

    // ─────────────────────────────────────────────
    // getMunicipalityRelation tests
    // ─────────────────────────────────────────────
    console.log('--- getMunicipalityRelation ---');
    
    runAssert(getMunicipalityRelation('西条市', '西条市', 'stable_interior', adjacencyMap) === 'same_municipality', 'Same municipality');
    runAssert(getMunicipalityRelation('西条市', '久万高原町', 'stable_interior', adjacencyMap) === 'adjacent_municipality', 'Adjacent municipality');
    runAssert(getMunicipalityRelation('西条市', '松山市', 'stable_interior', adjacencyMap) === 'non_adjacent_municipality', 'Non-adjacent municipality');
    runAssert(getMunicipalityRelation(null, '西条市', 'stable_interior', adjacencyMap) === 'missing_mountain_municipality', 'Missing mountain municipality');
    runAssert(getMunicipalityRelation('西条市', null, 'stable_interior', adjacencyMap) === 'unknown', 'Unknown candidate municipality');
    runAssert(getMunicipalityRelation('西条市', '西条市', 'invalid_coordinate', adjacencyMap) === 'candidate_invalid_coordinate', 'Invalid coordinate');
    runAssert(getMunicipalityRelation('西条市', '西条市', 'outside_prefecture', adjacencyMap) === 'candidate_outside_prefecture', 'Outside prefecture');
    runAssert(getMunicipalityRelation('西条市', '西条市', 'boundary_ambiguous', adjacencyMap) === 'candidate_boundary_ambiguous', 'Boundary ambiguous');

    // ─────────────────────────────────────────────
    // getStabilityBucket tests
    // ─────────────────────────────────────────────
    console.log('--- getStabilityBucket ---');

    runAssert(getStabilityBucket('same_municipality', 'stable_interior') === 'location_strong_match', 'Same + stable_interior -> strong match');
    runAssert(getStabilityBucket('adjacent_municipality', 'near_boundary') === 'boundary_plausible', 'Adjacent + near_boundary -> boundary plausible');
    runAssert(getStabilityBucket('adjacent_municipality', 'stable_interior') === 'adjacent_but_deep_inside', 'Adjacent + stable_interior -> adjacent but deep inside');
    runAssert(getStabilityBucket('non_adjacent_municipality', 'stable_interior') === 'municipality_incompatible_strong', 'Non-adjacent + stable_interior -> incompatible strong');
    runAssert(getStabilityBucket('non_adjacent_municipality', 'near_boundary') === 'location_uncertain_keep', 'Non-adjacent + near_boundary -> location uncertain keep');
    runAssert(getStabilityBucket('candidate_boundary_ambiguous', 'boundary_ambiguous') === 'location_uncertain_keep', 'Ambiguous -> location uncertain keep');
    runAssert(getStabilityBucket('missing_mountain_municipality', 'stable_interior') === 'missing_location_evidence', 'Missing mountain municipality -> missing evidence');

    // ─────────────────────────────────────────────
    // refineLinksByLocationStability integration tests
    // ─────────────────────────────────────────────
    console.log('--- refineLinksByLocationStability ---');

    const mountains = [
        {
            mountain_no: 1,
            mountain_name: "石鎚山",
            location: { municipality: "西条市" }
        },
        {
            mountain_no: 2,
            mountain_name: "皿ヶ嶺",
            location: { municipality: "東温市" }
        },
        {
            mountain_no: 3,
            mountain_name: "笹ヶ峰",
            location: { municipality: "西条市" }
        }
    ];

    const links = [
        {
            mountain_no: 1,
            mountain_name: "石鎚山",
            summit_candidate_id: "sc1",
            combined_candidate_score: 0.80,
            confidence: "high"
        },
        {
            mountain_no: 1,
            mountain_name: "石鎚山",
            summit_candidate_id: "sc2",
            combined_candidate_score: 0.75,
            confidence: "medium"
        },
        {
            mountain_no: 2,
            mountain_name: "皿ヶ嶺",
            summit_candidate_id: "sc3",
            combined_candidate_score: 0.70,
            confidence: "high"
        },
        {
            mountain_no: 3,
            mountain_name: "笹ヶ峰",
            summit_candidate_id: "sc4",
            combined_candidate_score: 0.60,
            confidence: "high"
        }
    ];

    const stabilityRecords = [
        {
            summit_candidate_id: "sc1",
            center_municipality_name: "西条市",
            municipality_stability: "stable_interior",
            all_cardinal_1km_same: true,
            distance_stable_interior: true,
            center_distance_to_boundary_m: 1200
        },
        {
            summit_candidate_id: "sc2",
            center_municipality_name: "久万高原町",
            municipality_stability: "near_boundary",
            all_cardinal_1km_same: false,
            distance_stable_interior: false,
            center_distance_to_boundary_m: 100
        },
        {
            summit_candidate_id: "sc3",
            center_municipality_name: "松山市",
            municipality_stability: "stable_interior",
            all_cardinal_1km_same: true,
            distance_stable_interior: true,
            center_distance_to_boundary_m: 2000
        },
        {
            summit_candidate_id: "sc4",
            center_municipality_name: "久万高原町",
            municipality_stability: "stable_interior",
            all_cardinal_1km_same: true,
            distance_stable_interior: true,
            center_distance_to_boundary_m: 1500
        }
    ];

    const stabilityMap = new Map(stabilityRecords.map(r => [r.summit_candidate_id, r]));

    const refined = refineLinksByLocationStability(links, mountains, stabilityMap, adjacencyMap);

    runAssert(refined.length === links.length, `Preserved all ${links.length} candidate links`);

    // Match 1: same municipality + stable interior -> location_strong_match
    const ref1 = refined.find(l => l.summit_candidate_id === 'sc1');
    runAssert(ref1.location_stability_bucket === 'location_strong_match', 'sc1 bucket is location_strong_match');
    runAssert(ref1.location_stability_refined_candidate_score === 0.90, `sc1 score adjusted from 0.80 to 0.90 (got ${ref1.location_stability_refined_candidate_score})`);

    // Match 2: different adjacent municipality + near boundary -> boundary_plausible
    const ref2 = refined.find(l => l.summit_candidate_id === 'sc2');
    runAssert(ref2.location_stability_bucket === 'boundary_plausible', 'sc2 bucket is boundary_plausible');
    runAssert(ref2.location_stability_refined_candidate_score === 0.80, `sc2 score adjusted from 0.75 to 0.80 (got ${ref2.location_stability_refined_candidate_score})`);

    // Match 3: different non-adjacent municipality (東温市 vs 松山市 is adjacent, wait. Mountain 2 is in 東温市, candidate sc3 is in 松山市. Adjacency has '松山市' -> ['久万高原町', '東温市']. So adjacent!
    // Wait, let's look at Mun 2 (東温市) vs cand sc3 (松山市). Adjacency has '松山市' -> ['久万高原町', '東温市']. But is 東温市 adjacent to 松山市 in adjacencyMap?
    // Let's check getMunicipalityRelation logic:
    // const adjacentList = adjacencyMap[normMountain] || []; // West/East/etc.
    // Mountain 2 is 東温市. adjacencyMap['東温市'] is not defined, wait!
    // Ah, in adjacencyMap we only defined:
    // '西条市': ['久万高原町', '東温市', '新居浜市'],
    // '久万高原町': ['西条市', '松山市'],
    // '松山市': ['久万高原町', '東温市']
    // Mountain 2 is 東温市. adjacencyMap['東温市'] is undefined.
    // So getMunicipalityRelation('東温市', '松山市') returns 'non_adjacent_municipality' because adjacencyMap['東温市'] is undefined.
    // So different non-adjacent municipality + stable interior -> municipality_incompatible_strong.
    const ref3 = refined.find(l => l.summit_candidate_id === 'sc3');
    runAssert(ref3.location_stability_bucket === 'municipality_incompatible_strong', 'sc3 bucket is municipality_incompatible_strong');
    runAssert(ref3.location_stability_refined_candidate_score === 0.50, `sc3 score adjusted from 0.70 to 0.50 (got ${ref3.location_stability_refined_candidate_score})`);
    runAssert(ref3.location_stability_review_priority === 'deprioritized', 'sc3 priority is deprioritized');

    // Match 4: different adjacent municipality + stable interior -> adjacent_but_deep_inside
    // Mountain 3 is 西条市. candidate sc4 is 久万高原町.
    // 西条市 is adjacent to 久万高原町. stability is stable_interior.
    // So relation is adjacent_municipality, stability is stable_interior -> adjacent_but_deep_inside
    const ref4 = refined.find(l => l.summit_candidate_id === 'sc4');
    runAssert(ref4.location_stability_bucket === 'adjacent_but_deep_inside', 'sc4 bucket is adjacent_but_deep_inside');
    runAssert(ref4.location_stability_refined_candidate_score === 0.55, `sc4 score adjusted from 0.60 to 0.55 (got ${ref4.location_stability_refined_candidate_score})`);
    runAssert(ref4.location_stability_review_priority === 'low', 'sc4 priority is low');

} catch (err) {
    console.error('Error during refinement tests:', err);
    testsFailed++;
}

console.log(`--- Location Stability Refinement Tests: ${testsPassed} passed, ${testsFailed} failed ---`);
if (testsFailed > 0) {
    throw new Error(`Location stability refinement tests failed: ${testsFailed} failures`);
}

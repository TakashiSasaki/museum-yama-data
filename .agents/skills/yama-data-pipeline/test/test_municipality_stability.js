'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const crypto = require('crypto');

const { loadMunicipalities, STATUS } = require('../lib/municipality_point_lookup');
const { classifyStability, STABILITY_STATUS } = require('../lib/municipality_stability');

console.log('--- Running Municipality Stability Classification Tests ---');

function makeRect(lonMin, latMin, lonMax, latMax) {
    return [
        [lonMin, latMin],
        [lonMax, latMin],
        [lonMax, latMax],
        [lonMin, latMax],
        [lonMin, latMin]
    ];
}

const FIXTURE_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: { N03_001: '愛媛県', N03_002: null, N03_003: null, N03_004: 'MunA', N03_005: null, N03_007: '38201' },
            geometry: { type: 'Polygon', coordinates: [makeRect(132.0, 33.0, 133.0, 34.0)] }
        },
        {
            type: 'Feature',
            properties: { N03_001: '愛媛県', N03_002: null, N03_003: null, N03_004: 'MunB', N03_005: null, N03_007: '38202' },
            geometry: { type: 'Polygon', coordinates: [makeRect(133.0, 33.0, 134.0, 34.0)] }
        }
    ]
};

const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-stab-test-'));
const fixtureGeoJson = path.join(tmpTestDir, 'fixture_n03.geojson');
fs.writeFileSync(fixtureGeoJson, JSON.stringify(FIXTURE_GEOJSON), 'utf-8');

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
    const municipalities = loadMunicipalities(fixtureGeoJson);

    // Test Case 1: center point stable and all 1 km cardinal offsets same (stable_interior)
    // Center: MunA (132.5, 33.5)
    // Distance to boundary is ~46km, which is >= 1000m.
    // Offsets are ~1km away, well within MunA.
    const cand1 = { summit_candidate_id: 'sc001', lat: 33.5, lon: 132.5 };
    const res1 = classifyStability(municipalities, cand1, null, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 1000
    });
    runAssert(res1.municipality_stability === STABILITY_STATUS.STABLE_INTERIOR, `sc001 stable_interior (got ${res1.municipality_stability})`);
    runAssert(res1.all_cardinal_1km_same === true, 'all_cardinal_1km_same is true');
    runAssert(res1.distance_stable_interior === true, 'distance_stable_interior is true');
    runAssert(res1.center_municipality_code === '38201', 'center_municipality_code matches MunA');

    // Test Case 2: center point near boundary
    // Center: (132.999, 33.5) is in MunA but only ~93m from MunB boundary.
    // East offset is in MunB.
    const cand2 = { summit_candidate_id: 'sc002', lat: 33.5, lon: 132.999 };
    const res2 = classifyStability(municipalities, cand2, null, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 1000
    });
    runAssert(res2.municipality_stability === STABILITY_STATUS.NEAR_BOUNDARY, `sc002 near_boundary (got ${res2.municipality_stability})`);
    runAssert(res2.all_cardinal_1km_same === false, 'all_cardinal_1km_same is false');
    runAssert(res2.distance_stable_interior === false, 'distance_stable_interior is false');

    // Test Case 3: offset inconsistent (center distance >= threshold, but offsets differ)
    // Center: (132.995, 33.5) is inside MunA.
    // Distance to boundary (lon 133.0) is ~0.005 degrees lon ≈ 464 meters.
    // Let's set stableInteriorThresholdM = 400. Center distance 464m >= 400m -> distance_stable_interior = true.
    // But offset is 1000m, so East offset is inside MunB.
    // Thus all_cardinal_1km_same = false.
    const cand3 = { summit_candidate_id: 'sc003', lat: 33.5, lon: 132.995 };
    const res3 = classifyStability(municipalities, cand3, null, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 400
    });
    runAssert(res3.municipality_stability === STABILITY_STATUS.OFFSET_INCONSISTENT, `sc003 offset_inconsistent (got ${res3.municipality_stability})`);
    runAssert(res3.all_cardinal_1km_same === false, 'all_cardinal_1km_same is false');
    runAssert(res3.distance_stable_interior === true, 'distance_stable_interior is true');

    // Test Case 4: stable_cardinal_1km_same
    // Center: (132.98, 33.5) is inside MunA.
    // Distance to boundary is ~0.02 deg lon ≈ 1856 meters.
    // Set stableInteriorThresholdM = 3000. Center distance 1856 < 3000 -> distance_stable_interior = false.
    // Offset is 1000m, so all offsets are within 132.98 +/- 0.0108 lon, i.e., [132.9692, 132.9908], all inside MunA.
    // Thus all_cardinal_1km_same = true.
    const cand4 = { summit_candidate_id: 'sc004', lat: 33.5, lon: 132.98 };
    const res4 = classifyStability(municipalities, cand4, null, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 3000
    });
    runAssert(res4.municipality_stability === STABILITY_STATUS.STABLE_CARDINAL_SAME, `sc004 stable_cardinal_1km_same (got ${res4.municipality_stability})`);
    runAssert(res4.all_cardinal_1km_same === true, 'all_cardinal_1km_same is true');
    runAssert(res4.distance_stable_interior === false, 'distance_stable_interior is false');

    // Test Case 5: outside prefecture
    const cand5 = { summit_candidate_id: 'sc005', lat: 35.0, lon: 139.0 };
    const res5 = classifyStability(municipalities, cand5, null, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 1000
    });
    runAssert(res5.municipality_stability === STABILITY_STATUS.OUTSIDE_PREFECTURE, `sc005 outside_prefecture (got ${res5.municipality_stability})`);

    // Test Case 6: invalid coordinate
    const cand6 = { summit_candidate_id: 'sc006', lat: 91.0, lon: 132.0 };
    const res6 = classifyStability(municipalities, cand6, null, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 1000
    });
    runAssert(res6.municipality_stability === STABILITY_STATUS.INVALID_COORDINATE, `sc006 invalid_coordinate (got ${res6.municipality_stability})`);

    // Test Case 7: boundary ambiguous center
    // Let's create a lookup record with STATUS.AMBIGUOUS
    const mockLookupRecord = {
        lookup_status: STATUS.AMBIGUOUS,
        municipality_matches: [
            { code: '38201', name: 'MunA', distance_to_boundary_m: 5 },
            { code: '38202', name: 'MunB', distance_to_boundary_m: 5 }
        ]
    };
    const cand7 = { summit_candidate_id: 'sc007', lat: 33.5, lon: 133.0 };
    const res7 = classifyStability(municipalities, cand7, mockLookupRecord, {
        offsetM: 1000,
        boundaryToleranceM: 20,
        stableInteriorThresholdM: 1000
    });
    runAssert(res7.municipality_stability === STABILITY_STATUS.BOUNDARY_AMBIGUOUS, `sc007 boundary_ambiguous (got ${res7.municipality_stability})`);
    runAssert(res7.center_lookup_status === STATUS.AMBIGUOUS, 'center_lookup_status is ambiguous');

} finally {
    fs.rmSync(tmpTestDir, { recursive: true, force: true });
}

console.log(`--- Municipality Stability Tests: ${testsPassed} passed, ${testsFailed} failed ---`);
if (testsFailed > 0) {
    throw new Error(`Municipality stability tests failed: ${testsFailed} failures`);
}

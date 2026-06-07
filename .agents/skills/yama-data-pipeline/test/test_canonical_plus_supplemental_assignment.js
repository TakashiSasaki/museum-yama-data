const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { performAssignment, toRepoRelative } = require('../lib/canonical_plus_supplemental_assignment');

console.log('--- Testing Stage 31 Canonical Plus Supplemental Assignment ---');

// 1. Test path normalization
const base = 'C:\\Users\\takas\\Desktop\\museum-yama-data';
const testGpx = base + '\\data\\01_raw\\gpx\\2026-05-12\\yamap_1.gpx';
const rel = toRepoRelative(testGpx, base);
assert.strictEqual(rel, 'data/01_raw/gpx/2026-05-12/yamap_1.gpx', 'Should normalize Windows absolute path to repo-relative');

const unixAbs = '/home/user/museum-yama-data/data/01_raw/gpx/yamap_2.gpx';
const relUnix = toRepoRelative(unixAbs, '/home/user/museum-yama-data');
assert.strictEqual(relUnix, 'data/01_raw/gpx/yamap_2.gpx', 'Should normalize Unix absolute path to repo-relative');

// 2. Perform test run with mocked data
const tempDir = path.join(__dirname, 'temp_test_assignment');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

// Mock mountains
const mockMountains = [
    {
        mountain_no: 1,
        name: 'Test Mountain A',
        source_row_no: 1,
        coordinates: { lat: 33.8, lon: 132.8, raw: '33.8,132.8', source: 'csv' },
        elevation_m: 500,
        location: { municipality: '松山市' }
    },
    {
        mountain_no: 2,
        name: 'Test Mountain B',
        source_row_no: 2,
        coordinates: { lat: 33.9, lon: 132.9, raw: '33.9,132.9', source: 'csv' },
        elevation_m: 600,
        location: { municipality: '今治市' }
    }
];
const mountainsPath = path.join(tempDir, 'mountains.json');
fs.writeFileSync(mountainsPath, JSON.stringify(mockMountains, null, 2));

// Mock canonical summit candidates
// 1. One canonical candidate for Mountain A (near coordinates)
// 2. One canonical candidate for Mountain B (but far away, making it not a strong match)
const mockCanonical = [
    {
        summit_candidate_id: 'summit-candidate:A',
        lat: 33.8001,
        lon: 132.8001,
        ele_m: 501,
        track_name: 'test_track_A',
        source_gpx_basename: 'yamap_A.gpx',
        source_gpx_path: 'data/01_raw/gpx/yamap_A.gpx'
    },
    {
        summit_candidate_id: 'summit-candidate:B',
        lat: 33.95,
        lon: 132.95,
        ele_m: 750,
        track_name: 'test_track_B',
        source_gpx_basename: 'yamap_B.gpx',
        source_gpx_path: 'data/01_raw/gpx/yamap_B.gpx'
    }
];
const canonicalPath = path.join(tempDir, 'summit_candidates.jsonl');
fs.writeFileSync(canonicalPath, mockCanonical.map(c => JSON.stringify(c)).join('\n') + '\n');

// Mock Stage 30 supplemental candidates
// 1. Supplemental candidate for Mountain A that is 10 meters away from summit-candidate:A (duplicate)
// 2. Supplemental candidate for Mountain B that is 500 meters away from summit-candidate:B (non-duplicate fallback)
const mockSupplemental = [
    {
        supplemental_candidate_id: 'supplemental-candidate:A',
        supplemental_candidate_status: 'unresolved',
        supplemental_candidate_type: 'supplemental_gemini_near_gpx_point',
        mountain_no: 1,
        mountain_name: 'Test Mountain A',
        source_gpx_basename: 'yamap_A.gpx',
        source_gpx_path: 'C:\\Users\\takas\\Desktop\\museum-yama-data\\data\\01_raw\\gpx\\yamap_A.gpx',
        nearest_trackpoint_lat: 33.80015, // approx 6 meters from canonical candidate A
        nearest_trackpoint_lon: 132.80015,
        nearest_trackpoint_ele_m: 501.5,
        distance_gemini_to_trackpoint_m: 5.0,
        existing_nearest_summit_candidate_id: 'summit-candidate:A',
        distance_to_existing_nearest_candidate_m: 6.0,
        gemini_grounding_confidence: 0.95,
        local_peak_like_score: 1.0,
        candidate_generation_reason_codes: ['gemini_anchor_search']
    },
    {
        supplemental_candidate_id: 'supplemental-candidate:B',
        supplemental_candidate_status: 'unresolved',
        supplemental_candidate_type: 'supplemental_gemini_near_gpx_point',
        mountain_no: 2,
        mountain_name: 'Test Mountain B',
        source_gpx_basename: 'yamap_B.gpx',
        source_gpx_path: 'C:\\Users\\takas\\Desktop\\museum-yama-data\\data\\01_raw\\gpx\\yamap_B.gpx',
        nearest_trackpoint_lat: 33.9105, // far (>30m) from canonical candidate B (which is at 33.95, 132.95)
        nearest_trackpoint_lon: 132.9105,
        nearest_trackpoint_ele_m: 602.0,
        distance_gemini_to_trackpoint_m: 12.0,
        existing_nearest_summit_candidate_id: 'summit-candidate:B',
        distance_to_existing_nearest_candidate_m: 4500.0,
        gemini_grounding_confidence: 0.92,
        local_peak_like_score: 0.8,
        candidate_generation_reason_codes: ['gemini_anchor_search']
    }
];
const supplementalPath = path.join(tempDir, 'supplemental_candidates.jsonl');
fs.writeFileSync(supplementalPath, mockSupplemental.map(s => JSON.stringify(s)).join('\n') + '\n');

// Mock grounding reference index (Mountain A and B both have usable coordinates)
const mockGrounding = [
    {
        mountain_no: 1,
        has_usable_coordinate: true,
        selected_grounding_lat: 33.8,
        selected_grounding_lon: 132.8,
        selected_grounding_elevation_m: 500,
        selected_grounding_confidence_score: 0.95
    },
    {
        mountain_no: 2,
        has_usable_coordinate: true,
        selected_grounding_lat: 33.9,
        selected_grounding_lon: 132.9,
        selected_grounding_elevation_m: 600,
        selected_grounding_confidence_score: 0.92
    }
];
const groundingPath = path.join(tempDir, 'grounding_reference_index.jsonl');
fs.writeFileSync(groundingPath, mockGrounding.map(g => JSON.stringify(g)).join('\n') + '\n');

// Mock municipality lookup for canonical candidates
const mockMuniLookup = [
    { source_record_id: 'summit-candidate:A', primary_municipality_name: '松山市', primary_municipality_code: '38201' },
    { source_record_id: 'summit-candidate:B', primary_municipality_name: '今治市', primary_municipality_code: '38202' }
];
const lookupPath = path.join(tempDir, 'municipality_lookup.jsonl');
fs.writeFileSync(lookupPath, mockMuniLookup.map(l => JSON.stringify(l)).join('\n') + '\n');

// Mock stability
const mockStability = [
    { summit_candidate_id: 'summit-candidate:A', municipality_stability: 'stable_interior' },
    { summit_candidate_id: 'summit-candidate:B', municipality_stability: 'stable_interior' }
];
const stabilityPath = path.join(tempDir, 'municipality_stability.jsonl');
fs.writeFileSync(stabilityPath, mockStability.map(s => JSON.stringify(s)).join('\n') + '\n');

// Mock adjacency
const mockAdjacency = {
    land_adjacent: {
        '松山市': ['東温市', '伊予市', '今治市'],
        '今治市': ['松山市', '西条市']
    }
};
const adjacencyPath = path.join(tempDir, 'municipality_adjacency.json');
fs.writeFileSync(adjacencyPath, JSON.stringify(mockAdjacency, null, 2));

// Perform assignment on mocks
async function testPerform() {
    const result = await performAssignment({
        mountains: mountainsPath,
        canonicalSummitCandidates: canonicalPath,
        supplementalCandidates: supplementalPath,
        groundingReference: groundingPath,
        municipalityLookup: lookupPath,
        municipalityStability: stabilityPath,
        municipalityAdjacency: adjacencyPath,
        workspaceRoot: base
    });

    const { proposedAssignments } = result;

    assert.strictEqual(proposedAssignments.length, 2, 'Should return exactly 2 proposed assignments');

    // Verify Mountain A (duplicate supplemental candidate: duplicate check within 30m)
    const assignA = proposedAssignments.find(a => a.mountain_no === 1);
    assert.ok(assignA, 'Mountain A assignment should exist');
    assert.strictEqual(assignA.proposed_candidate_type, 'canonical_summit_candidate', 'For Mountain A, duplicate check should prefer canonical candidate');
    assert.strictEqual(assignA.review_category, 'canonical_preferred_over_duplicate_supplemental', 'For Mountain A, category should be canonical_preferred_over_duplicate_supplemental');
    assert.strictEqual(assignA.supplemental_duplicate_of_canonical_candidate_id, 'summit-candidate:A', 'Should record duplicate canonical ID');
    assert.ok(assignA.distance_supplemental_to_canonical_m <= 30.0, 'Duplicate distance must be <= 30m');
    assert.strictEqual(assignA.needs_human_review, true, 'Duplicate resolved cases must still flag review-required');
    assert.strictEqual(assignA.source_gpx_path, 'data/01_raw/gpx/yamap_A.gpx', 'Paths must be repo-relative');

    // Verify Mountain B (non-duplicate supplemental candidate: fallback proposal)
    const assignB = proposedAssignments.find(a => a.mountain_no === 2);
    assert.ok(assignB, 'Mountain B assignment should exist');
    assert.strictEqual(assignB.proposed_candidate_type, 'supplemental_gemini_near_gpx_point', 'For Mountain B, fallback supplemental candidate should be chosen');
    assert.strictEqual(assignB.proposed_coordinate_source, 'supplemental_gemini_near_gpx_point', 'proposed_coordinate_source must be supplemental');
    assert.strictEqual(assignB.review_category, 'supplemental_fallback_review_required', 'Category must be supplemental_fallback_review_required');
    assert.strictEqual(assignB.needs_human_review, true, 'Supplemental fallback proposal must require review');
    assert.ok(assignB.review_reason_codes.includes('supplemental_unverified'), 'Supplemental proposed assignment must include supplemental_unverified');
    assert.strictEqual(assignB.proposed_lat, 33.9105, 'Coordinate should match supplemental nearest trackpoint');
    assert.strictEqual(assignB.proposed_lon, 132.9105);
    assert.strictEqual(assignB.source_gpx_path, 'data/01_raw/gpx/yamap_B.gpx', 'Path should be repo-relative');

    console.log('✅ PASS: Stage 31 library validations complete.');

    // Cleanup mock files
    fs.rmSync(tempDir, { recursive: true, force: true });
}

testPerform().catch(err => {
    console.error('❌ FAIL:', err);
    process.exit(1);
});

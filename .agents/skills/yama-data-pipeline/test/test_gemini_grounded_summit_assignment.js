'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { performAssignment } = require('../lib/gemini_grounded_summit_assignment');
const assignCommand = require('../commands/assign-mountain-summits-gemini-grounded');

// Helper to write JSON lines
function writeJsonl(filePath, records) {
    fs.writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

async function runTests() {
    console.log('--- Starting Gemini-Grounded Mountain Summit Assignment Unit Tests ---');

    const tempDir = path.join(__dirname, 'temp_test_assignment');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });


    // Mock Files Paths
    const mountainsPath = path.join(tempDir, 'mountains.json');
    const summitCandidatesPath = path.join(tempDir, 'summit_candidates.jsonl');
    const groundingReferencePath = path.join(tempDir, 'grounding_reference.jsonl');
    const municipalityLookupPath = path.join(tempDir, 'municipality_lookup.jsonl');
    const municipalityStabilityPath = path.join(tempDir, 'municipality_stability.jsonl');
    const municipalityAdjacencyPath = path.join(tempDir, 'municipality_adjacency.json');
    
    // Output paths
    const outPath = path.join(tempDir, 'proposed_assignments.jsonl');
    const candidateSupportLinksPath = path.join(tempDir, 'candidate_support_links.jsonl');
    const prunedLogPath = path.join(tempDir, 'pruned_log.jsonl');
    const manifestPath = path.join(tempDir, 'manifest.json');
    const reviewDir = path.join(tempDir, 'review_reporting');
    const reportPath = path.join(tempDir, 'report.md');

    // 1. Mock Data Setup
    // Create 531 mock mountains to check overall record count enforcement
    const mockMountains = [];
    const mockGroundings = [];
    
    // Mountain 1: Gemini usable with strict GPX support (< 50m)
    mockMountains.push({
        mountain_no: 1,
        name: '石鎚山',
        source_row_no: 1,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.76, lon: 133.12, source: 'historical', raw: '33.76, 133.12' },
        elevation_m: 1982
    });
    mockGroundings.push({
        mountain_no: 1,
        mountain_name: '石鎚山',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.7601,
        selected_grounding_lon: 133.1201,
        selected_grounding_elevation_m: 1982,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.95,
        evidence_links: ['http://link1'],
        raw_response_refs: []
    });

    // Mountain 2: Gemini usable with strong GPX support (50m - 150m)
    mockMountains.push({
        mountain_no: 2,
        name: '瓶ヶ森',
        source_row_no: 2,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.78, lon: 133.19, source: 'historical', raw: '33.78, 133.19' },
        elevation_m: 1897
    });
    mockGroundings.push({
        mountain_no: 2,
        mountain_name: '瓶ヶ森',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.7801,
        selected_grounding_lon: 133.1901,
        selected_grounding_elevation_m: 1897,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.9,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 3: Gemini usable with medium GPX support (150m - 300m)
    mockMountains.push({
        mountain_no: 3,
        name: '笹ヶ峰',
        source_row_no: 3,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.82, lon: 133.27, source: 'historical', raw: '33.82, 133.27' },
        elevation_m: 1859
    });
    mockGroundings.push({
        mountain_no: 3,
        mountain_name: '笹ヶ峰',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.8201,
        selected_grounding_lon: 133.2701,
        selected_grounding_elevation_m: 1859,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.9,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 4: Gemini usable with weak GPX support (300m - 500m)
    mockMountains.push({
        mountain_no: 4,
        name: '平家平',
        source_row_no: 4,
        location: { municipality: '新居浜市', municipality_or_island: '新居浜市', island: null },
        coordinates: { lat: 33.80, lon: 133.32, source: 'historical', raw: '33.80, 133.32' },
        elevation_m: 1693
    });
    mockGroundings.push({
        mountain_no: 4,
        mountain_name: '平家平',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.8001,
        selected_grounding_lon: 133.3201,
        selected_grounding_elevation_m: 1693,
        selected_grounding_municipality: '新居浜市',
        selected_grounding_confidence_score: 0.85,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 5: Gemini usable with distant GPX support (500m - 1000m)
    mockMountains.push({
        mountain_no: 5,
        name: '伊予富士',
        source_row_no: 5,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.79, lon: 133.23, source: 'historical', raw: '33.79, 133.23' },
        elevation_m: 1756
    });
    mockGroundings.push({
        mountain_no: 5,
        mountain_name: '伊予富士',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.7901,
        selected_grounding_lon: 133.2301,
        selected_grounding_elevation_m: 1756,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.85,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 6: Gemini-only coordinate (usable Gemini, but no GPX candidate within 1000m)
    mockMountains.push({
        mountain_no: 6,
        name: '堂ヶ森',
        source_row_no: 6,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.73, lon: 133.09, source: 'historical', raw: '33.73, 133.09' },
        elevation_m: 1689
    });
    mockGroundings.push({
        mountain_no: 6,
        mountain_name: '堂ヶ森',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.7301,
        selected_grounding_lon: 133.0901,
        selected_grounding_elevation_m: 1689,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.8,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 7: Gemini coordinate conflict (coordinate_conflict: true)
    mockMountains.push({
        mountain_no: 7,
        name: '寒風山',
        source_row_no: 7,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.81, lon: 133.25, source: 'historical', raw: '33.81, 133.25' },
        elevation_m: 1763
    });
    mockGroundings.push({
        mountain_no: 7,
        mountain_name: '寒風山',
        has_usable_coordinate: true,
        coordinate_conflict: true,
        selected_grounding_lat: 33.8101,
        selected_grounding_lon: 133.2501,
        selected_grounding_elevation_m: 1763,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.5,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 8: Gemini missing grounding, fallback success (within 500m of CSV, name and municipality compatible)
    mockMountains.push({
        mountain_no: 8,
        name: '三嶺',
        source_row_no: 8,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.85, lon: 133.30, source: 'historical', raw: '33.85, 133.30' },
        elevation_m: 1800
    });
    // grounding missing (will not be in mockGroundings for mountain_no 8)

    // Mountain 9: Gemini missing grounding, fallback fail (no safe fallback, outside 500m of CSV)
    mockMountains.push({
        mountain_no: 9,
        name: '二ノ森',
        source_row_no: 9,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.74, lon: 133.10, source: 'historical', raw: '33.74, 133.10' },
        elevation_m: 1880
    });

    // Mountain 10: Municipality mismatch (expected: 西条市, candidate: 松山市)
    mockMountains.push({
        mountain_no: 10,
        name: '東三方ヶ森',
        source_row_no: 10,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.86, lon: 132.95, source: 'historical', raw: '33.86, 132.95' },
        elevation_m: 1233
    });
    mockGroundings.push({
        mountain_no: 10,
        mountain_name: '東三方ヶ森',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.8601,
        selected_grounding_lon: 132.9501,
        selected_grounding_elevation_m: 1233,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.9,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 11: Adjacent municipality (expected: 新居浜市, candidate: 西条市)
    mockMountains.push({
        mountain_no: 11,
        name: '沓掛山',
        source_row_no: 11,
        location: { municipality: '新居浜市', municipality_or_island: '新居浜市', island: null },
        coordinates: { lat: 33.805, lon: 133.31, source: 'historical', raw: '33.805, 133.31' },
        elevation_m: 1691
    });
    mockGroundings.push({
        mountain_no: 11,
        mountain_name: '沓掛山',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.8051,
        selected_grounding_lon: 133.3101,
        selected_grounding_elevation_m: 1691,
        selected_grounding_municipality: '新居浜市',
        selected_grounding_confidence_score: 0.9,
        evidence_links: [],
        raw_response_refs: []
    });

    // Mountain 12: Multiple similarly strong candidates (conflict_case)
    mockMountains.push({
        mountain_no: 12,
        name: '西三方ヶ森',
        source_row_no: 12,
        location: { municipality: '西条市', municipality_or_island: '西条市', island: null },
        coordinates: { lat: 33.88, lon: 132.90, source: 'historical', raw: '33.88, 132.90' },
        elevation_m: 1200
    });
    mockGroundings.push({
        mountain_no: 12,
        mountain_name: '西三方ヶ森',
        has_usable_coordinate: true,
        coordinate_conflict: false,
        selected_grounding_lat: 33.8801,
        selected_grounding_lon: 132.9001,
        selected_grounding_elevation_m: 1200,
        selected_grounding_municipality: '西条市',
        selected_grounding_confidence_score: 0.9,
        evidence_links: [],
        raw_response_refs: []
    });

    // Add padding mountains up to 531 to satisfy the record count validation
    for (let i = 13; i <= 531; i++) {
        mockMountains.push({
            mountain_no: i,
            name: `Mock Mountain ${i}`,
            source_row_no: i,
            location: { municipality: '松山市', municipality_or_island: '松山市', island: null },
            coordinates: { lat: 33.84, lon: 132.76, source: 'historical', raw: '33.84, 132.76' },
            elevation_m: 500
        });
        mockGroundings.push({
            mountain_no: i,
            mountain_name: `Mock Mountain ${i}`,
            has_usable_coordinate: true,
            coordinate_conflict: false,
            selected_grounding_lat: 33.8401,
            selected_grounding_lon: 132.7601,
            selected_grounding_elevation_m: 500,
            selected_grounding_municipality: '松山市',
            selected_grounding_confidence_score: 0.9,
            evidence_links: [],
            raw_response_refs: []
        });
    }

    // GPX Summit Candidates Mock Data
    const mockCandidates = [
        // Candidate for Mountain 1: strict support (~15m distance)
        {
            summit_candidate_id: 'cand_001',
            lat: 33.7602,
            lon: 133.1202,
            ele_m: 1982,
            track_name: '石鎚山ルート',
            source_gpx_basename: 'ishizuchi.gpx',
            source_gpx_path: 'gpx/raw/ishizuchi.gpx'
        },
        // Candidate for Mountain 2: strong support (~100m distance)
        {
            summit_candidate_id: 'cand_002',
            lat: 33.7808,
            lon: 133.1908,
            ele_m: 1897,
            track_name: '瓶ヶ森ルート',
            source_gpx_basename: 'kamegamori.gpx',
            source_gpx_path: 'gpx/raw/kamegamori.gpx'
        },
        // Candidate for Mountain 3: medium support (~250m distance)
        {
            summit_candidate_id: 'cand_003',
            lat: 33.8222,
            lon: 133.2722,
            ele_m: 1859,
            track_name: '笹ヶ峰ルート',
            source_gpx_basename: 'sasagamine.gpx',
            source_gpx_path: 'gpx/raw/sasagamine.gpx'
        },
        // Candidate for Mountain 4: weak support (~450m distance)
        {
            summit_candidate_id: 'cand_004',
            lat: 33.8030,
            lon: 133.3230,
            ele_m: 1693,
            track_name: '平家平ルート',
            source_gpx_basename: 'heikedaira.gpx',
            source_gpx_path: 'gpx/raw/heikedaira.gpx'
        },

        // Candidate for Mountain 5: distant support (~800m distance)
        {
            summit_candidate_id: 'cand_005',
            lat: 33.7970,
            lon: 133.2370,
            ele_m: 1756,
            track_name: '伊予富士ルート',
            source_gpx_basename: 'iyofuji.gpx',
            source_gpx_path: 'gpx/raw/iyofuji.gpx'
        },
        // Candidate for Mountain 6: too far (>1000m)
        {
            summit_candidate_id: 'cand_006',
            lat: 33.7500,
            lon: 133.1100,
            ele_m: 1689,
            track_name: '堂ヶ森ルート',
            source_gpx_basename: 'dougamori.gpx',
            source_gpx_path: 'gpx/raw/dougamori.gpx'
        },
        // Candidate for Mountain 8: fallback candidate (within 300m of CSV, name compatible, muni compatible)
        {
            summit_candidate_id: 'cand_008',
            lat: 33.8505,
            lon: 133.3005,
            ele_m: 1800,
            track_name: '三嶺',
            source_gpx_basename: 'miune.gpx',
            source_gpx_path: 'gpx/raw/miune.gpx'
        },
        // Candidate for Mountain 10: municipality mismatch
        {
            summit_candidate_id: 'cand_010',
            lat: 33.8602,
            lon: 132.9502,
            ele_m: 1233,
            track_name: '東三方ヶ森ルート',
            source_gpx_basename: 'higashisanpo.gpx',
            source_gpx_path: 'gpx/raw/higashisanpo.gpx'
        },
        // Candidate for Mountain 11: adjacent municipality
        {
            summit_candidate_id: 'cand_011',
            lat: 33.8052,
            lon: 133.3102,
            ele_m: 1691,
            track_name: '沓掛山ルート',
            source_gpx_basename: 'kutsukake.gpx',
            source_gpx_path: 'gpx/raw/kutsukake.gpx'
        },
        // Candidate A for Mountain 12: multiple strong candidates
        {
            summit_candidate_id: 'cand_012_A',
            lat: 33.8802,
            lon: 132.9002,
            ele_m: 1200,
            track_name: '西三方ヶ森ルートA',
            source_gpx_basename: 'nishisanpoA.gpx',
            source_gpx_path: 'gpx/raw/nishisanpoA.gpx'
        },
        // Candidate B for Mountain 12: multiple strong candidates (similarly strong score/distance)
        {
            summit_candidate_id: 'cand_012_B',
            lat: 33.8803,
            lon: 132.9003,
            ele_m: 1200,
            track_name: '西三方ヶ森ルートB',
            source_gpx_basename: 'nishisanpoB.gpx',
            source_gpx_path: 'gpx/raw/nishisanpoB.gpx'
        }
    ];

    // Padding candidates to avoid any index out of bounds
    for (let i = 13; i <= 531; i++) {
        mockCandidates.push({
            summit_candidate_id: `cand_${i}`,
            lat: 33.8402,
            lon: 132.7602,
            ele_m: 500,
            track_name: `Mock Route ${i}`,
            source_gpx_basename: `mock_${i}.gpx`,
            source_gpx_path: `gpx/raw/mock_${i}.gpx`
        });
    }

    // Municipality Lookups
    const mockMuniLookups = mockCandidates.map(c => {
        let muni = '松山市';
        if (['cand_001', 'cand_002', 'cand_003', 'cand_005', 'cand_011', 'cand_012_A', 'cand_012_B'].includes(c.summit_candidate_id)) {
            muni = '西条市';
        } else if (c.summit_candidate_id === 'cand_004') {
            muni = '新居浜市';
        } else if (c.summit_candidate_id === 'cand_008') {
            muni = '西条市';
        } else if (c.summit_candidate_id === 'cand_010') {
            muni = '松山市'; // Mismatch for expected 西条市
        }
        return {
            source_record_id: c.summit_candidate_id,
            primary_municipality_name: muni,
            primary_municipality_code: '38206',
            municipality_matches: [{ name: muni, code: '38206', distance_to_boundary_m: 500, relationship: 'interior' }]
        };
    });

    // Stability Lookups
    const mockStability = mockCandidates.map(c => ({
        summit_candidate_id: c.summit_candidate_id,
        municipality_stability: 'stable_interior',
        municipality_stability_reason_codes: [],
        center_distance_to_boundary_m: 1200
    }));

    // Land Adjacency Mock
    const mockAdjacency = {
        land_adjacent: {
            '西条市': ['新居浜市', '東温市', '久万高原町'],
            '新居浜市': ['西条市', '四国中央市'],
            '松山市': ['今治市', '東温市', '伊予市', '砥部町', '松前町']
        }
    };

    // Write all mocks
    fs.writeFileSync(mountainsPath, JSON.stringify(mockMountains, null, 2), 'utf8');
    writeJsonl(summitCandidatesPath, mockCandidates);
    writeJsonl(groundingReferencePath, mockGroundings);
    writeJsonl(municipalityLookupPath, mockMuniLookups);
    writeJsonl(municipalityStabilityPath, mockStability);
    fs.writeFileSync(municipalityAdjacencyPath, JSON.stringify(mockAdjacency, null, 2), 'utf8');

    // 2. Perform PerformAssignment Library tests
    const result = await performAssignment({
        mountains: mountainsPath,
        summitCandidates: summitCandidatesPath,
        groundingReference: groundingReferencePath,
        municipalityLookup: municipalityLookupPath,
        municipalityStability: municipalityStabilityPath,
        municipalityAdjacency: municipalityAdjacencyPath
    });

    const assignments = result.proposedAssignments;

    // A. Check total output assignments is exactly 531
    assert.strictEqual(assignments.length, 531, 'Should output exactly 531 assignments');

    // B. Check strict distance tier (Mountain 1)
    const a1 = assignments.find(a => a.mountain_no === 1);
    assert.strictEqual(a1.assignment_status, 'assigned');
    assert.strictEqual(a1.proposed_coordinate_source, 'gpx_summit_candidate');
    assert.strictEqual(a1.proposed_summit_candidate_id, 'cand_001');
    assert.strictEqual(a1.review_category, 'auto_supported_not_canonical');
    assert.strictEqual(a1.needs_human_review, false);
    assert(a1.distance_gemini_to_gpx_candidate_m < 50, 'Mountain 1 should be strict support');

    // C. Check strong distance tier (Mountain 2)
    const a2 = assignments.find(a => a.mountain_no === 2);
    assert.strictEqual(a2.assignment_status, 'assigned');
    assert.strictEqual(a2.proposed_summit_candidate_id, 'cand_002');
    assert.strictEqual(a2.review_category, 'auto_supported_not_canonical');
    assert.strictEqual(a2.needs_human_review, false);

    // D. Check medium distance tier (Mountain 3)
    const a3 = assignments.find(a => a.mountain_no === 3);
    assert.strictEqual(a3.assignment_status, 'assigned');
    assert.strictEqual(a3.review_category, 'quick_review_recommended');
    assert.strictEqual(a3.needs_human_review, true);

    // E. Check weak distance tier (Mountain 4)
    const a4 = assignments.find(a => a.mountain_no === 4);
    assert.strictEqual(a4.assignment_status, 'assigned');
    assert.strictEqual(a4.review_category, 'quick_review_recommended');
    assert.strictEqual(a4.needs_human_review, true);

    // F. Check distant distance tier (Mountain 5)
    const a5 = assignments.find(a => a.mountain_no === 5);
    assert.strictEqual(a5.assignment_status, 'assigned');
    assert.strictEqual(a5.review_category, 'manual_review_required');
    assert.strictEqual(a5.needs_human_review, true);
    assert(a5.review_reason_codes.includes('gpx_distant_support'));

    // G. Check Gemini-only coordinate (Mountain 6)
    const a6 = assignments.find(a => a.mountain_no === 6);
    assert.strictEqual(a6.assignment_status, 'assigned');
    assert.strictEqual(a6.proposed_coordinate_source, 'gemini_only');
    assert.strictEqual(a6.proposed_summit_candidate_id, null);
    assert.strictEqual(a6.review_category, 'gemini_only_coordinate_review');
    assert.strictEqual(a6.needs_human_review, true);
    assert(a6.review_reason_codes.includes('gemini_only_coordinate'));

    // H. Check Gemini coordinate conflict (Mountain 7)
    const a7 = assignments.find(a => a.mountain_no === 7);
    assert.strictEqual(a7.proposed_lat, null);
    assert.strictEqual(a7.proposed_lon, null);
    assert.strictEqual(a7.proposed_ele_m, null);
    assert.strictEqual(a7.assignment_status, 'unassigned');
    assert.strictEqual(a7.review_category, 'conflict_case');
    assert.strictEqual(a7.needs_human_review, true);
    assert(a7.review_reason_codes.includes('gemini_coordinate_conflict'));

    // I. Check missing grounding fallback success (Mountain 8)
    const a8 = assignments.find(a => a.mountain_no === 8);
    assert.strictEqual(a8.assignment_status, 'assigned');
    assert.strictEqual(a8.proposed_coordinate_source, 'gpx_summit_candidate');
    assert.strictEqual(a8.proposed_summit_candidate_id, 'cand_008');
    assert.strictEqual(a8.review_category, 'manual_review_required');
    assert.strictEqual(a8.needs_human_review, true);
    assert(a8.review_reason_codes.includes('csv_fallback_assignment'));

    // J. Check missing grounding fallback fail (Mountain 9)
    const a9 = assignments.find(a => a.mountain_no === 9);
    assert.strictEqual(a9.assignment_status, 'unassigned');
    assert.strictEqual(a9.proposed_lat, null);
    assert.strictEqual(a9.review_category, 'no_assignment');
    assert.strictEqual(a9.needs_human_review, true);
    assert(a9.review_reason_codes.includes('no_usable_grounding'));

    // K. Check municipality mismatch (Mountain 10)
    const a10 = assignments.find(a => a.mountain_no === 10);
    assert.strictEqual(a10.assignment_status, 'assigned');
    assert.strictEqual(a10.review_category, 'conflict_case');
    assert.strictEqual(a10.needs_human_review, true);
    assert(a10.review_reason_codes.includes('municipality_mismatch'));

    // L. Check adjacent municipality (Mountain 11)
    const a11 = assignments.find(a => a.mountain_no === 11);
    assert.strictEqual(a11.assignment_status, 'assigned');
    assert.strictEqual(a11.review_category, 'quick_review_recommended');
    assert.strictEqual(a11.needs_human_review, true);
    assert(a11.review_reason_codes.includes('municipality_adjacent_warning'));

    // M. Check multiple strong candidates conflict (Mountain 12)
    const a12 = assignments.find(a => a.mountain_no === 12);
    assert.strictEqual(a12.assignment_status, 'assigned');
    assert.strictEqual(a12.review_category, 'conflict_case');
    assert.strictEqual(a12.needs_human_review, true);
    assert(a12.review_reason_codes.includes('multiple_strong_candidates_conflict'));

    console.log('  ✓ performAssignment library assertions passed');

    // 3. Test Command Execution and Non-overwrite Checks
    // Execute assignCommand once to generate outputs
    await assignCommand({
        mountains: mountainsPath,
        summitCandidates: summitCandidatesPath,
        groundingReference: groundingReferencePath,
        municipalityLookup: municipalityLookupPath,
        municipalityStability: municipalityStabilityPath,
        municipalityAdjacency: municipalityAdjacencyPath,
        out: outPath,
        candidateSupportLinks: candidateSupportLinksPath,
        prunedLog: prunedLogPath,
        manifest: manifestPath,
        reviewDir: reviewDir,
        report: reportPath
    });

    assert(fs.existsSync(outPath), 'Proposed assignments JSONL should exist');
    assert(fs.existsSync(candidateSupportLinksPath), 'Candidate support links JSONL should exist');
    assert(fs.existsSync(prunedLogPath), 'Pruned log JSONL should exist');
    assert(fs.existsSync(manifestPath), 'Manifest JSON should exist');
    assert(fs.existsSync(reportPath), 'Report markdown should exist');
    assert(fs.existsSync(path.join(reviewDir, 'summary.md')), 'Review summary should exist');

    console.log('  ✓ Command executed successfully and files written');

    // N. Test non-overwrite failure
    let overwriteError = false;
    try {
        await assignCommand({
            mountains: mountainsPath,
            summitCandidates: summitCandidatesPath,
            groundingReference: groundingReferencePath,
            municipalityLookup: municipalityLookupPath,
            municipalityStability: municipalityStabilityPath,
            municipalityAdjacency: municipalityAdjacencyPath,
            out: outPath,
            candidateSupportLinks: candidateSupportLinksPath,
            prunedLog: prunedLogPath,
            manifest: manifestPath,
            reviewDir: reviewDir,
            report: reportPath
        });
    } catch (e) {
        if (e.message.includes('already exists')) {
            overwriteError = true;
        }
    }
    assert.strictEqual(overwriteError, true, 'Command should fail when output files already exist');
    console.log('  ✓ Non-overwrite policy enforced correctly');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('All assign-mountain-summits-gemini-grounded tests passed.');
}

if (require.main === module) {
    runTests().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
module.exports = runTests;


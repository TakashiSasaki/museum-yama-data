'use strict';
/**
 * test_mountain_summit_candidate_location_refinement.js
 *
 * Tests for lib/mountain_summit_candidate_location_refinement.js and refinement command.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const {
    cleanPlaceName,
    stripPlaceSuffix,
    extractAddressValues,
    getGeocodingDetails,
    computeLocationRefinement,
    refineScoresAndRanks,
} = require('../lib/mountain_summit_candidate_location_refinement');
const refineCommand = require('../commands/refine-mountain-summit-candidate-links-by-location');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e.message}`);
        failed++;
    }
}

console.log('\n== test_mountain_summit_candidate_location_refinement ==');

// 1. Text normalization tests
test('cleanPlaceName normalizes space and full-width characters', () => {
    assert.strictEqual(cleanPlaceName(' 松山市 '), '松山市');
    assert.strictEqual(cleanPlaceName('松山　市'), '松山市');
    assert.strictEqual(cleanPlaceName('Ｍａｔｓｕｙａｍａ'), 'matsuyama');
});

test('stripPlaceSuffix removes Japanese admin suffixes', () => {
    assert.strictEqual(stripPlaceSuffix('松山市'), '松山');
    assert.strictEqual(stripPlaceSuffix('内子町'), '内子');
    assert.strictEqual(stripPlaceSuffix('西条市'), '西条');
    assert.strictEqual(stripPlaceSuffix('越智郡'), '越智');
    assert.strictEqual(stripPlaceSuffix('中島'), '中');
});

// 2. Exact municipality match tests
test('computeLocationRefinement exact municipality match (direct and suffix-stripped)', () => {
    const mountain = {
        mountain_no: 1,
        location: {
            municipality_or_island: '松山市',
            municipality: '松山市',
            island: null
        }
    };
    const evidence = {
        summit_candidate_id: 'sc:1',
        location_candidates: [{ location_name: '松山市', location_type: 'city' }],
        nearest_display_name: '松山市北条',
        nearest_address: { city: '松山市' },
        nearby_reverse_geocoded_points: []
    };

    const ref = computeLocationRefinement(mountain, evidence);
    assert.strictEqual(ref.exact_municipality_match, true);
    assert.strictEqual(ref.location_refinement_level, 'exact_municipality_match');
    assert.strictEqual(ref.location_refinement_score, 1.0);
    assert.ok(ref.matched_terms.includes('松山市') || ref.matched_terms.includes('松山'));

    // Suffix stripped case
    const mountainStripped = {
        mountain_no: 2,
        location: {
            municipality_or_island: '西条市',
            municipality: '西条', // user recorded it without suffix
            island: null
        }
    };
    const evidenceWithSuffix = {
        summit_candidate_id: 'sc:2',
        location_candidates: [{ location_name: '西条市', location_type: 'city' }],
        nearest_display_name: '西条市大保木',
        nearest_address: { city: '西条市' },
        nearby_reverse_geocoded_points: []
    };
    const ref2 = computeLocationRefinement(mountainStripped, evidenceWithSuffix);
    assert.strictEqual(ref2.exact_municipality_match, true);
    assert.strictEqual(ref2.location_refinement_score, 1.0);
});

// 3. Island name text match tests
test('computeLocationRefinement island name text match', () => {
    const mountain = {
        mountain_no: 3,
        location: {
            municipality_or_island: '大島',
            municipality: null,
            island: '大島'
        }
    };
    // No island candidates in structured candidates list, but island appears in address/display_name
    const evidence = {
        summit_candidate_id: 'sc:3',
        location_candidates: [{ location_name: '今治市', location_type: 'city' }],
        nearest_display_name: '大島宮窪町',
        nearest_address: { city: '今治市', local: '大島' },
        nearby_reverse_geocoded_points: []
    };

    const ref = computeLocationRefinement(mountain, evidence);
    assert.strictEqual(ref.island_text_match, true);
    assert.strictEqual(ref.location_refinement_level, 'island_text_match');
    assert.strictEqual(ref.location_refinement_score, 0.9);
});

// 4. Nearby point municipality match tests
test('computeLocationRefinement nearby point municipality match', () => {
    const mountain = {
        mountain_no: 4,
        location: {
            municipality_or_island: '内子町',
            municipality: '内子町',
            island: null
        }
    };
    // Nearest point is in Ozu-shi, but 内子町 is in nearby points within 1km
    const evidence = {
        summit_candidate_id: 'sc:4',
        location_candidates: [{ location_name: '大洲市', location_type: 'city' }],
        nearest_display_name: '大洲市某所',
        nearest_address: { city: '大洲市' },
        nearby_reverse_geocoded_points: [
            { city: '喜多郡内子町', town: '内子町' }
        ]
    };

    const ref = computeLocationRefinement(mountain, evidence);
    assert.strictEqual(ref.exact_municipality_match, false);
    assert.strictEqual(ref.nearby_municipality_match, true);
    assert.strictEqual(ref.location_refinement_level, 'nearby_municipality_match');
    assert.strictEqual(ref.location_refinement_score, 0.75);
});

// 5. Local text match and weak admin match tests
test('computeLocationRefinement local text match & weak admin match', () => {
    const mountainLocal = {
        mountain_no: 5,
        location: {
            municipality_or_island: '忽那諸島',
            municipality: null,
            island: null
        }
    };
    const evidenceLocal = {
        summit_candidate_id: 'sc:5',
        location_candidates: [{ location_name: '松山市', location_type: 'city' }],
        nearest_display_name: '松山市忽那諸島',
        nearest_address: { city: '松山市', local: '忽那諸島' },
        nearby_reverse_geocoded_points: []
    };
    const refLocal = computeLocationRefinement(mountainLocal, evidenceLocal);
    assert.strictEqual(refLocal.local_text_match, true);
    assert.strictEqual(refLocal.location_refinement_level, 'local_text_match');
    assert.strictEqual(refLocal.location_refinement_score, 0.55);

    const mountainWeak = {
        mountain_no: 6,
        location: {
            municipality_or_island: '他の場所',
            municipality: '北宇和郡松野町',
            island: null
        }
    };
    const evidenceWeak = {
        summit_candidate_id: 'sc:6',
        location_candidates: [{ location_name: '松野', location_type: 'town' }], // partial/weak
        nearest_display_name: '松野某所',
        nearest_address: { town: '松野' },
        nearby_reverse_geocoded_points: []
    };
    const refWeak = computeLocationRefinement(mountainWeak, evidenceWeak);
    assert.strictEqual(refWeak.weak_admin_match, true);
    assert.strictEqual(refWeak.location_refinement_level, 'weak_admin_match');
    assert.strictEqual(refWeak.location_refinement_score, 0.40);
});

// 6. Boundary tolerated mismatch tests
test('computeLocationRefinement boundary tolerated mismatch', () => {
    const mountain = {
        mountain_no: 7,
        location: {
            municipality_or_island: '松山市',
            municipality: '松山市',
            island: null
        }
    };
    // Geocoding points show a completely different municipality (e.g. Tobe-cho)
    const evidence = {
        summit_candidate_id: 'sc:7',
        location_evidence_status: 'ok',
        location_candidates: [{ location_name: '伊予郡砥部町', location_type: 'town' }],
        nearest_display_name: '砥部町某所',
        nearest_address: { city: '伊予郡砥部町' },
        nearby_reverse_geocoded_points: []
    };

    const ref = computeLocationRefinement(mountain, evidence);
    assert.strictEqual(ref.exact_municipality_match, false);
    assert.strictEqual(ref.boundary_tolerated_mismatch, true);
    assert.strictEqual(ref.location_refinement_level, 'boundary_tolerated_mismatch');
    assert.strictEqual(ref.location_refinement_score, 0.20);
});

// 7. Unavailable location data tests
test('computeLocationRefinement unavailable location data', () => {
    const mountain = {
        mountain_no: 8,
        location: null
    };
    const evidence = {
        summit_candidate_id: 'sc:8',
        location_candidates: [],
        nearest_display_name: '',
        nearest_address: null,
        nearby_reverse_geocoded_points: []
    };
    const ref = computeLocationRefinement(mountain, evidence);
    assert.strictEqual(ref.location_refinement_level, 'unavailable');
    assert.strictEqual(ref.location_refinement_score, 0.00);

    const refNull = computeLocationRefinement(mountain, null);
    assert.strictEqual(refNull.location_refinement_level, 'unavailable');
    assert.strictEqual(refNull.location_refinement_score, 0.00);
});

// 8. Refined score range & formula tests
test('refineScoresAndRanks score ranges and formula implementation', () => {
    const mountains = [
        {
            mountain_no: 1,
            name: '関ヶ森',
            location: { municipality_or_island: '松山市', municipality: '松山市', island: null },
            elevation_m: 592
        }
    ];
    const locationEvidences = [
        {
            summit_candidate_id: 'sc:1',
            location_candidates: [{ location_name: '松山市', location_type: 'city' }],
            nearest_display_name: '松山市北条',
            nearest_address: { city: '松山市' },
            nearby_reverse_geocoded_points: []
        }
    ];
    const links = [
        {
            mountain_no: 1,
            mountain_name: '関ヶ森',
            summit_candidate_id: 'sc:1',
            combined_candidate_score: 0.80,
            confidence: 'medium',
            evidence: { name: { name_tier: 'strong' }, elevation: { elevation_tier: 'strong', diff_m: 4 } }
        }
    ];

    const refined = refineScoresAndRanks(links, mountains, locationEvidences);
    assert.strictEqual(refined.length, 1);
    const item = refined[0];
    
    // Formula: 0.85 * combined_score + 0.15 * location_refinement_score
    // 0.85 * 0.80 + 0.15 * 1.00 = 0.68 + 0.15 = 0.83
    assert.strictEqual(item.location_refined_candidate_score, 0.83);
    assert.ok(item.location_refined_candidate_score >= 0 && item.location_refined_candidate_score <= 1);
    assert.ok(item.location_refinement.location_refinement_score >= 0 && item.location_refinement.location_refinement_score <= 1);
});

// 9. Rank recomputation tests
test('refineScoresAndRanks rank recomputation works and is deterministic', () => {
    const mountains = [
        {
            mountain_no: 1,
            name: '関ヶ森',
            location: { municipality_or_island: '松山市', municipality: '松山市', island: null },
            elevation_m: 592
        }
    ];
    const locationEvidences = [
        {
            summit_candidate_id: 'sc:1',
            location_candidates: [{ location_name: '松山市', location_type: 'city' }]
        },
        {
            summit_candidate_id: 'sc:2',
            location_candidates: [{ location_name: '松山市', location_type: 'city' }]
        }
    ];
    const links = [
        {
            mountain_no: 1,
            mountain_name: '関ヶ森',
            summit_candidate_id: 'sc:1',
            combined_candidate_score: 0.80,
            evidence: { name: { name_tier: 'strong' } }
        },
        {
            mountain_no: 1,
            mountain_name: '関ヶ森',
            summit_candidate_id: 'sc:2',
            combined_candidate_score: 0.90, // higher original score
            evidence: { name: { name_tier: 'strong' } }
        }
    ];

    const refined = refineScoresAndRanks(links, mountains, locationEvidences);
    assert.strictEqual(refined.length, 2);

    const sortedByRank = [...refined].sort((a, b) => a.location_refined_rank_for_mountain - b.location_refined_rank_for_mountain);
    assert.strictEqual(sortedByRank[0].summit_candidate_id, 'sc:2'); // Should be rank 1
    assert.strictEqual(sortedByRank[0].location_refined_rank_for_mountain, 1);
    assert.strictEqual(sortedByRank[1].summit_candidate_id, 'sc:1'); // Should be rank 2
    assert.strictEqual(sortedByRank[1].location_refined_rank_for_mountain, 2);
});

// 10. Review priority assignment tests
test('refineScoresAndRanks review priority assignment', () => {
    const mountains = [
        {
            mountain_no: 1,
            name: '関ヶ森',
            location: { municipality_or_island: '松山市', municipality: '松山市', island: null },
            elevation_m: 592
        },
        {
            mountain_no: 2,
            name: '観音山',
            location: { municipality_or_island: '松山市', municipality: '松山市', island: null },
            elevation_m: 300
        }
    ];
    const locationEvidences = [
        {
            summit_candidate_id: 'sc:1',
            location_candidates: [{ location_name: '松山市', location_type: 'city' }]
        }
    ];
    
    // Test case: summit candidate sc:1 is rank 1 for multiple mountains (mountain 1 and mountain 2)
    const links = [
        {
            mountain_no: 1,
            mountain_name: '関ヶ森',
            summit_candidate_id: 'sc:1',
            combined_candidate_score: 0.80,
            evidence: { name: { name_tier: 'strong' } }
        },
        {
            mountain_no: 2,
            mountain_name: '観音山',
            summit_candidate_id: 'sc:1',
            combined_candidate_score: 0.85,
            evidence: { name: { name_tier: 'strong' } }
        }
    ];

    const refined = refineScoresAndRanks(links, mountains, locationEvidences);
    assert.strictEqual(refined[0].review_priority, 'high');
    assert.ok(refined[0].review_priority_reason_codes.includes('top_candidate_for_multiple_mountains') || refined[0].review_priority_reason_codes.includes('top_1_but_ambiguous'));
});

// 11. Command integration tests (collision check, staging, all-or-nothing, mtime preservation)
test('refine-mountain-summit-candidate-links-by-location command lifecycle', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-refine-cmd-test-'));

    const mountainsPath = path.join(tmpDir, 'mountains.json');
    const candidateLinksPath = path.join(tmpDir, 'candidate_links.jsonl');
    const locationEvidencePath = path.join(tmpDir, 'location_evidence.jsonl');

    const outPath = path.join(tmpDir, 'location_refined_candidate_links.jsonl');
    const manifestPath = path.join(tmpDir, 'location_refined_manifest.json');
    const reviewCsvPath = path.join(tmpDir, 'location_refined_review_queue.csv');
    const reviewMdPath = path.join(tmpDir, 'location_refined_review_queue.md');
    const reportPath = path.join(tmpDir, 'location_refined_report.md');

    // Create 531 mock mountain records (required by size validation in command)
    const mockMountains = [];
    for (let i = 1; i <= 531; i++) {
        mockMountains.push({
            mountain_no: i,
            name: `Mountain ${i}`,
            location: { municipality_or_island: '松山市', municipality: '松山市', island: null },
            elevation_m: 500,
            coordinates: { lat: 33.8, lon: 132.8 }
        });
    }

    // Write inputs
    fs.writeFileSync(mountainsPath, JSON.stringify(mockMountains, null, 2), 'utf8');

    const mockLinks = [
        {
            mountain_no: 1,
            mountain_name: 'Mountain 1',
            summit_candidate_id: 'sc:1',
            source_gpx_path: 'track.gpx',
            source_gpx_basename: 'track.gpx',
            track_name: 'Mountain 1 Summit',
            candidate_lat: 33.8,
            candidate_lon: 132.8,
            candidate_ele_m: 502,
            mountain_csv_lat: 33.8,
            mountain_csv_lon: 132.8,
            mountain_elevation_m: 500,
            combined_candidate_score: 0.90,
            candidate_rank_for_mountain: 1,
            candidate_rank_for_summit_candidate: 1,
            match_status: 'candidate_high_confidence',
            confidence: 'high',
            needs_human_review: false,
            review_reason_codes: [],
            evidence: { name: { name_tier: 'strong' }, elevation: { elevation_tier: 'strong', diff_m: 2 } }
        }
    ];
    fs.writeFileSync(candidateLinksPath, mockLinks.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');

    const mockEvidence = [
        {
            summit_candidate_id: 'sc:1',
            nearest_distance_m: 5,
            nearest_geocoded_point_id: 'node/1234',
            nearest_display_name: '松山市',
            nearest_address: { city: '松山市' },
            location_candidates: [{ location_name: '松山市', location_type: 'city' }],
            nearby_reverse_geocoded_points: [],
            location_evidence_status: 'ok',
            location_evidence_level: 'strong'
        }
    ];
    fs.writeFileSync(locationEvidencePath, mockEvidence.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');

    // Run Command
    await refineCommand({
        mountains: mountainsPath,
        candidateLinks: candidateLinksPath,
        locationEvidence: locationEvidencePath,
        out: outPath,
        manifest: manifestPath,
        reviewCsv: reviewCsvPath,
        reviewMd: reviewMdPath,
        report: reportPath
    });

    // Verify outputs exist and parse correctly
    assert.ok(fs.existsSync(outPath));
    assert.ok(fs.existsSync(manifestPath));
    assert.ok(fs.existsSync(reviewCsvPath));
    assert.ok(fs.existsSync(reviewMdPath));
    assert.ok(fs.existsSync(reportPath));

    const outLines = fs.readFileSync(outPath, 'utf8').split('\n').filter(l => l.trim());
    assert.strictEqual(outLines.length, 1);
    const refinedItem = JSON.parse(outLines[0]);
    assert.strictEqual(refinedItem.location_refined_candidate_score, 0.915); // 0.85 * 0.90 + 0.15 * 1.00 = 0.765 + 0.15 = 0.915
    assert.strictEqual(refinedItem.location_refinement.location_refinement_level, 'exact_municipality_match');

    // Validate Manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.summary.input_candidate_link_records, 1);
    assert.strictEqual(manifest.summary.output_refined_candidate_link_records, 1);
    assert.strictEqual(manifest.summary.exact_municipality_match_count, 1);

    // Test Collision
    let threwCollision = false;
    try {
        await refineCommand({
            mountains: mountainsPath,
            candidateLinks: candidateLinksPath,
            locationEvidence: locationEvidencePath,
            out: outPath, // already exists now
            manifest: manifestPath,
            reviewCsv: reviewCsvPath,
            reviewMd: reviewMdPath,
            report: reportPath
        });
    } catch (e) {
        threwCollision = true;
        assert.ok(e.message.includes('collision') || e.message.includes('already exists'));
    }
    assert.ok(threwCollision, 'Command should fail when output files already exist');

    // Verify source files not modified
    const mtimeMtn = fs.statSync(mountainsPath).mtimeMs;
    const mtimeLinks = fs.statSync(candidateLinksPath).mtimeMs;
    const mtimeEvidence = fs.statSync(locationEvidencePath).mtimeMs;

    // Wait a brief moment to ensure if modified it would differ
    await new Promise(resolve => setTimeout(resolve, 10));

    // Ensure we can run again on non-existing path
    const otherOutPath = path.join(tmpDir, 'other_out.jsonl');
    const otherManifestPath = path.join(tmpDir, 'other_manifest.json');
    const otherReviewCsvPath = path.join(tmpDir, 'other_review.csv');
    const otherReviewMdPath = path.join(tmpDir, 'other_review.md');
    const otherReportPath = path.join(tmpDir, 'other_report.md');

    await refineCommand({
        mountains: mountainsPath,
        candidateLinks: candidateLinksPath,
        locationEvidence: locationEvidencePath,
        out: otherOutPath,
        manifest: otherManifestPath,
        reviewCsv: otherReviewCsvPath,
        reviewMd: otherReviewMdPath,
        report: otherReportPath
    });

    assert.strictEqual(fs.statSync(mountainsPath).mtimeMs, mtimeMtn, 'Mountain source should not be modified');
    assert.strictEqual(fs.statSync(candidateLinksPath).mtimeMs, mtimeLinks, 'Candidate links source should not be modified');
    assert.strictEqual(fs.statSync(locationEvidencePath).mtimeMs, mtimeEvidence, 'Location evidence source should not be modified');

    // Cleanup
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
});

// Summary
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exitCode = 1;

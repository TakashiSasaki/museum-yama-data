'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { 
    performAssignment, 
    classifyMunicipalityCompatibility, 
    classifyNameEvidence 
} = require('../lib/gemini_grounded_balanced_summit_assignment');
const assignCommand = require('../commands/assign-mountain-summits-gemini-grounded-balanced');

// Helper to write JSON lines
function writeJsonl(filePath, records) {
    fs.writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

(async function runTests() {
    console.log('--- Starting Gemini-Grounded Balanced Mountain Summit Assignment Unit Tests ---');

    // 1. Test Municipality Compatibility Classifier
    const mockAdjacency = {
        land_adjacent: {
            '西条市': ['新居浜市'],
            '新居浜市': ['西条市']
        }
    };

    assert.strictEqual(
        classifyMunicipalityCompatibility('西条市', { primary_municipality_name: '西条市' }, mockAdjacency),
        'municipality_exact'
    );
    assert.strictEqual(
        classifyMunicipalityCompatibility('西条市', { primary_municipality_name: null, municipality_matches: [{ name: '西条市' }] }, mockAdjacency),
        'municipality_boundary_compatible'
    );
    assert.strictEqual(
        classifyMunicipalityCompatibility('西条市', { lookup_status: 'boundary_ambiguous', municipality_matches: [{ name: '西条市' }] }, mockAdjacency),
        'municipality_boundary_compatible'
    );
    assert.strictEqual(
        classifyMunicipalityCompatibility('西条市', { primary_municipality_name: '新居浜市' }, mockAdjacency),
        'municipality_adjacent'
    );
    assert.strictEqual(
        classifyMunicipalityCompatibility('西条市', { primary_municipality_name: '松山市', municipality_matches: [] }, mockAdjacency),
        'municipality_mismatch'
    );
    assert.strictEqual(
        classifyMunicipalityCompatibility('西条市', { lookup_status: 'outside_prefecture' }, mockAdjacency),
        'municipality_outside_prefecture'
    );
    console.log('  ✓ classifyMunicipalityCompatibility assertions passed');

    // 2. Test Name Evidence Classifier and Short Name Safeguards
    // Normal name
    const ne1 = classifyNameEvidence('東三方ヶ森', { track_name: '東三方ヶ森山行' }, []);
    assert.strictEqual(ne1.tier, 'name_exact_track_contains');
    
    // Normal name from activity title
    const ne2 = classifyNameEvidence('東三方ヶ森', { track_name: '別名' }, ['東三方ヶ森の登山']);
    assert.strictEqual(ne2.tier, 'name_exact_activity_title_contains');

    // Short name safeguard: "吉山" inside "高吉山" (mismatch/weak token containment) vs "吉山・高森山" (contains as exact token/substring token)
    const ne3 = classifyNameEvidence('吉山', { track_name: '高吉山' }, []);
    assert.strictEqual(ne3.tier, 'name_token_containment_strong'); // Weak fuzzy/token, but not exact contains since "吉山" is not a token in "高吉山"
    
    const ne4 = classifyNameEvidence('吉山', { track_name: '高森山・吉山・東山' }, []);
    assert.strictEqual(ne4.tier, 'name_exact_track_contains'); // Matches exactly because it is a token or a suffix-completed match of "吉山"

    const ne5 = classifyNameEvidence('吉', { track_name: '吉山' }, []);
    assert.strictEqual(ne5.tier, 'name_exact_track_contains'); // Matches because "吉" is short, but "吉山" matches吉+suffix
    
    const ne6 = classifyNameEvidence('吉', { track_name: '高山' }, []);
    assert.strictEqual(ne6.tier, 'name_missing'); // Short name does not overmatch

    console.log('  ✓ classifyNameEvidence assertions passed');

    // 3. Command Integration and Namespace Checks
    const tempDir = path.join(__dirname, 'temp_test_balanced_assignment');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    const mountainsPath = path.join(tempDir, 'mountains.json');
    const summitCandidatesPath = path.join(tempDir, 'summit_candidates.jsonl');
    const groundingReferencePath = path.join(tempDir, 'grounding_reference.jsonl');
    const municipalityLookupPath = path.join(tempDir, 'municipality_lookup.jsonl');
    const municipalityStabilityPath = path.join(tempDir, 'municipality_stability.jsonl');
    const municipalityAdjacencyPath = path.join(tempDir, 'municipality_adjacency.json');
    const activityLinksPath = path.join(tempDir, 'activity_links.jsonl');
    
    const outPath = path.join(tempDir, 'proposed_assignments.jsonl');
    const candidateSupportLinksPath = path.join(tempDir, 'candidate_support_links.jsonl');
    const prunedLogPath = path.join(tempDir, 'pruned_log.jsonl');
    const manifestPath = path.join(tempDir, 'manifest.json');
    const reviewDir = path.join(tempDir, 'review_reporting');
    const reportPath = path.join(tempDir, 'report.md');

    // Setup 531 mock mountains to satisfy counts validation
    const mockMountains = [];
    const mockGroundings = [];

    // Mountain 1: auto_supported_not_canonical (GPX within 50m, name exact, muni exact)
    mockMountains.push({
        mountain_no: 1,
        name: '石鎚山',
        source_row_no: 1,
        location: { municipality: '西条市' },
        coordinates: { lat: 33.76, lon: 133.12 },
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
        selected_grounding_confidence_score: 0.95
    });

    // Populate the rest to reach 531
    for (let i = 2; i <= 531; i++) {
        mockMountains.push({
            mountain_no: i,
            name: `Mountain ${i}`,
            source_row_no: i,
            location: { municipality: '松山市' },
            coordinates: { lat: 33.84, lon: 132.76 },
            elevation_m: 500
        });
        mockGroundings.push({
            mountain_no: i,
            mountain_name: `Mountain ${i}`,
            has_usable_coordinate: true,
            coordinate_conflict: false,
            selected_grounding_lat: 33.8401,
            selected_grounding_lon: 132.7601,
            selected_grounding_elevation_m: 500,
            selected_grounding_confidence_score: 0.9
        });
    }

    const mockCandidates = [
        {
            summit_candidate_id: 'cand_001',
            lat: 33.7602,
            lon: 133.1202,
            ele_m: 1982,
            track_name: '石鎚山ルート',
            source_gpx_basename: 'ishizuchi.gpx',
            source_gpx_path: 'gpx/raw/ishizuchi.gpx'
        }
    ];
    for (let i = 2; i <= 531; i++) {
        mockCandidates.push({
            summit_candidate_id: `cand_${i}`,
            lat: 33.8402,
            lon: 132.7602,
            ele_m: 500,
            track_name: `Route ${i}`,
            source_gpx_basename: `mock_${i}.gpx`,
            source_gpx_path: `gpx/raw/mock_${i}.gpx`
        });
    }

    const mockMuniLookups = mockCandidates.map(c => ({
        source_record_id: c.summit_candidate_id,
        primary_municipality_name: c.summit_candidate_id === 'cand_001' ? '西条市' : '松山市',
        primary_municipality_code: '38206',
        municipality_matches: []
    }));

    const mockStability = mockCandidates.map(c => ({
        summit_candidate_id: c.summit_candidate_id,
        municipality_stability: 'stable_interior',
        municipality_stability_reason_codes: [],
        center_distance_to_boundary_m: 1200
    }));

    const mockActivityLinks = [
        {
            gpx_basename: 'ishizuchi.gpx',
            best_candidate: { title: '石鎚山へ登山' },
            title_enriched_candidate_activities: []
        }
    ];

    fs.writeFileSync(mountainsPath, JSON.stringify(mockMountains, null, 2), 'utf8');
    writeJsonl(summitCandidatesPath, mockCandidates);
    writeJsonl(groundingReferencePath, mockGroundings);
    writeJsonl(municipalityLookupPath, mockMuniLookups);
    writeJsonl(municipalityStabilityPath, mockStability);
    writeJsonl(activityLinksPath, mockActivityLinks);
    fs.writeFileSync(municipalityAdjacencyPath, JSON.stringify(mockAdjacency, null, 2), 'utf8');

    // Run performAssignment
    const assignmentResult = await performAssignment({
        mountains: mountainsPath,
        summitCandidates: summitCandidatesPath,
        groundingReference: groundingReferencePath,
        municipalityLookup: municipalityLookupPath,
        municipalityStability: municipalityStabilityPath,
        municipalityAdjacency: municipalityAdjacencyPath,
        activityLinks: activityLinksPath
    });

    const ass = assignmentResult.proposedAssignments;
    const a1 = ass.find(x => x.mountain_no === 1);
    
    // Auto supported verification
    assert.strictEqual(a1.review_category, 'auto_supported_not_canonical');
    assert.strictEqual(a1.needs_human_review, false);
    assert.strictEqual(a1.evidence.name.name_evidence_tier, 'name_exact_track_contains');
    console.log('  ✓ performAssignment auto-supports Mountain 1 correctly');

    // Run assignCommand
    await assignCommand({
        mountains: mountainsPath,
        summitCandidates: summitCandidatesPath,
        groundingReference: groundingReferencePath,
        municipalityLookup: municipalityLookupPath,
        municipalityStability: municipalityStabilityPath,
        municipalityAdjacency: municipalityAdjacencyPath,
        activityLinks: activityLinksPath,
        out: outPath,
        candidateSupportLinks: candidateSupportLinksPath,
        prunedLog: prunedLogPath,
        manifest: manifestPath,
        reviewDir: reviewDir,
        report: reportPath
    });

    assert(fs.existsSync(outPath), 'Output assignments should exist');
    assert(fs.existsSync(manifestPath), 'Output manifest should exist');
    
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifestContent.summary.auto_supported_not_canonical_count > 0, 'Should have some auto-supported mountains');
    console.log(`  ✓ Command executed successfully with ${manifestContent.summary.auto_supported_not_canonical_count} auto-supported counts`);

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('All assign-mountain-summits-gemini-grounded-balanced tests passed.');
})();

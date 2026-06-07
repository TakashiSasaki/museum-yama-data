const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { haversineDistance } = require('../lib/geo_distance');
const { enrichSummitCandidate } = require('../lib/summit_candidate_location_evidence');
const enrichCommand = require('../commands/enrich-summit-candidates-with-reverse-geocoding');

async function run() {
    console.log('--- Testing enrich-summit-candidates-with-reverse-geocoding logic ---');

    // 1. Distance Calculation Tests
    // Distance from Tokyo Tower (35.6586, 139.7454) to Roppongi Hills (35.6605, 139.7292) is ~1480 meters
    const dist = haversineDistance(35.6586, 139.7454, 35.6605, 139.7292);
    assert.ok(Math.abs(dist - 1480) < 50, `Distance should be ~1480m, got ${dist}`);

    // Same coordinates
    assert.strictEqual(haversineDistance(35, 139, 35, 139), 0);

    // 2. Core Enrichment Unit Tests
    const mockGeocodedPoints = [
        {
            geocoded_point_id: 'point:1',
            coordinate_parse_status: 'valid',
            lat: 33.7675,
            lon: 133.1152,
            provider: 'nominatim',
            display_name: 'Place 1, Saijo City, Ehime',
            prefecture: '愛媛県',
            county: null,
            city: '西条市',
            town: null,
            village: null,
            island: null,
            local: 'Local 1',
            raw_file_path: 'raw.json',
            address: { city: '西条市', province: '愛媛県' }
        },
        {
            geocoded_point_id: 'point:2',
            coordinate_parse_status: 'valid',
            lat: 33.7680,
            lon: 133.1160,
            provider: 'nominatim',
            display_name: 'Place 2, Saijo City, Ehime',
            prefecture: '愛媛県',
            county: null,
            city: '西条市',
            town: null,
            village: null,
            island: 'Some Island',
            local: 'Local 2',
            raw_file_path: 'raw.json',
            address: { city: '西条市', province: '愛媛県', island: 'Some Island' }
        },
        {
            geocoded_point_id: 'point:3', // Far point (outside 1000m)
            coordinate_parse_status: 'valid',
            lat: 33.8000,
            lon: 133.1500,
            provider: 'nominatim',
            display_name: 'Far Place, Niihama City, Ehime',
            prefecture: '愛媛県',
            county: null,
            city: '新居浜市',
            town: null,
            village: null,
            island: null,
            local: 'Local 3',
            raw_file_path: 'raw.json',
            address: { city: '新居浜市', province: '愛媛県' }
        },
        {
            geocoded_point_id: 'point:4', // Point near (e.g. 500m) but in a different town to trigger conflict
            coordinate_parse_status: 'valid',
            lat: 33.7690,
            lon: 133.1190,
            provider: 'nominatim',
            display_name: 'Place 4, Ino Town, Kochi',
            prefecture: '高知県',
            county: '吾川郡',
            city: 'いの町',
            town: 'いの町',
            village: null,
            island: null,
            local: 'Local 4',
            raw_file_path: 'raw.json',
            address: { town: 'いの町', county: '吾川郡', province: '高知県' }
        }
    ];

    const mockCandidate = {
        summit_candidate_id: 'candidate:1',
        candidate_status: 'unresolved',
        lat: 33.7674,
        lon: 133.1150,
        ele_m: 1980.0,
        source_gpx_path: 'src.gpx',
        source_gpx_basename: 'src.gpx',
        summit_candidate_gpx_path: 'cand.gpx',
        summit_candidate_gpx_basename: 'cand.gpx',
        track_name: 'Track 1'
    };

    // Test normal matching inside radius
    const enriched = enrichSummitCandidate(mockCandidate, mockGeocodedPoints, 1000);
    assert.strictEqual(enriched.summit_candidate_id, 'candidate:1');
    assert.strictEqual(enriched.location_evidence_status, 'nearby_reverse_geocode_found');
    assert.strictEqual(enriched.border_tolerance_applied, true);
    
    // Nearest should be point:1 (closer than point:2 and point:4)
    assert.strictEqual(enriched.nearest_geocoded_point_id, 'point:1');
    assert.ok(enriched.nearest_distance_m < 50);

    // Sorted check
    const pts = enriched.nearby_reverse_geocoded_points;
    assert.strictEqual(pts.length, 3); // point:1, point:2, point:4 are within 1000m
    assert.strictEqual(pts[0].geocoded_point_id, 'point:1');
    assert.strictEqual(pts[1].geocoded_point_id, 'point:2');
    assert.strictEqual(pts[2].geocoded_point_id, 'point:4');
    assert.ok(pts[0].distance_m <= pts[1].distance_m);
    assert.ok(pts[1].distance_m <= pts[2].distance_m);

    // Candidates aggregation checks
    assert.deepStrictEqual(enriched.prefecture_candidates, ['愛媛県', '高知県']);
    assert.deepStrictEqual(enriched.city_candidates, ['西条市', 'いの町']);
    assert.deepStrictEqual(enriched.island_candidates, ['Some Island']);

    // Check location_candidates summary structure
    assert.ok(enriched.location_candidates.length > 0);
    const islandCand = enriched.location_candidates.find(c => c.location_type === 'island');
    assert.strictEqual(islandCand.location_name, 'Some Island');
    assert.strictEqual(islandCand.support_count, 1);

    // Conflict check (prefectures [愛媛県, 高知県] and cities [西条市, いの町])
    assert.strictEqual(enriched.needs_review, true);
    assert.ok(enriched.notes.includes('Conflicting'));

    // Test no nearby points
    const enrichedNoMatch = enrichSummitCandidate(mockCandidate, mockGeocodedPoints, 10);
    assert.strictEqual(enrichedNoMatch.location_evidence_status, 'no_nearby_reverse_geocode_point');
    assert.strictEqual(enrichedNoMatch.location_evidence_level, 'none');
    assert.strictEqual(enrichedNoMatch.needs_review, true);
    assert.strictEqual(enrichedNoMatch.nearest_geocoded_point_id, null);
    assert.strictEqual(enrichedNoMatch.nearby_reverse_geocoded_points.length, 0);

    // Test invalid coordinates
    const badCandidate = { ...mockCandidate, lat: 'invalid' };
    const enrichedBad = enrichSummitCandidate(badCandidate, mockGeocodedPoints, 1000);
    assert.strictEqual(enrichedBad.location_evidence_status, 'invalid_candidate_coordinates');
    assert.strictEqual(enrichedBad.needs_review, true);

    // 3. Integration Command Tests
    const tempTestDir = path.join(__dirname, 'temp_enrichment_test');
    if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempTestDir, { recursive: true });

    const candFile = path.join(tempTestDir, 'summit_candidates.jsonl');
    fs.writeFileSync(candFile, JSON.stringify(mockCandidate) + '\n', 'utf8');

    const pointsFile = path.join(tempTestDir, 'geocoded_points_index.jsonl');
    fs.writeFileSync(pointsFile, mockGeocodedPoints.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf8');

    const outJsonl = path.join(tempTestDir, 'summit_candidate_location_evidence.jsonl');
    const outManifest = path.join(tempTestDir, 'manifest.json');
    const outReport = path.join(tempTestDir, 'report.md');

    await enrichCommand({
        summitCandidates: candFile,
        geocodedPoints: pointsFile,
        out: outJsonl,
        manifest: outManifest,
        report: outReport,
        radiusM: 1000
    });

    assert.ok(fs.existsSync(outJsonl));
    assert.ok(fs.existsSync(outManifest));
    assert.ok(fs.existsSync(outReport));

    // Verify JSONL content
    const jsonlContent = fs.readFileSync(outJsonl, 'utf8').trim().split('\n');
    assert.strictEqual(jsonlContent.length, 1);
    const parsed = JSON.parse(jsonlContent[0]);
    assert.strictEqual(parsed.summit_candidate_id, 'candidate:1');
    assert.strictEqual(parsed.location_evidence_status, 'nearby_reverse_geocode_found');

    // Verify Manifest
    const manifestObj = JSON.parse(fs.readFileSync(outManifest, 'utf8'));
    assert.strictEqual(manifestObj.stage, 'enrich_summit_candidates_with_reverse_geocoding');
    assert.strictEqual(manifestObj.summary.summit_candidate_records, 1);
    assert.strictEqual(manifestObj.summary.output_records, 1);

    // Collision check
    await assert.rejects(async () => {
        await enrichCommand({
            summitCandidates: candFile,
            geocodedPoints: pointsFile,
            out: outJsonl,
            manifest: outManifest,
            report: outReport,
            radiusM: 1000
        });
    }, /Output file already exists/);

    // Cleanup
    fs.rmSync(tempTestDir, { recursive: true, force: true });

    console.log('enrich-summit-candidates-with-reverse-geocoding tests passed!');
}

if (require.main === module) {
    run().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
}
module.exports = run;


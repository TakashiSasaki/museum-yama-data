const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { extractSummitCandidateFeatures } = require('../lib/summit_candidate_features');
const extractCommand = require('../commands/extract-summit-candidate-features');

async function run() {
    console.log('--- Testing extract-summit-candidate-features logic ---');

    // 1. Core logic tests with mock GPX read function
    const mockManifest = {
        stage: 'generate_summit_candidate_gpx',
        parameters: {
            smooth_window: 5,
            peak_radius: 10,
            min_prominence: 30,
            merge_distance: 100
        },
        files: [
            {
                source_gpx_path: 'data/raw/yamap_2022-01-15_08_17.gpx',
                source_gpx_sha256: 'abc111',
                output_gpx_path: 'data/reporting/yamap_2022-01-15_08_17.gpx',
                output_gpx_sha256: 'def222',
                track_name: '関ヶ森',
                bounds: { minlat: 33, minlon: 132, maxlat: 34, maxlon: 133 },
                trackpoint_count: 812,
                summit_candidate_count: 2,
                candidate_ids: ['summit-candidate:a0c35720552a78c8', 'summit-candidate:cb62a56e70cedbce']
            },
            {
                source_gpx_path: 'data/raw/zero_candidates.gpx',
                source_gpx_sha256: 'zero111',
                output_gpx_path: 'data/reporting/zero_candidates.gpx',
                output_gpx_sha256: 'zero222',
                track_name: 'Empty Track',
                bounds: { minlat: 33, minlon: 132, maxlat: 34, maxlon: 133 },
                trackpoint_count: 24,
                summit_candidate_count: 0,
                candidate_ids: []
            }
        ]
    };

    const mockGpxData = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <wpt lat="33.8560" lon="132.8432">
    <ele>573.7</ele>
    <name>summit-candidate:a0c35720552a78c8</name>
    <desc>Summit candidate 1</desc>
  </wpt>
  <wpt lat="33.8382" lon="132.8403">
    <ele>495.6</ele>
    <!-- Mismatched name format to test ID fallback -->
    <name>Some random peak name</name>
    <desc>Summit candidate 2</desc>
  </wpt>
</gpx>`;

    const mockReadFn = (gpxPath) => {
        if (gpxPath.includes('yamap_2022-01-15_08_17.gpx')) {
            return mockGpxData;
        }
        throw new Error(`File not found: ${gpxPath}`);
    };

    const { records, summary } = extractSummitCandidateFeatures(mockManifest, mockReadFn);

    // Verify record counts and summary
    assert.strictEqual(summary.input_summit_candidate_gpx_count, 2);
    assert.strictEqual(summary.output_candidate_records, 2);
    assert.strictEqual(summary.zero_candidate_gpx_count, 1);
    assert.strictEqual(summary.candidate_ids_unique, true);
    assert.strictEqual(summary.lat_lon_valid, true);
    assert.strictEqual(records.length, 2);

    // Verify Record 1 (explicit ID in waypoint name)
    const rec1 = records[0];
    assert.strictEqual(rec1.summit_candidate_id, 'summit-candidate:a0c35720552a78c8');
    assert.strictEqual(rec1.candidate_status, 'unresolved');
    assert.strictEqual(rec1.source_gpx_path, 'data/raw/yamap_2022-01-15_08_17.gpx');
    assert.strictEqual(rec1.source_gpx_basename, 'yamap_2022-01-15_08_17.gpx');
    assert.strictEqual(rec1.summit_candidate_gpx_path, 'data/reporting/yamap_2022-01-15_08_17.gpx');
    assert.strictEqual(rec1.summit_candidate_gpx_basename, 'yamap_2022-01-15_08_17.gpx');
    assert.strictEqual(rec1.track_name, '関ヶ森');
    assert.strictEqual(rec1.candidate_index_in_gpx, 1);
    assert.strictEqual(rec1.lat, 33.8560);
    assert.strictEqual(rec1.lon, 132.8432);
    assert.strictEqual(rec1.ele_m, 573.7);
    assert.strictEqual(rec1.waypoint_name, 'summit-candidate:a0c35720552a78c8');
    assert.strictEqual(rec1.waypoint_desc, 'Summit candidate 1');
    assert.strictEqual(rec1.detection_stage, 'generate_summit_candidate_gpx');
    assert.deepStrictEqual(rec1.detection_parameters, mockManifest.parameters);
    assert.strictEqual(rec1.manifest_trackpoint_count, 812);
    assert.deepStrictEqual(rec1.manifest_bounds, mockManifest.files[0].bounds);
    assert.strictEqual(rec1.source_manifest_record_index, 0);

    // Verify Record 2 (fallback ID from candidate_ids manifest array)
    const rec2 = records[1];
    assert.strictEqual(rec2.summit_candidate_id, 'summit-candidate:cb62a56e70cedbce');
    assert.strictEqual(rec2.waypoint_name, 'Some random peak name');
    assert.strictEqual(rec2.candidate_index_in_gpx, 2);

    // Test: Coordinate Lat out of bounds
    const badLatGpx = mockGpxData.replace('lat="33.8560"', 'lat="95.0"');
    assert.throws(() => {
        extractSummitCandidateFeatures(mockManifest, () => badLatGpx);
    }, /Invalid latitude value/);

    // Test: Coordinate Lon out of bounds
    const badLonGpx = mockGpxData.replace('lon="132.8432"', 'lon="-200.0"');
    assert.throws(() => {
        extractSummitCandidateFeatures(mockManifest, () => badLonGpx);
    }, /Invalid longitude value/);

    // Test: Mismatched candidate count
    const badCountManifest = {
        ...mockManifest,
        files: [{ ...mockManifest.files[0], summit_candidate_count: 5 }]
    };
    assert.throws(() => {
        extractSummitCandidateFeatures(badCountManifest, mockReadFn);
    }, /Candidate count mismatch/);

    // Test: Duplicate ID checking
    const duplicateIdGpx = mockGpxData.replace('Some random peak name', 'summit-candidate:a0c35720552a78c8');
    assert.throws(() => {
        extractSummitCandidateFeatures(mockManifest, () => duplicateIdGpx);
    }, /Duplicate summit_candidate_id detected/);

    // 2. Integration Command Tests
    const tempTestDir = path.join(__dirname, 'temp_feature_extraction_test');
    if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempTestDir, { recursive: true });

    const mockManifestPath = path.join(tempTestDir, 'manifest.json');
    const mockGpxDir = path.join(tempTestDir, 'gpx');
    fs.mkdirSync(mockGpxDir, { recursive: true });

    // Write mock manifest referencing relative output paths
    const diskManifest = {
        stage: 'generate_summit_candidate_gpx',
        parameters: { smooth_window: 5 },
        files: [
            {
                source_gpx_path: 'data/raw/yamap_2022-01-15_08_17.gpx',
                source_gpx_sha256: 'abc111',
                output_gpx_path: 'yamap_2022-01-15_08_17.gpx', // filename resolved in mockGpxDir
                output_gpx_sha256: 'def222',
                track_name: '関ヶ森',
                bounds: { minlat: 33, minlon: 132, maxlat: 34, maxlon: 133 },
                trackpoint_count: 812,
                summit_candidate_count: 1,
                candidate_ids: ['summit-candidate:a0c35720552a78c8']
            }
        ]
    };
    fs.writeFileSync(mockManifestPath, JSON.stringify(diskManifest, null, 2), 'utf8');

    const singleWptGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <wpt lat="33.8560" lon="132.8432">
    <ele>573.7</ele>
    <name>summit-candidate:a0c35720552a78c8</name>
    <desc>Summit candidate 1</desc>
  </wpt>
</gpx>`;
    fs.writeFileSync(path.join(mockGpxDir, 'yamap_2022-01-15_08_17.gpx'), singleWptGpx, 'utf8');

    const outJsonl = path.join(tempTestDir, 'summit_candidates.jsonl');
    const outManifest = path.join(tempTestDir, 'out_manifest.json');
    const outReport = path.join(tempTestDir, 'report.md');

    // Run command
    await extractCommand({
        gpxDir: mockGpxDir,
        inputManifest: mockManifestPath,
        out: outJsonl,
        manifest: outManifest,
        report: outReport
    });

    // Check outputs exist
    assert.ok(fs.existsSync(outJsonl));
    assert.ok(fs.existsSync(outManifest));
    assert.ok(fs.existsSync(outReport));

    // Verify JSONL content
    const jsonlContent = fs.readFileSync(outJsonl, 'utf8').trim();
    const parsedLine = JSON.parse(jsonlContent);
    assert.strictEqual(parsedLine.summit_candidate_id, 'summit-candidate:a0c35720552a78c8');
    assert.strictEqual(parsedLine.candidate_status, 'unresolved');

    // Verify Manifest content
    const manifestJson = JSON.parse(fs.readFileSync(outManifest, 'utf8'));
    assert.strictEqual(manifestJson.stage, 'extract_summit_candidate_features');
    assert.strictEqual(manifestJson.summary.output_candidate_records, 1);

    // Test: Collision failure
    await assert.rejects(async () => {
        await extractCommand({
            gpxDir: mockGpxDir,
            inputManifest: mockManifestPath,
            out: outJsonl,
            manifest: outManifest,
            report: outReport
        });
    }, /Output file already exists/);

    // Cleanup temp files
    fs.rmSync(tempTestDir, { recursive: true, force: true });

    console.log('extract-summit-candidate-features tests passed!');
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

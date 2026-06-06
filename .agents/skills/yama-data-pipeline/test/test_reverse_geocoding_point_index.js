const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { extractGeocodedPoints } = require('../lib/reverse_geocoding_point_index');
const extractCommand = require('../commands/extract-reverse-geocoding-point-index');

async function run() {
    console.log('--- Testing extract-reverse-geocoding-point-index logic ---');

    // 1. Core library logic tests
    const mockRawArray = [
        {
            type: 'waypoint',
            source_file: 'all_unique_summits.gpx',
            source_point: {
                lat: 33.7675,
                lon: 133.1152,
                name: '天狗岳',
                ele: 1979.1
            },
            reverse_geocoding: {
                provider: 'nominatim.openstreetmap.org',
                requests: {
                    ja: {
                        response: {
                            body: {
                                display_name: '石鎚神社, 西条市, 愛媛県, 日本',
                                address: {
                                    road: '三の鎖',
                                    city: '西条市',
                                    province: '愛媛県',
                                    island: '石鎚島'
                                }
                            }
                        }
                    }
                }
            },
            metadata: { original_type: 'waypoint' }
        },
        {
            // Missing source_point or coordinates
            type: 'waypoint',
            source_file: 'no_coords.gpx',
            reverse_geocoding: {
                provider: 'nominatim.openstreetmap.org',
                requests: {
                    ja: {
                        response: {
                            body: {
                                display_name: 'Unknown Place',
                                address: {
                                    state: '愛媛県',
                                    county: '越智郡',
                                    town: '上島町',
                                    suburb: '弓削'
                                }
                            }
                        }
                    }
                }
            }
        }
    ];

    const records = extractGeocodedPoints(mockRawArray, 'test_file.json', 'sha256_mock');

    assert.strictEqual(records.length, 2);

    // Record 1 (fully valid)
    const r1 = records[0];
    assert.strictEqual(r1.geocoded_point_id, 'nominatim.openstreetmap.org:test_file.json:0');
    assert.strictEqual(r1.provider, 'nominatim.openstreetmap.org');
    assert.strictEqual(r1.raw_file_path, 'test_file.json');
    assert.strictEqual(r1.raw_file_sha256, 'sha256_mock');
    assert.strictEqual(r1.raw_record_index, 0);
    assert.strictEqual(r1.source_file, 'all_unique_summits.gpx');
    assert.strictEqual(r1.lat, 33.7675);
    assert.strictEqual(r1.lon, 133.1152);
    assert.strictEqual(r1.display_name, '石鎚神社, 西条市, 愛媛県, 日本');
    assert.deepStrictEqual(r1.address, mockRawArray[0].reverse_geocoding.requests.ja.response.body.address);
    assert.strictEqual(r1.prefecture, '愛媛県');
    assert.strictEqual(r1.county, null);
    assert.strictEqual(r1.city, '西条市');
    assert.strictEqual(r1.island, '石鎚島');
    assert.strictEqual(r1.local, '三 of lock' ? r1.local : null); // mapped from road ('三の鎖')
    assert.strictEqual(r1.local, '三の鎖');
    assert.deepStrictEqual(r1.metadata, mockRawArray[0].metadata);
    assert.strictEqual(r1.raw_snapshot_preserved, true);
    assert.strictEqual(r1.coordinate_parse_status, 'valid');
    assert.strictEqual(r1.address_extract_status, 'valid');

    // Record 2 (missing coordinates, state/county/town/suburb mapping)
    const r2 = records[1];
    assert.strictEqual(r2.geocoded_point_id, 'nominatim.openstreetmap.org:test_file.json:1');
    assert.strictEqual(r2.lat, null);
    assert.strictEqual(r2.lon, null);
    assert.strictEqual(r2.coordinate_parse_status, 'missing');
    assert.strictEqual(r2.prefecture, '愛媛県'); // mapped from state
    assert.strictEqual(r2.county, '越智郡');
    assert.strictEqual(r2.city, '上島町'); // mapped from town
    assert.strictEqual(r2.town, '上島町');
    assert.strictEqual(r2.local, '弓削'); // mapped from suburb

    // Non-array input check
    assert.throws(() => {
        extractGeocodedPoints({ not: 'an array' }, 'file.json', 'sha');
    }, /must be a JSON array/);

    // 2. Integration Command Tests
    const tempTestDir = path.join(__dirname, 'temp_geocoding_test');
    if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempTestDir, { recursive: true });

    const rawDir = path.join(tempTestDir, 'raw_nominatim');
    fs.mkdirSync(rawDir, { recursive: true });

    const rawFile1 = path.join(rawDir, 'points1.json');
    fs.writeFileSync(rawFile1, JSON.stringify([mockRawArray[0]], null, 2), 'utf8');

    const rawFile2 = path.join(rawDir, 'points2.json');
    fs.writeFileSync(rawFile2, JSON.stringify([mockRawArray[1]], null, 2), 'utf8');

    const outJsonl = path.join(tempTestDir, 'geocoded_points_index.jsonl');
    const outManifest = path.join(tempTestDir, 'manifest.json');
    const outReport = path.join(tempTestDir, 'report.md');

    await extractCommand({
        inputDir: rawDir,
        out: outJsonl,
        manifest: outManifest,
        report: outReport
    });

    assert.ok(fs.existsSync(outJsonl));
    assert.ok(fs.existsSync(outManifest));
    assert.ok(fs.existsSync(outReport));

    // Verify JSONL content
    const jsonlContent = fs.readFileSync(outJsonl, 'utf8').trim().split('\n');
    assert.strictEqual(jsonlContent.length, 2);
    const parsed1 = JSON.parse(jsonlContent[0]);
    const parsed2 = JSON.parse(jsonlContent[1]);
    assert.strictEqual(parsed1.provider, 'nominatim.openstreetmap.org');
    assert.strictEqual(parsed2.prefecture, '愛媛県');

    // Verify Manifest
    const manifestObj = JSON.parse(fs.readFileSync(outManifest, 'utf8'));
    assert.strictEqual(manifestObj.stage, 'extract_reverse_geocoding_point_index');
    assert.strictEqual(manifestObj.summary.raw_file_count, 2);
    assert.strictEqual(manifestObj.summary.output_records, 2);
    assert.strictEqual(manifestObj.summary.records_with_valid_coordinates, 1);
    assert.strictEqual(manifestObj.summary.records_without_valid_coordinates, 1);

    // Collision check
    await assert.rejects(async () => {
        await extractCommand({
            inputDir: rawDir,
            out: outJsonl,
            manifest: outManifest,
            report: outReport
        });
    }, /Output file already exists/);

    // Cleanup
    fs.rmSync(tempTestDir, { recursive: true, force: true });

    console.log('extract-reverse-geocoding-point-index tests passed!');
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

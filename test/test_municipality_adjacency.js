'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { processAdjacency } = require('../lib/municipality_adjacency');
const generateEhimeAdjacency = require('../commands/generate-ehime-municipality-adjacency');

async function runTests() {
    console.log('--- Running Municipality Adjacency Unit Tests ---');

    // 1. Mock GeoJSON data for processing
    const mockGeojson = {
        type: "FeatureCollection",
        features: [
            // Mun 1: Matsuyama (38201) - Square from (0,0) to (1,1)
            {
                type: "Feature",
                properties: { N03_001: "愛媛県", N03_004: "松山市", N03_007: "38201" },
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
                    ]
                }
            },
            // Mun 2: Imabari (38202) - Shares edge x=1 from y=0 to y=1
            {
                type: "Feature",
                properties: { N03_001: "愛媛県", N03_004: "今治市", N03_007: "38202" },
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [[1.0, 0.0], [2.0, 0.0], [2.0, 1.0], [1.0, 1.0], [1.0, 0.0]]
                    ]
                }
            },
            // Mun 3: Uwajima (38203) - Point contact at (2,1)
            {
                type: "Feature",
                properties: { N03_001: "愛媛県", N03_004: "宇和島市", N03_007: "38203" },
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [[2.0, 1.0], [3.0, 1.0], [3.0, 2.0], [2.0, 2.0], [2.0, 1.0]]
                    ]
                }
            },
            // Mun 4: Yawatahama (38204) - Far away (not adjacent)
            {
                type: "Feature",
                properties: { N03_001: "愛媛県", N03_004: "八幡浜市", N03_007: "38204" },
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [[4.0, 4.0], [5.0, 4.0], [5.0, 5.0], [4.0, 5.0], [4.0, 4.0]]
                    ]
                }
            },
            // Add other 16 mock municipalities to make exactly 20 (as required by validation check in library)
            ...Array.from({ length: 16 }, (_, idx) => {
                const codeNum = 38205 + idx;
                const name = `MockMun_${codeNum}`;
                const baseCoord = 10.0 + idx * 2.0;
                return {
                    type: "Feature",
                    properties: { N03_001: "愛媛県", N03_004: name, N03_007: String(codeNum) },
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [[baseCoord, baseCoord], [baseCoord + 1.0, baseCoord], [baseCoord + 1.0, baseCoord + 1.0], [baseCoord, baseCoord + 1.0], [baseCoord, baseCoord]]
                        ]
                    }
                };
            })
        ]
    };

    // 2. Validate processAdjacency output structure
    const result = processAdjacency(mockGeojson);
    
    assert.strictEqual(result.summary.municipality_count, 20, "Should contain exactly 20 municipalities");
    assert.strictEqual(result.summary.pair_count, 190, "Should generate exactly 190 pairs (20 * 19 / 2)");
    
    // Check line boundary contact (confirmed_land_boundary)
    const pair1_2 = result.pairs.find(p => p.municipality_a_name === "松山市" && p.municipality_b_name === "今治市");
    assert.ok(pair1_2, "Pair 松山市 — 今治市 should exist");
    assert.strictEqual(pair1_2.relationship, "confirmed_land_boundary", "Matsuyama & Imabari share a line boundary");
    assert.strictEqual(pair1_2.boundary_intersection_type, "line");
    assert.ok(pair1_2.shared_boundary_length_m > 100000, "Shared boundary length should be large");

    // Check point boundary contact (point_contact_only)
    const pair2_3 = result.pairs.find(p => p.municipality_a_name === "今治市" && p.municipality_b_name === "宇和島市");
    assert.ok(pair2_3, "Pair 今治市 — 宇和島市 should exist");
    assert.strictEqual(pair2_3.relationship, "point_contact_only", "Imabari & Uwajima touch only at a point");
    assert.strictEqual(pair2_3.boundary_intersection_type, "point");

    // Check no contact (not_adjacent)
    const pair1_4 = result.pairs.find(p => p.municipality_a_name === "松山市" && p.municipality_b_name === "八幡浜市");
    assert.ok(pair1_4, "Pair 松山市 — 八幡浜市 should exist");
    assert.strictEqual(pair1_4.relationship, "not_adjacent", "Matsuyama & Yawatahama are not adjacent");
    assert.strictEqual(pair1_4.boundary_intersection_type, "none");

    console.log("✅ Core Adjacency calculation logic verified successfully!");

    // 3. Test Command File & CLI execution staging/collisions
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-mun-adj-'));
    const mockGeojsonPath = path.join(tempDir, 'mock_n03.geojson');
    const mockRawManifestPath = path.join(tempDir, 'mock_raw_manifest.json');
    const mockExtManifestPath = path.join(tempDir, 'mock_ext_manifest.json');
    const outDir = path.join(tempDir, 'out');
    const manifestPath = path.join(tempDir, 'out_manifest.json');
    const reportPath = path.join(tempDir, 'report.md');

    fs.writeFileSync(mockGeojsonPath, JSON.stringify(mockGeojson, null, 2), 'utf-8');
    fs.writeFileSync(mockRawManifestPath, JSON.stringify({ summary: { source_files_modified: false } }, null, 2), 'utf-8');
    fs.writeFileSync(mockExtManifestPath, JSON.stringify({ summary: { source_files_modified: false } }, null, 2), 'utf-8');

    // Run Command function and check outputs
    try {
        await generateEhimeAdjacency({
            n03Geojson: mockGeojsonPath,
            rawManifest: mockRawManifestPath,
            extractedManifest: mockExtManifestPath,
            outDir: outDir,
            manifest: manifestPath,
            report: reportPath,
            isTest: true
        });


        // Assert all files created
        assert.ok(fs.existsSync(path.join(outDir, 'municipality_adjacency.json')), 'adjacency.json should exist');
        assert.ok(fs.existsSync(path.join(outDir, 'municipality_adjacency_pair_validation.csv')), 'validation csv should exist');
        assert.ok(fs.existsSync(path.join(outDir, 'municipality_land_adjacency_edges.csv')), 'edges csv should exist');
        assert.ok(fs.existsSync(manifestPath), 'manifest JSON should exist');
        assert.ok(fs.existsSync(reportPath), 'report markdown should exist');

        // Check manifest outputs
        const manifestObj = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        assert.strictEqual(manifestObj.summary.municipality_count, 20);
        assert.strictEqual(manifestObj.summary.pair_count, 190);
        assert.strictEqual(manifestObj.summary.confirmed_land_boundary_pairs, 1);
        assert.strictEqual(manifestObj.summary.point_contact_only_pairs, 1);
        assert.strictEqual(manifestObj.summary.not_adjacent_pairs, 188);

        // Check path collision check throws error
        await assert.rejects(async () => {
            await generateEhimeAdjacency({
                n03Geojson: mockGeojsonPath,
                rawManifest: mockRawManifestPath,
                extractedManifest: mockExtManifestPath,
                outDir: outDir,
                manifest: manifestPath,
                report: reportPath
            });
        }, /Target collision:/, "Should prevent overwriting outputs");

        // Clean up tempDir
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("✅ Command handler staging, validation, and collision checks verified successfully!");
        console.log("Adjacency unit tests passed!");
    } catch (err) {
        console.error('❌ Command execution test failed:', err);
        process.exit(1);
    }
}


module.exports = { runTests };
if (require.main === module) {
    runTests().catch(err => {
        console.error(err);
        process.exit(1);
    });
}


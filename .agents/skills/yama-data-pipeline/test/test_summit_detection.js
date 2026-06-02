const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { detectSummitCandidates, normalizeDetectionConfig, DEFAULT_SUMMIT_DETECTION_CONFIG } = require('../lib/summit_detection');

console.log('Testing summit_detection.js...');

// 1. Config normalization
const config1 = normalizeDetectionConfig({});
assert.strictEqual(config1.smoothWindow, DEFAULT_SUMMIT_DETECTION_CONFIG.smoothWindow);

const config2 = normalizeDetectionConfig({ smoothWindow: 7, minProminence: 10 });
assert.strictEqual(config2.smoothWindow, 7);
assert.strictEqual(config2.minProminence, 10);
assert.strictEqual(config2.peakRadius, DEFAULT_SUMMIT_DETECTION_CONFIG.peakRadius);

// 2. Missing elevation handling
const points = [
    { lat: 10, lon: 10, ele: 100 },
    { lat: 10, lon: 10, ele: 110 },
    { lat: 10, lon: 10, ele: null },  // Should be ignored
    { lat: 10, lon: 10 },             // Should be ignored
    { lat: 10, lon: 10, ele: 120 },
    { lat: 10, lon: 10, ele: 150 },   // Local max
    { lat: 10, lon: 10, ele: 130 },
    { lat: 10, lon: 10, ele: 110 },
    { lat: 10, lon: 10, ele: 110 },
    { lat: 10, lon: 10, ele: 110 }
];

const config3 = normalizeDetectionConfig({ smoothWindow: 1, peakRadius: 1, minProminence: 10, mergeDistance: 0 });
const candidates = detectSummitCandidates(points, config3);

// We expect the local max at ele 150 to be detected.
assert.strictEqual(candidates.length > 0, true, "Should detect at least one candidate");
const peak = candidates[0];
assert.strictEqual(peak.ele, 150);
assert.strictEqual(peak.source_trackpoint_index, 5); // index in original array
assert.strictEqual(peak.valid_elevation_index, 3);   // index in validPoints array
assert.ok(peak.prominence >= 10);
assert.strictEqual(peak.detection_method, 'local_maxima_with_prominence');
assert.ok(peak.detection_parameters.includes('min_prominence=10'));
assert.strictEqual(peak.name, undefined, "Mountain name should not be assigned");

// 3. Command Line Tests
console.log('Testing detect-candidates command...');
const cliPath = path.resolve(__dirname, '../cli.js');
const fixturePath = path.resolve(__dirname, 'fixtures');
const outCsvPath = path.resolve(__dirname, 'test_output_candidates.csv');

if (!fs.existsSync(fixturePath)) {
    fs.mkdirSync(fixturePath, { recursive: true });
}

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="35.0" lon="135.0"><ele>100</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>150</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>200</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>250</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>200</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>150</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>100</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>100</ele></trkpt>
      <trkpt lat="35.0" lon="135.0"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const fixtureFile = path.join(fixturePath, 'sample_test.gpx');
fs.writeFileSync(fixtureFile, sampleGpx);

// Test fail when missing args
try {
    execSync(`node "${cliPath}" detect-candidates`, { stdio: 'pipe' });
    assert.fail("Should have thrown error for missing args");
} catch (e) {
    assert.ok(e.message.includes('Command failed'));
}

// Test successful run
execSync(`node "${cliPath}" detect-candidates --input "${fixtureFile}" --out "${outCsvPath}" --smooth-window 1 --peak-radius 1 --min-prominence 10`, { stdio: 'pipe' });

assert.ok(fs.existsSync(outCsvPath), "CSV should be created");
const csvContent = fs.readFileSync(outCsvPath, 'utf8');
const lines = csvContent.split('\n').filter(l => l.trim() !== '');

assert.ok(lines.length > 1, "CSV should have header and at least one data row");
assert.ok(lines[0].includes('summit_candidate_id'), "Header should contain summit_candidate_id");
assert.ok(!lines[0].includes('name'), "Header should NOT contain mountain name");
assert.ok(lines[1].includes('summit-candidate:'), "ID should be formatted correctly");
assert.ok(lines[1].includes('unresolved'), "Candidate status should be unresolved");

// Cleanup
fs.unlinkSync(fixtureFile);
fs.unlinkSync(outCsvPath);

console.log('All tests passed!');

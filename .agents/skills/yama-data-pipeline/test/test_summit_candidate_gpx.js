const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const generateSummitCandidateGpx = require('../commands/generate-summit-candidate-gpx');
const { parseGpx, extractTrackPoints } = require('../lib/gpx');

console.log('Testing generate-summit-candidate-gpx.js...');

const cliPath = path.resolve(__dirname, '../cli.js');
const fixturePath = path.resolve(__dirname, 'fixtures');
const testOutDir = path.resolve(__dirname, 'test_output_gpx');
const testManifest = path.resolve(__dirname, 'test_output_gpx/manifest.json');
const testReport = path.resolve(__dirname, 'test_output_gpx/report.md');

// Ensure clean test outputs directory
if (fs.existsSync(testOutDir)) {
    fs.rmSync(testOutDir, { recursive: true, force: true });
}
fs.mkdirSync(testOutDir, { recursive: true });

const sampleGpx1 = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <name>Test Track 1</name>
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

const sampleGpx2 = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <name>Short Track</name>
    <trkseg>
      <trkpt lat="35.1" lon="135.1"><ele>100</ele></trkpt>
      <trkpt lat="35.1" lon="135.1"><ele>102</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const file1 = path.join(fixturePath, 'sample1.gpx');
const file2 = path.join(fixturePath, 'sample2.gpx');

fs.writeFileSync(file1, sampleGpx1, 'utf8');
fs.writeFileSync(file2, sampleGpx2, 'utf8');

try {
    // 1. Run the command via CLI
    execSync(`node "${cliPath}" generate-summit-candidate-gpx --input "${fixturePath}" --out-dir "${testOutDir}" --report "${testReport}" --manifest "${testManifest}" --smooth-window 1 --peak-radius 1 --min-prominence 10`, { stdio: 'pipe' });

    // 2. Verify output files exist
    const out1Path = path.join(testOutDir, 'sample1.gpx');
    const out2Path = path.join(testOutDir, 'sample2.gpx');
    assert.ok(fs.existsSync(out1Path), 'Output GPX 1 should be generated');
    assert.ok(fs.existsSync(out2Path), 'Output GPX 2 should be generated');
    assert.ok(fs.existsSync(testManifest), 'Manifest should be generated');
    assert.ok(fs.existsSync(testReport), 'Report should be generated');

    // 3. Verify content of GPX 1 (should contain waypoints)
    const content1 = fs.readFileSync(out1Path, 'utf8');
    assert.ok(content1.includes('<wpt'), 'GPX 1 should contain a waypoint');
    assert.ok(content1.includes('summit-candidate:'), 'Waypoint in GPX 1 should have stable ID name');
    assert.ok(content1.includes('xmlns:yama="https://museum-yama-data.moukaeritai.work/ns/yama-data/0.1"'), 'GPX 1 should bind custom namespace');
    assert.ok(content1.includes('<yama:source_gpx_basename>'), 'GPX 1 should include basename in extensions');

    // Verify coordinates matching first trackpoint
    const doc1 = parseGpx(content1);
    const wpts = doc1.getElementsByTagName('wpt');
    assert.strictEqual(wpts.length, 1, 'Should have exactly 1 waypoint');
    assert.strictEqual(wpts[0].getAttribute('lat'), '35');
    assert.strictEqual(wpts[0].getAttribute('lon'), '135');
    assert.strictEqual(wpts[0].getElementsByTagName('ele')[0].textContent, '250');

    // 4. Verify content of GPX 2 (should have 0 waypoints since trackpoints < 3)
    const content2 = fs.readFileSync(out2Path, 'utf8');
    assert.ok(!content2.includes('<wpt'), 'GPX 2 should not contain any waypoints');

    // 5. Verify source GPX files were not modified
    assert.strictEqual(fs.readFileSync(file1, 'utf8'), sampleGpx1, 'Source GPX 1 must remain unchanged');
    assert.strictEqual(fs.readFileSync(file2, 'utf8'), sampleGpx2, 'Source GPX 2 must remain unchanged');

    // 6. Verify target collision protection (running again without clearing should fail)
    try {
        execSync(`node "${cliPath}" generate-summit-candidate-gpx --input "${fixturePath}" --out-dir "${testOutDir}" --report "${testReport}" --manifest "${testManifest}"`, { stdio: 'pipe' });
        assert.fail('Should have failed due to target collisions');
    } catch (e) {
        assert.ok(e.message.includes('Command failed'), 'Successfully failed on target collision');
    }

    // 7. Verify Manifest file content
    const manifest = JSON.parse(fs.readFileSync(testManifest, 'utf8'));
    assert.strictEqual(manifest.stage, 'generate_summit_candidate_gpx');
    assert.strictEqual(manifest.summary.input_gpx_count, 2);
    assert.strictEqual(manifest.summary.output_gpx_count, 2);
    assert.strictEqual(manifest.summary.total_summit_candidates, 1);
    assert.strictEqual(manifest.summary.zero_candidate_files, 1);
    assert.strictEqual(manifest.files.length, 2);

    console.log('All generate-summit-candidate-gpx tests passed!');
} finally {
    // Cleanup fixtures and output files
    if (fs.existsSync(file1)) fs.unlinkSync(file1);
    if (fs.existsSync(file2)) fs.unlinkSync(file2);
    if (fs.existsSync(testOutDir)) {
        fs.rmSync(testOutDir, { recursive: true, force: true });
    }
}

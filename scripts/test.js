const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT_DIR = process.cwd();
const FIXTURES_DIR = path.join(ROOT_DIR, 'test', 'fixtures');
const MERGED_DIR = path.join(FIXTURES_DIR, 'gpx', 'merged');
const ANNOTATED_DIR = path.join(FIXTURES_DIR, 'gpx', 'annotated');

function runCommand(command, args) {
    console.log(`Running: ${command} ${args.join(' ')}`);
    execFileSync(command, args, { stdio: 'inherit' });
}

function runTests() {
    console.log('--- Starting Tests ---');

    // Clean up previous test outputs if any
    if (fs.existsSync(MERGED_DIR)) fs.rmSync(MERGED_DIR, { recursive: true, force: true });
    if (fs.existsSync(ANNOTATED_DIR)) fs.rmSync(ANNOTATED_DIR, { recursive: true, force: true });

    // 1. Test annotate-peaks
    runCommand('node', ['.agents/skills/annotate-peaks/annotate_peaks.js', '--root', FIXTURES_DIR]);

    // Validate output
    assert.ok(fs.existsSync(path.join(ANNOTATED_DIR, 'yamap_2024-01-01_08_00.gpx')), 'Annotated file 1 should exist');
    assert.ok(fs.existsSync(path.join(ANNOTATED_DIR, 'yamap_2024-02-15_10_00.gpx')), 'Annotated file 2 should exist');

    const annotatedContent = fs.readFileSync(path.join(ANNOTATED_DIR, 'yamap_2024-02-15_10_00.gpx'), 'utf8');
    assert.ok(annotatedContent.includes('<wpt'), 'Annotated file should contain waypoint');
    assert.ok(annotatedContent.includes('Peak (200m)'), 'Annotated file should contain detected peak name');

    // 2. Test merge-tracks
    runCommand('node', ['.agents/skills/merge-tracks/merge_by_year.js', '--root', FIXTURES_DIR]);

    // Validate output
    assert.ok(fs.existsSync(path.join(MERGED_DIR, '2024_merged.gpx')), 'Merged file for 2024 should exist');
    const mergedContent = fs.readFileSync(path.join(MERGED_DIR, '2024_merged.gpx'), 'utf8');
    assert.ok(mergedContent.includes('<trk>'), 'Merged file should contain track elements');
    // Ensure structure preservation (both segments of the second file should be there)
    assert.ok(mergedContent.includes('<name>Segment 2</name>'), 'Merged file should preserve multiple tracks from same file');

    // 3. Test data-intake deduplication
    // Let's create a dummy duplicate file
    const rawDir = path.join(FIXTURES_DIR, 'gpx', 'raw');
    const originalFile = path.join(rawDir, 'yamap_2024-01-01_08_00.gpx');
    const exactDupFile = path.join(rawDir, 'yamap_2024-01-01_08_00 (1).gpx');
    const differentContentDupFile = path.join(rawDir, 'yamap_2024-02-15_10_00 (1).gpx');

    // Create exact duplicate
    fs.copyFileSync(originalFile, exactDupFile);

    // Create diff content duplicate
    fs.writeFileSync(differentContentDupFile, '<?xml version="1.0"?><gpx></gpx>');

    runCommand('node', ['.agents/skills/data-intake/import_data.js', '--root', FIXTURES_DIR]);

    // Exact duplicate should be removed
    assert.ok(!fs.existsSync(exactDupFile), 'Exact duplicate should be deleted');
    // Different content duplicate should be renamed, so original suffix should not exist
    assert.ok(!fs.existsSync(differentContentDupFile), 'Different content duplicate should be renamed');

    // Clean up test artifacts
    fs.rmSync(MERGED_DIR, { recursive: true, force: true });
    fs.rmSync(ANNOTATED_DIR, { recursive: true, force: true });

    // Find and delete the renamed collision file
    if (fs.existsSync(rawDir)) {
        const files = fs.readdirSync(rawDir);
        for (const f of files) {
            if (f.startsWith('yamap_2024-02-15_10_00_')) {
                fs.unlinkSync(path.join(rawDir, f));
            }
        }
    }

    console.log('--- All Tests Passed ---');
}

runTests();

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEMP_TEST_DIR = path.join(__dirname, 'temp_test_run');

const GPX_DIR = path.join(TEMP_TEST_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const MERGED_DIR = path.join(GPX_DIR, 'merged');
const ANNOTATED_DIR = path.join(GPX_DIR, 'annotated');

function runCommand(command) {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function runTests() {
    console.log('--- Starting Tests ---');

    // Setup isolated test directory
    if (fs.existsSync(TEMP_TEST_DIR)) fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
    copyRecursiveSync(SOURCE_FIXTURES_DIR, TEMP_TEST_DIR);

    try {
        // 1. Test annotate
        runCommand(`node cli.js annotate --root "${TEMP_TEST_DIR}"`);

        assert.ok(fs.existsSync(path.join(ANNOTATED_DIR, 'yamap_2024-01-01_08_00.gpx')), 'Annotated file 1 should exist');
        assert.ok(fs.existsSync(path.join(ANNOTATED_DIR, 'yamap_2024-02-15_10_00.gpx')), 'Annotated file 2 should exist');

        const annotatedContent = fs.readFileSync(path.join(ANNOTATED_DIR, 'yamap_2024-02-15_10_00.gpx'), 'utf8');
        assert.ok(annotatedContent.includes('<wpt'), 'Annotated file should contain waypoint');
        assert.ok(annotatedContent.includes('Peak (200m)'), 'Annotated file should contain detected peak name');

        // 2. Test merge
        runCommand(`node cli.js merge --root "${TEMP_TEST_DIR}"`);

        assert.ok(fs.existsSync(path.join(MERGED_DIR, '2024_merged.gpx')), 'Merged file for 2024 should exist');
        const mergedContent = fs.readFileSync(path.join(MERGED_DIR, '2024_merged.gpx'), 'utf8');
        assert.ok(mergedContent.includes('<trk>'), 'Merged file should contain track elements');
        assert.ok(mergedContent.includes('<name>Segment 2</name>'), 'Merged file should preserve multiple tracks from same file');

        // 3. Test validate
        runCommand(`node cli.js validate --root "${TEMP_TEST_DIR}"`);

        // 4. Test intake deduplication
        const originalFile = path.join(RAW_DIR, 'yamap_2024-01-01_08_00.gpx');
        const exactDupFile = path.join(RAW_DIR, 'yamap_2024-01-01_08_00 (1).gpx');
        const differentContentDupFile = path.join(RAW_DIR, 'yamap_2024-02-15_10_00 (1).gpx');

        fs.copyFileSync(originalFile, exactDupFile);
        fs.writeFileSync(differentContentDupFile, '<?xml version="1.0"?><gpx></gpx>');

        runCommand(`node cli.js intake --root "${TEMP_TEST_DIR}"`);

        assert.ok(!fs.existsSync(exactDupFile), 'Exact duplicate should be deleted');
        assert.ok(!fs.existsSync(differentContentDupFile), 'Different content duplicate should be renamed');

        console.log('--- All Tests Passed ---');
    } finally {
        // Clean up
        if (fs.existsSync(TEMP_TEST_DIR)) fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
    }
}

runTests();

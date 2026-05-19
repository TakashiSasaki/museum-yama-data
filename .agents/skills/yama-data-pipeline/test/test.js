const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');
const assert = require('assert');

// Core pipeline functionality to test
const validate = require('../commands/validate');
const intake = require('../commands/intake');
const { parseCSV } = require('../lib/csv');
const { isSafePath } = require('../lib/fs_safe');
const { parseGpx } = require('../lib/gpx');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEMP_TEST_DIR = path.join(__dirname, 'temp_test_run');
const GPX_DIR = path.join(TEMP_TEST_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const MERGED_DIR = path.join(GPX_DIR, 'merged');
const ANNOTATED_DIR = path.join(GPX_DIR, 'annotated');

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

function runCommand(command) {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
}

async function runTests() {
    let failed = 0;

    function runAssert(condition, message) {
        if (!condition) {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        } else {
            console.log(`✅ PASS: ${message}`);
        }
    }

    try {
        console.log('--- Starting Integration Tests ---');

        if (fs.existsSync(TEMP_TEST_DIR)) fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
        copyRecursiveSync(SOURCE_FIXTURES_DIR, TEMP_TEST_DIR);

        // 1. Test annotate
        runCommand(`node cli.js annotate --root "${TEMP_TEST_DIR}"`);

        runAssert(fs.existsSync(path.join(ANNOTATED_DIR, 'yamap_2024-01-01_08_00.gpx')), 'Annotated file 1 should exist');
        runAssert(fs.existsSync(path.join(ANNOTATED_DIR, 'yamap_2024-02-15_10_00.gpx')), 'Annotated file 2 should exist');

        const annotatedContent = fs.readFileSync(path.join(ANNOTATED_DIR, 'yamap_2024-02-15_10_00.gpx'), 'utf8');
        runAssert(annotatedContent.includes('<wpt'), 'Annotated file should contain waypoint');
        runAssert(annotatedContent.includes('Peak (200m)'), 'Annotated file should contain detected peak name');

        // 2. Test merge
        runCommand(`node cli.js merge --root "${TEMP_TEST_DIR}"`);

        runAssert(fs.existsSync(path.join(MERGED_DIR, '2024_merged.gpx')), 'Merged file for 2024 should exist');
        const mergedContent = fs.readFileSync(path.join(MERGED_DIR, '2024_merged.gpx'), 'utf8');
        runAssert(mergedContent.includes('<trk>'), 'Merged file should contain track elements');
        runAssert(mergedContent.includes('<name>Segment 2</name>'), 'Merged file should preserve multiple tracks from same file');

        // 3. Test validate
        runCommand(`node cli.js validate --root "${TEMP_TEST_DIR}"`);

        // 4. Test intake deduplication
        const originalFile = path.join(RAW_DIR, 'yamap_2024-01-01_08_00.gpx');
        const exactDupFile = path.join(RAW_DIR, 'yamap_2024-01-01_08_00 (1).gpx');
        const differentContentDupFile = path.join(RAW_DIR, 'yamap_2024-02-15_10_00 (1).gpx');

        fs.copyFileSync(originalFile, exactDupFile);
        fs.writeFileSync(differentContentDupFile, '<?xml version="1.0"?><gpx></gpx>');

        runCommand(`node cli.js intake --root "${TEMP_TEST_DIR}"`);

        runAssert(!fs.existsSync(exactDupFile), 'Exact duplicate should be deleted');
        runAssert(!fs.existsSync(differentContentDupFile), 'Different content duplicate should be renamed');


        console.log('--- Starting Unit and Safety Tests ---');

        console.log('--- Testing lib/csv.js ---');
        const csvText = `col1,col2,"col,3"\nval1,"val""2",val3`;
        const rows = parseCSV(csvText);
        runAssert(rows.length === 2, 'CSV parsed two rows');
        runAssert(rows[0][2] === 'col,3', 'Handled comma in quotes');
        runAssert(rows[1][1] === 'val"2', 'Handled escaped quote');

        console.log('--- Testing lib/fs_safe.js ---');
        runAssert(isSafePath('/foo/bar', 'baz') === true, 'Safe relative path');
        runAssert(isSafePath('/foo/bar', 'baz/qux') === true, 'Safe nested relative path');
        runAssert(isSafePath('/foo/bar', '../baz') === false, 'Unsafe traversal path');
        runAssert(isSafePath('/foo/bar', '/etc/passwd') === false, 'Unsafe absolute path');

        console.log('--- Testing lib/gpx.js (XML Parser Safety) ---');
        try {
            parseGpx('<gpx><trk><trkpt lat="1.0" lon="1.0"></trk></gpx>');
            runAssert(false, 'Should have thrown on unclosed/mismatched tags');
        } catch (e) {
            runAssert(e.message.includes('XML Error') || e.message.includes('Opening and ending tag mismatch') || e.message.includes('unclosed'), 'Caught XML parsing error');
        }

        console.log('--- Testing intake zip traversal prevention ---');
        const maliciousZip = new AdmZip();
        maliciousZip.addFile('safe.txt', Buffer.from('safe'));
        maliciousZip.addFile('../unsafe.txt', Buffer.from('unsafe'));
        const zipPath = path.join(TEMP_TEST_DIR, 'gpx', 'malicious.zip');
        maliciousZip.writeZip(zipPath);

        await intake({ root: TEMP_TEST_DIR });

        runAssert(fs.existsSync(path.join(RAW_DIR, 'safe.txt')), 'Safe file extracted');
        runAssert(!fs.existsSync(path.join(RAW_DIR, '..', 'unsafe.txt')), 'Unsafe file was NOT extracted into raw/..');
        runAssert(!fs.existsSync(path.join(TEMP_TEST_DIR, 'gpx', 'unsafe.txt')), 'Unsafe file did not escape temp directory');

        console.log('--- Testing validate.js (Negative Cases) ---');
        const strictOptions = { root: TEMP_TEST_DIR, strict: true };

        // Test malformed XML
        const badGpxPath = path.join(RAW_DIR, 'bad_xml.gpx');
        fs.writeFileSync(badGpxPath, '<gpx><bad>', 'utf8');
        try {
            await validate(strictOptions);
            runAssert(false, 'Validate should fail on malformed GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on malformed XML');
        }
        fs.unlinkSync(badGpxPath);

        // Test missing elements
        const emptyGpxPath = path.join(RAW_DIR, 'empty.gpx');
        fs.writeFileSync(emptyGpxPath, '<gpx></gpx>', 'utf8');
        try {
            await validate(strictOptions);
            runAssert(false, 'Validate should fail on empty GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on missing geospatial elements');
        }
        fs.unlinkSync(emptyGpxPath);

        // Test invalid CSV row length
        const badCsvPath = path.join(TEMP_TEST_DIR, 'csv', 'bad.csv');
        fs.writeFileSync(badCsvPath, 'a,b,c\n1,2', 'utf8');
        try {
            await validate(strictOptions);
            runAssert(false, 'Validate should fail on bad CSV row length');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on CSV row length mismatch');
        }
        fs.unlinkSync(badCsvPath);

        // Test invalid latitude / longitude
        const badCoordsGpxPath = path.join(RAW_DIR, 'bad_coords.gpx');
        fs.writeFileSync(badCoordsGpxPath, '<gpx><trk><trkseg><trkpt lat="900" lon="1800"></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(strictOptions);
            runAssert(false, 'Validate should fail on bad coordinates GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on bad coordinates');
        }
        fs.unlinkSync(badCoordsGpxPath);

        // Test invalid latitude / longitude as NaN
        const nanCoordsGpxPath = path.join(RAW_DIR, 'nan_coords.gpx');
        fs.writeFileSync(nanCoordsGpxPath, '<gpx><trk><trkseg><trkpt lat="invalid" lon="1.0"></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(strictOptions);
            runAssert(false, 'Validate should fail on NaN coordinates GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on NaN coordinates');
        }
        fs.unlinkSync(nanCoordsGpxPath);

        // Test invalid elevation
        const badEleGpxPath = path.join(RAW_DIR, 'bad_ele.gpx');
        fs.writeFileSync(badEleGpxPath, '<gpx><trk><trkseg><trkpt lat="1.0" lon="1.0"><ele>bad_ele</ele></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(strictOptions);
            runAssert(false, 'Validate should fail on bad elevation GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on bad elevation');
        }
        fs.unlinkSync(badEleGpxPath);

    } finally {
        if (fs.existsSync(TEMP_TEST_DIR)) fs.rmSync(TEMP_TEST_DIR, { recursive: true, force: true });
    }

    if (failed > 0) {
        console.error(`\n❌ ${failed} tests failed.`);
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed.');
        process.exit(0);
    }
}

runTests();

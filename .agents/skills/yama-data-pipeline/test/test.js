const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');
const assert = require('assert');

// Run isolated test suites
require('./test_summit_detection');
require('./test_validate_mountain_sources');
require('./test_intake');
require('./test_summit_candidate_gpx');
require('./test_gpx_yamap_date_linking');
require('./test_complete_mountain_source_no');
require('./test_normalize_mountain_source_json');
require('./test_summit_candidate_features');



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
const MERGED_DIR = path.join(GPX_DIR, 'merged-by-year');
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

        console.log('--- Starting Unit and Safety Tests ---');

        console.log('--- Testing lib/csv.js ---');
        const csvText = `col1,col2,"col,3"\nval1,"val""2",val3`;
        const rows = parseCSV(csvText);
        runAssert(rows.length === 2, 'CSV parsed two rows');
        runAssert(rows[0][2] === 'col,3', 'Handled comma in quotes');
        runAssert(rows[1][1] === 'val"2', 'Handled escaped quote');

        const csvTextWithNewlines = `col1,col2\n"val\n1",val2`;
        const rowsWithNewlines = parseCSV(csvTextWithNewlines);
        runAssert(rowsWithNewlines.length === 2, 'CSV parsed two rows with embedded newline');
        runAssert(rowsWithNewlines[1][0] === 'val\n1', 'Handled embedded newline in quotes');

        let caughtCsvError = false;
        try {
            parseCSV(`col1,col2\nval1`, { strictColumns: true });
        } catch (e) {
            caughtCsvError = e.message.includes('expected 2');
        }
        runAssert(caughtCsvError, 'CSV parser caught mismatched column count with strictColumns=true');

        // Confirm lenient mode (default) does NOT throw on column mismatch
        const lenientRows = parseCSV(`col1,col2\nval1`);
        runAssert(lenientRows.length === 2, 'CSV lenient mode returns rows even on column count mismatch');

        console.log('--- Testing lib/fs_safe.js ---');
        runAssert(isSafePath('/foo/bar', 'baz') === true, 'Safe relative path');
        runAssert(isSafePath('/foo/bar', 'baz/qux') === true, 'Safe nested relative path');
        runAssert(isSafePath('/foo/bar', '../baz') === false, 'Unsafe traversal path');
        runAssert(isSafePath('/foo/bar', '/etc/passwd') === false, 'Unsafe absolute path');
        runAssert(isSafePath('/foo/bar', '') === true, 'Safe base path itself');
        runAssert(isSafePath('/tmp/base', '/tmp/base-other') === false, 'Unsafe sibling-prefix case');
        runAssert(isSafePath('/foo/bar', '/foo/bar/baz') === true, 'Safe nested absolute path');

        console.log('--- Testing lib/gpx.js (XML Parser Safety) ---');
        try {
            parseGpx('<gpx><trk><trkpt lat="1.0" lon="1.0"></trk></gpx>');
            runAssert(false, 'Should have thrown on unclosed/mismatched tags');
        } catch (e) {
            runAssert(e.message.includes('XML Error') || e.message.includes('Opening and ending tag mismatch') || e.message.includes('unclosed'), 'Caught XML parsing error');
        }

        const validationOptions = { root: TEMP_TEST_DIR };
        // Test malformed XML
        const badGpxPath = path.join(RAW_DIR, 'bad_xml.gpx');
        fs.writeFileSync(badGpxPath, '<gpx><bad>', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on malformed GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on malformed XML');
        }
        fs.unlinkSync(badGpxPath);

        // Test missing elements
        const emptyGpxPath = path.join(RAW_DIR, 'empty.gpx');
        fs.writeFileSync(emptyGpxPath, '<gpx></gpx>', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on empty GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on missing geospatial elements');
        }
        fs.unlinkSync(emptyGpxPath);

        // Test invalid CSV row length
        const badCsvPath = path.join(TEMP_TEST_DIR, 'csv', 'bad.csv');
        fs.writeFileSync(badCsvPath, 'a,b,c\n1,2', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on bad CSV row length');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on CSV row length mismatch');
        }
        fs.unlinkSync(badCsvPath);

        // Test invalid latitude / longitude
        const badCoordsGpxPath = path.join(RAW_DIR, 'bad_coords.gpx');
        fs.writeFileSync(badCoordsGpxPath, '<gpx><trk><trkseg><trkpt lat="900" lon="1800"><ele>100</ele></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on bad coordinates GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on bad coordinates');
        }
        fs.unlinkSync(badCoordsGpxPath);

        // Test invalid latitude / longitude as NaN
        const nanCoordsGpxPath = path.join(RAW_DIR, 'nan_coords.gpx');
        fs.writeFileSync(nanCoordsGpxPath, '<gpx><trk><trkseg><trkpt lat="invalid" lon="1.0"><ele>100</ele></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on NaN coordinates GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on NaN coordinates');
        }
        fs.unlinkSync(nanCoordsGpxPath);

        // Test missing elevation
        const missingEleGpxPath = path.join(RAW_DIR, 'missing_ele.gpx');
        fs.writeFileSync(missingEleGpxPath, '<gpx><trk><trkseg><trkpt lat="1.0" lon="1.0"></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on missing elevation GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on missing elevation');
        }
        fs.unlinkSync(missingEleGpxPath);

        // Test invalid elevation
        const badEleGpxPath = path.join(RAW_DIR, 'bad_ele.gpx');
        fs.writeFileSync(badEleGpxPath, '<gpx><trk><trkseg><trkpt lat="1.0" lon="1.0"><ele>bad_ele</ele></trkpt></trkseg></trk></gpx>', 'utf8');
        try {
            await validate(validationOptions);
            runAssert(false, 'Validate should fail on bad elevation GPX');
        } catch (e) {
            runAssert(e.message === 'Validation failed.', 'Validate failed correctly on bad elevation');
        }
        fs.unlinkSync(badEleGpxPath);

        // 5. Test find-missing and verify subcommands
        console.log('--- Testing find-missing and verify subcommands ---');
        const mockCsvDir = path.join(TEMP_TEST_DIR, 'csv');
        const mockYamapDir = path.join(TEMP_TEST_DIR, 'yamap');
        const mockAnnotatedDir = path.join(TEMP_TEST_DIR, 'gpx', 'annotated');

        if (!fs.existsSync(mockCsvDir)) fs.mkdirSync(mockCsvDir, { recursive: true });
        if (!fs.existsSync(mockYamapDir)) fs.mkdirSync(mockYamapDir, { recursive: true });
        if (!fs.existsSync(mockAnnotatedDir)) fs.mkdirSync(mockAnnotatedDir, { recursive: true });

        // Write a mock CSV that references YAMAP activity URLs
        fs.writeFileSync(path.join(mockCsvDir, 'activities_mock.csv'), 'Name,Link\nMount Fuji,https://yamap.com/activities/123456\nMount Aso,https://yamap.com/activities/789012', 'utf8');

        // Write only one mock Markdown file in yamap (123456.md) - so 789012 is missing
        fs.writeFileSync(path.join(mockYamapDir, '123456.md'), '# Activity 123456\n- **Title**: Mount Fuji Hike\n- **Date**: 2024年05月20日\n', 'utf8');

        // Write a mock GPX in annotated folder
        fs.writeFileSync(path.join(mockAnnotatedDir, 'yamap_2024-05-20_08_00.gpx'), '<?xml version="1.0" encoding="UTF-8"?><gpx><trk><name>Mount Fuji Hike</name><trkseg><trkpt lat="35.36" lon="138.73"><ele>3776</ele><time>2024-05-19T23:00:00Z</time></trkpt></trkseg></trk></gpx>', 'utf8');

        // Run find-missing via CLI
        console.log('Running node cli.js find-missing...');
        runCommand(`node cli.js find-missing --root "${TEMP_TEST_DIR}"`);
        runAssert(true, 'find-missing CLI executed successfully');

        // Run verify via CLI
        console.log('Running node cli.js verify...');
        runCommand(`node cli.js verify --root "${TEMP_TEST_DIR}"`);
        runAssert(true, 'verify CLI executed successfully');

        console.log('--- Testing extract-excel-sheets ---');
        await require('./test_excel_sheet_extraction.js')();

        console.log('--- Testing validate-provider-received ---');
        const PRV_DIR = path.join(TEMP_TEST_DIR, 'data', '01_raw', 'provider_received');
        const PRM_DIR = path.join(TEMP_TEST_DIR, 'docs', 'migration', 'provider_received_manifests');
        const PR_OUT = path.join(TEMP_TEST_DIR, 'docs', 'migration', 'provider_received_inventory_report.md');

        fs.mkdirSync(PRV_DIR, { recursive: true });
        fs.mkdirSync(PRM_DIR, { recursive: true });

        // Empty dir test
        runCommand(`node cli.js validate-provider-received --input "${PRV_DIR}" --manifest-dir "${PRM_DIR}" --out "${PR_OUT}"`);
        let report = fs.readFileSync(PR_OUT, 'utf8');
        runAssert(report.includes('**overall_status**: PASS'), 'overall_status is PASS for empty directory');

        // Setup valid files and layout
        const providerSlug = 'test_provider';
        const receivedDate = '2024-05-20';
        const fileContent = 'test data';
        const providerDir = path.join(PRV_DIR, providerSlug, receivedDate);
        fs.mkdirSync(providerDir, { recursive: true });
        const filePath = path.join(providerDir, 'data.txt');
        fs.writeFileSync(filePath, fileContent);

        const hashSum = require('crypto').createHash('sha256');
        hashSum.update(fileContent);
        const checksum = hashSum.digest('hex');

        // Missing manifest test
        runCommand(`node cli.js validate-provider-received --input "${PRV_DIR}" --manifest-dir "${PRM_DIR}" --out "${PR_OUT}"`);
        report = fs.readFileSync(PR_OUT, 'utf8');
        runAssert(report.includes('**overall_status**: PASS_WITH_WARNINGS'), 'WARN when manifest is missing for provider file');
        runAssert(report.includes('Provider file lacks manifest entry'), 'Correct warning for missing manifest entry');

        // Valid manifest test
        const manifestContent = `
manifest_id: 123
provider_slug: test_provider
stored_files:
  - original_filename: data.txt
    stored_path: data/01_raw/provider_received/test_provider/2024-05-20/data.txt
    checksum: ${checksum}
`;
        fs.writeFileSync(path.join(PRM_DIR, 'test_provider__2024-05-20__manifest.md'), manifestContent);
        runCommand(`node cli.js validate-provider-received --input "${PRV_DIR}" --manifest-dir "${PRM_DIR}" --out "${PR_OUT}"`);
        report = fs.readFileSync(PR_OUT, 'utf8');
        runAssert(report.includes('**overall_status**: PASS'), 'PASS when manifest matches');
        runAssert(report.includes('Manifest coverage is complete for all files'), 'Manifest coverage is complete message');

        // Checksum mismatch test
        fs.writeFileSync(filePath, 'modified data');
        let caughtMismatchError = false;
        try {
            runCommand(`node cli.js validate-provider-received --input "${PRV_DIR}" --manifest-dir "${PRM_DIR}" --out "${PR_OUT}"`);
        } catch (e) {
            caughtMismatchError = true;
        }
        runAssert(caughtMismatchError, 'CLI correctly returns non-zero exit code on FAIL');
        report = fs.readFileSync(PR_OUT, 'utf8');
        runAssert(report.includes('**overall_status**: FAIL'), 'FAIL when checksum mismatches');
        runAssert(report.includes('Checksum mismatch for'), 'Checksum mismatch message');

        // Invalid slug / date test
        const badProviderDir = path.join(PRV_DIR, 'bad_slug!', '2024_05_20');
        fs.mkdirSync(badProviderDir, { recursive: true });
        fs.writeFileSync(path.join(badProviderDir, 'data.txt'), 'data');
        // This will issue warnings but not a FAIL status from validation code, though the checksum mismatch in the test above made the overall status FAIL.
        // Let's fix the modified data so it goes back to passing overall status to avoid an error code
        fs.writeFileSync(filePath, fileContent);
        runCommand(`node cli.js validate-provider-received --input "${PRV_DIR}" --manifest-dir "${PRM_DIR}" --out "${PR_OUT}"`);
        report = fs.readFileSync(PR_OUT, 'utf8');
        runAssert(report.includes('Invalid provider slug: bad_slug!'), 'Detected invalid provider slug');
        runAssert(report.includes('Invalid received date: 2024_05_20'), 'Detected invalid received date');

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

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { extractGpxArchive } = require('../lib/gpx_archive_intake');
const intakeCommand = require('../commands/intake');

console.log('Testing intake.js (portable GPX archive extraction)...');

const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-test-intake-'));
const FIXTURE_DIR = path.join(TEMP_DIR, 'fixtures');
const OUT_DIR = path.join(TEMP_DIR, 'out');

fs.mkdirSync(FIXTURE_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

function createZip(name, entries) {
    const zip = new AdmZip();
    for (const { name: entryName, content } of entries) {
        zip.addFile(entryName, Buffer.from(content || 'dummy'));
    }
    const zipPath = path.join(FIXTURE_DIR, name);
    zip.writeZip(zipPath);
    return zipPath;
}

try {
    // 1. Success case: flat ZIP with GPX, nested GPX, and ignored files
    const validZipPath = createZip('valid.zip', [
        { name: 'track1.gpx', content: '<gpx>1</gpx>' },
        { name: 'nested/track2.gpx', content: '<gpx>2</gpx>' },
        { name: 'ignore.txt', content: 'ignore' },
        { name: 'nested/ignore.xlsx', content: 'ignore' }
    ]);

    let result = extractGpxArchive(validZipPath, OUT_DIR);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.extractedGpxCount, 2);
    assert.strictEqual(result.ignoredNonGpxCount, 2);
    assert.ok(fs.existsSync(path.join(OUT_DIR, 'track1.gpx')));
    assert.ok(fs.existsSync(path.join(OUT_DIR, 'track2.gpx')));
    assert.ok(!fs.existsSync(path.join(OUT_DIR, 'ignore.txt')));
    assert.ok(!fs.existsSync(path.join(OUT_DIR, 'nested')));

    // Cleanup OUT_DIR
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // 2. Failure case: duplicate flattened GPX basenames inside ZIP
    const dupBasenameZipPath = createZip('dup_basename.zip', [
        { name: 'track.gpx', content: '<gpx>1</gpx>' },
        { name: 'nested/track.gpx', content: '<gpx>2</gpx>' }
    ]);

    assert.throws(() => {
        extractGpxArchive(dupBasenameZipPath, OUT_DIR);
    }, /Duplicate flattened GPX basename detected/);
    assert.deepStrictEqual(fs.readdirSync(OUT_DIR), [], 'Output dir should be empty after failure (all-or-nothing)');

    // 3. Failure case: Output collision
    const collisionZipPath = createZip('collision.zip', [
        { name: 'track1.gpx', content: '<gpx>1</gpx>' }
    ]);
    fs.writeFileSync(path.join(OUT_DIR, 'track1.gpx'), 'existing');

    assert.throws(() => {
        extractGpxArchive(collisionZipPath, OUT_DIR);
    }, /Output filename collision/);
    assert.strictEqual(fs.readFileSync(path.join(OUT_DIR, 'track1.gpx'), 'utf8'), 'existing', 'Existing file should not be modified');

    // 4. Failure case: ZIP with no GPX files
    const noGpxZipPath = createZip('nogpx.zip', [
        { name: 'file.txt', content: 'dummy' }
    ]);
    assert.throws(() => {
         extractGpxArchive(noGpxZipPath, OUT_DIR);
    }, /No GPX entries found/);

    // 5. Test CLI command wrapper with report
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const reportPath = path.join(TEMP_DIR, 'report.md');
    intakeCommand({
        input: validZipPath,
        outDir: OUT_DIR,
        report: reportPath
    }).then(() => {
        assert.ok(fs.existsSync(reportPath));
        const reportContent = fs.readFileSync(reportPath, 'utf8');
        assert.ok(reportContent.includes('# GPX Archive Intake Report'));
        assert.ok(reportContent.includes('extracted_gpx_count: 2'));
        assert.ok(reportContent.includes('- track1.gpx'));
        assert.ok(reportContent.includes('- track2.gpx'));

        console.log('✅ All intake tests passed!');
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });

} finally {
    // We defer deletion of TEMP_DIR slightly to allow async intakeCommand to finish in the simple structure
    // Since intakeCommand is actually mostly synchronous (except being marked async), it works.
    setTimeout(() => {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }, 100);
}

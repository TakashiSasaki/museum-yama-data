const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseGpxFilename } = require('../lib/gpx_filename');
const { parseYamapMarkdown } = require('../lib/yamap_markdown');

console.log('Testing gpx_filename.js parsing and timezone conversions...');

// Case 1 & 2: Same date in JST and UTC-to-JST
const r1 = parseGpxFilename('yamap_2024-05-19_08_00.gpx');
assert.strictEqual(r1.filename_as_jst.date, '2024-05-19');
assert.strictEqual(r1.filename_as_utc_to_jst.date, '2024-05-19'); // 08:00 UTC -> 17:00 JST -> same day
assert.strictEqual(r1.timezone_sensitive, false);
assert.strictEqual(r1.candidate_dates_jst.length, 1);

// Case 3: Different date due to UTC-to-JST boundary shift
const r2 = parseGpxFilename('yamap_2024-05-19_23_30.gpx');
assert.strictEqual(r2.filename_as_jst.date, '2024-05-19');
assert.strictEqual(r2.filename_as_utc_to_jst.date, '2024-05-20'); // 23:30 UTC -> 08:30 JST (next day)
assert.strictEqual(r2.timezone_sensitive, true);
assert.strictEqual(r2.candidate_dates_jst.length, 2);

console.log('Testing yamap_markdown.js date and title parsing...');

// Case 9 & 10: Markdown date parsing
const md1 = `
# Activity 12345
- **Title**: Test Mountain Summit Walk
- **Date**: 2022年07月10日
`;
const pmd1 = parseYamapMarkdown(md1);
assert.strictEqual(pmd1.activity_date, '2022-07-10');
assert.strictEqual(pmd1.title, 'Test Mountain Summit Walk');
assert.strictEqual(pmd1.parse_status, 'parsed');

// Case 11: Unparseable YAMAP markdown date
const md2 = `
# Activity 54321
- **Title**: Bad format post
`;
const pmd2 = parseYamapMarkdown(md2);
assert.strictEqual(pmd2.activity_date, null);
assert.strictEqual(pmd2.parse_status, 'unparsed');
assert.ok(pmd2.notes.includes('Could not parse'));

console.log('Testing GPX-to-YAMAP date linking integration flow...');

const cliPath = path.resolve(__dirname, '../cli.js');
const testGpxDir = path.resolve(__dirname, 'test_link_gpx_inputs');
const testYamapDir = path.resolve(__dirname, 'test_link_yamap_inputs');
const testOutDir = path.resolve(__dirname, 'test_link_outputs');
const testIntermediateDir = path.resolve(__dirname, 'test_link_intermediate');
const testReviewDir = path.resolve(__dirname, 'test_link_review');
const testReport = path.resolve(__dirname, 'test_link_report.md');

// Setup dirs
if (fs.existsSync(testGpxDir)) fs.rmSync(testGpxDir, { recursive: true, force: true });
if (fs.existsSync(testYamapDir)) fs.rmSync(testYamapDir, { recursive: true, force: true });
if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true, force: true });
if (fs.existsSync(testIntermediateDir)) fs.rmSync(testIntermediateDir, { recursive: true, force: true });
if (fs.existsSync(testReviewDir)) fs.rmSync(testReviewDir, { recursive: true, force: true });
if (fs.existsSync(testReport)) fs.unlinkSync(testReport);

fs.mkdirSync(testGpxDir, { recursive: true });
fs.mkdirSync(testYamapDir, { recursive: true });

// Case 4: Matches JST only
// yamap_2024-05-19_23_30.gpx candidates: 2024-05-19, 2024-05-20. Match YAMAP date 2024-05-19
fs.writeFileSync(path.join(testGpxDir, 'yamap_2024-05-19_23_30.gpx'), '<gpx></gpx>');
fs.writeFileSync(path.join(testYamapDir, '11111.md'), '- **Title**: Mount A\n- **Date**: 2024年05月19日\n');

// Case 5: Matches UTC-to-JST only
// yamap_2024-05-21_23_00.gpx candidates: 2024-05-21, 2024-05-22. Match YAMAP date 2024-05-22
fs.writeFileSync(path.join(testGpxDir, 'yamap_2024-05-21_23_00.gpx'), '<gpx></gpx>');
fs.writeFileSync(path.join(testYamapDir, '22222.md'), '- **Title**: Mount B\n- **Date**: 2024年05月22日\n');

// Case 6: Multiple YAMAP activities matched (2 activities on same date)
fs.writeFileSync(path.join(testGpxDir, 'yamap_2024-06-01_08_00.gpx'), '<gpx></gpx>');
fs.writeFileSync(path.join(testYamapDir, '33333.md'), '- **Title**: Mount C\n- **Date**: 2024年06-01日\n'); // custom separators test
fs.writeFileSync(path.join(testYamapDir, '44444.md'), '- **Title**: Mount D\n- **Date**: 2024年06月01日\n');

// Case 7: No match
fs.writeFileSync(path.join(testGpxDir, 'yamap_2024-07-01_08_00.gpx'), '<gpx></gpx>');

// Case 8: Unparseable GPX filename
fs.writeFileSync(path.join(testGpxDir, 'invalid_name.gpx'), '<gpx></gpx>');

// Unparseable YAMAP Markdown
fs.writeFileSync(path.join(testYamapDir, '55555.md'), '- **Title**: Bad YAMAP\n- **Date**: invalid\n');

try {
    // Run candidate linking command
    execSync(`node "${cliPath}" link-gpx-yamap-by-date --gpx-dir "${testGpxDir}" --yamap-dir "${testYamapDir}" --out-dir "${testOutDir}" --intermediate-dir "${testIntermediateDir}" --review-dir "${testReviewDir}" --report "${testReport}"`, { stdio: 'pipe' });

    // Validate Case 12 & 13: Exact counts (5 GPX files -> 5 candidate records, 5 CSV rows excluding header)
    const candidatesPath = path.join(testOutDir, 'date_candidate_links.jsonl');
    assert.ok(fs.existsSync(candidatesPath), 'Candidate links should exist');
    const candidatesLines = fs.readFileSync(candidatesPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.strictEqual(candidatesLines.length, 5);

    const reviewCsvPath = path.join(testReviewDir, 'date_review_queue.csv');
    assert.ok(fs.existsSync(reviewCsvPath), 'Review CSV should exist');
    const csvRows = fs.readFileSync(reviewCsvPath, 'utf8').trim().split('\n');
    assert.strictEqual(csvRows.length, 6); // 1 header + 5 records

    // Case 14: Source files are not modified
    assert.strictEqual(fs.readFileSync(path.join(testGpxDir, 'yamap_2024-05-19_23_30.gpx'), 'utf8'), '<gpx></gpx>');
    assert.strictEqual(fs.readFileSync(path.join(testYamapDir, '11111.md'), 'utf8'), '- **Title**: Mount A\n- **Date**: 2024年05月19日\n');

    // Case 15: Target collision protection
    try {
        execSync(`node "${cliPath}" link-gpx-yamap-by-date --gpx-dir "${testGpxDir}" --yamap-dir "${testYamapDir}" --out-dir "${testOutDir}" --intermediate-dir "${testIntermediateDir}" --review-dir "${testReviewDir}" --report "${testReport}"`, { stdio: 'pipe' });
        assert.fail('Should have failed due to target collisions');
    } catch (e) {
        assert.ok(e.message.includes('Command failed'), 'Target collision correctly triggered error');
    }

    // Specific Match Checking
    const p1 = candidatesLines.find(r => r.gpx_basename === 'yamap_2024-05-19_23_30.gpx');
    assert.strictEqual(p1.match_status, 'single_date_candidate');
    assert.strictEqual(p1.candidate_yamap_activities[0].yamap_activity_id, '11111');
    assert.deepStrictEqual(p1.candidate_yamap_activities[0].matched_gpx_date_assumptions, ['filename_datetime_is_jst']);

    const p2 = candidatesLines.find(r => r.gpx_basename === 'yamap_2024-05-21_23_00.gpx');
    assert.strictEqual(p2.match_status, 'single_date_candidate');
    assert.strictEqual(p2.candidate_yamap_activities[0].yamap_activity_id, '22222');
    assert.deepStrictEqual(p2.candidate_yamap_activities[0].matched_gpx_date_assumptions, ['filename_datetime_is_utc_then_converted_to_jst']);

    const p3 = candidatesLines.find(r => r.gpx_basename === 'yamap_2024-06-01_08_00.gpx');
    assert.strictEqual(p3.match_status, 'multiple_date_candidates');
    assert.strictEqual(p3.candidate_count, 2);

    const p4 = candidatesLines.find(r => r.gpx_basename === 'yamap_2024-07-01_08_00.gpx');
    assert.strictEqual(p4.match_status, 'no_date_candidate');
    assert.strictEqual(p4.candidate_count, 0);

    const p5 = candidatesLines.find(r => r.gpx_basename === 'invalid_name.gpx');
    assert.strictEqual(p5.match_status, 'gpx_datetime_unparsed');
    assert.strictEqual(p5.candidate_count, 0);

    console.log('All link-gpx-yamap-by-date tests passed!');
} finally {
    // Cleanup
    if (fs.existsSync(testGpxDir)) fs.rmSync(testGpxDir, { recursive: true, force: true });
    if (fs.existsSync(testYamapDir)) fs.rmSync(testYamapDir, { recursive: true, force: true });
    if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true, force: true });
    if (fs.existsSync(testIntermediateDir)) fs.rmSync(testIntermediateDir, { recursive: true, force: true });
    if (fs.existsSync(testReviewDir)) fs.rmSync(testReviewDir, { recursive: true, force: true });
    if (fs.existsSync(testReport)) fs.unlinkSync(testReport);
}

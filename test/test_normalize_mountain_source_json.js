const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { normalizeMountainSourceJson } = require('../lib/mountain_source_json_normalization');
const normalizeCommand = require('../commands/normalize-mountain-source-json');

async function run() {
    console.log('--- Testing normalize-mountain-source-json logic ---');

    // Generate 531 rows for testing
    const rows = [
        'mountain_no,csv_no,source_row_no,mountain_no_source,mountain_no_status,山名,GPS,エントリーコースお勧め山,難易度ランク,標高,YAMAP link,市町村・島,ignored_col1'
    ];
    // Row 1 (No 1)
    rows.push('1,1,2,csv_no,authoritative_csv_no,関ヶ森,"33.466177, 132.958796",,2,"1,592",https://yamap.com/activities/15239274,松山市,dummy1');
    // Row 2 (No 2 - provisional)
    rows.push('2,,3,sequence_fill_after_max_csv_no,provisional_sequence_filled_no,うつむき山,,〇,,535,,岩城島,dummy2');

    
    // Rows 3 to 531
    for (let i = 3; i <= 531; i++) {
        rows.push(`${i},${i},${i + 1},csv_no,authoritative_csv_no,Mountain ${i},,,3,100,,松山市,dummy`);
    }

    const testCsvContent = rows.join('\n') + '\n';

    // Run normalization
    const { records, summary } = normalizeMountainSourceJson(testCsvContent);

    // Verify row counts and summary
    assert.strictEqual(summary.input_rows, 531);
    assert.strictEqual(summary.output_records, 531);
    assert.strictEqual(summary.mountain_no_unique, true);
    assert.deepStrictEqual(summary.ignored_source_columns, ['ignored_col1']);

    // Check Row 1 (preserves and parses details)
    const r1 = records[0];
    assert.strictEqual(r1.mountain_no, 1);
    assert.strictEqual(r1.csv_no, 1);
    assert.strictEqual(r1.source_row_no, 2);
    assert.strictEqual(r1.name, '関ヶ森');
    assert.strictEqual(r1.mountain_no_source, 'csv_no');
    assert.strictEqual(r1.mountain_no_status, 'authoritative_csv_no');
    
    // GPS / coordinates
    assert.strictEqual(r1.coordinates.lat, 33.466177);
    assert.strictEqual(r1.coordinates.lon, 132.958796);
    assert.strictEqual(r1.coordinates.raw, '33.466177, 132.958796');
    assert.strictEqual(r1.coordinates.source, 'csv_existing_gps');

    // Elevation commas stripped
    assert.strictEqual(r1.elevation_m, 1592);

    // Difficulty rank numeric
    assert.strictEqual(r1.difficulty_rank, 2);

    // Entry-course default false
    assert.strictEqual(r1.entry_course_recommended, false);

    // YAMAP link
    assert.strictEqual(r1.yamap_url, 'https://yamap.com/activities/15239274');

    // Location
    assert.strictEqual(r1.location.municipality_or_island, '松山市');
    assert.strictEqual(r1.location.municipality, '松山市');
    assert.strictEqual(r1.location.island, null);

    // Check Row 2 (provisional/blank-no representation)
    const r2 = records[1];
    assert.strictEqual(r2.mountain_no, 2);
    assert.strictEqual(r2.csv_no, null);
    assert.strictEqual(r2.source_row_no, 3);
    assert.strictEqual(r2.name, 'うつむき山');
    assert.strictEqual(r2.mountain_no_source, 'sequence_fill_after_max_csv_no');
    assert.strictEqual(r2.mountain_no_status, 'provisional_sequence_filled_no');

    // Empty GPS
    assert.strictEqual(r2.coordinates.lat, null);
    assert.strictEqual(r2.coordinates.lon, null);
    assert.strictEqual(r2.coordinates.raw, '');

    // Entry-course true
    assert.strictEqual(r2.entry_course_recommended, true);

    // Missing difficulty rank becomes null
    assert.strictEqual(r2.difficulty_rank, null);

    // Location ends with '島'
    assert.strictEqual(r2.location.municipality_or_island, '岩城島');
    assert.strictEqual(r2.location.municipality, null);
    assert.strictEqual(r2.location.island, '岩城島');

    // Test: Invalid non-empty GPS string fails
    const invalidGpsCsv = testCsvContent.replace('"33.466177, 132.958796"', '"invalid_gps"');
    assert.throws(() => {
        normalizeMountainSourceJson(invalidGpsCsv);
    }, /Invalid GPS format/);

    // Test: Out-of-bounds GPS coordinates fail
    const oobGpsCsv = testCsvContent.replace('"33.466177, 132.958796"', '"95.0, 132.0"');
    assert.throws(() => {
        normalizeMountainSourceJson(oobGpsCsv);
    }, /GPS coordinates out of bounds/);

    // Test: Empty mountain name fails
    const emptyNameCsv = testCsvContent.replace('関ヶ森', '');
    assert.throws(() => {
        normalizeMountainSourceJson(emptyNameCsv);
    }, /Empty mountain name/);

    // Test: Non-531 record count fails
    const shortCsv = testCsvContent.substring(0, testCsvContent.lastIndexOf('\n531,'));
    assert.throws(() => {
        normalizeMountainSourceJson(shortCsv);
    }, /Record count mismatch/);

    // Test: Duplicate mountain_no fails
    const dupNoCsv = testCsvContent.replace('2,,3,sequence_fill_after_max_csv_no', '1,,3,sequence_fill_after_max_csv_no');
    assert.throws(() => {
        normalizeMountainSourceJson(dupNoCsv);
    }, /mountain_no mismatch or duplicate/);

    console.log('normalize-mountain-source-json tests passed!');
}

if (require.main === module) {
    run().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
}
module.exports = run;


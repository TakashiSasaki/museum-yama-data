const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseCSV } = require('../lib/csv');
const { processNoCompletion } = require('../lib/mountain_source_no_completion');

async function run() {
    console.log('--- Testing complete-mountain-source-no logic ---');

    // Test 1: Happy Path
    const validCsv = `No,山名,GPS
1,Fuji,"35.36,138.73"
2,Aso,"32.88,131.10"
,Unmarked1,"33.00,132.00"
,Unmarked2,"34.00,133.00"
`;

    const { outputCsvContent, summary } = processNoCompletion(validCsv);

    // Verify row counts and content
    assert.strictEqual(summary.input_data_rows, 4);
    assert.strictEqual(summary.output_data_rows, 4);
    assert.strictEqual(summary.source_non_empty_no_count, 2);
    assert.strictEqual(summary.source_blank_no_count, 2);
    assert.strictEqual(summary.max_existing_no, 2);

    // Parse the output to check values
    const parsedRows = parseCSV(outputCsvContent);
    assert.strictEqual(parsedRows.length, 5); // header + 4 rows
    
    const headers = parsedRows[0];
    const rows = parsedRows.slice(1).map(rowArr => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = rowArr[idx];
        });
        return obj;
    });

    // Row 1 (Happy path - preserved non-empty No)
    assert.strictEqual(rows[0]['No'], '1');
    assert.strictEqual(rows[0]['mountain_no'], '1');
    assert.strictEqual(rows[0]['csv_no'], '1');
    assert.strictEqual(rows[0]['source_row_no'], '2'); // Line 2
    assert.strictEqual(rows[0]['mountain_no_source'], 'csv_no');
    assert.strictEqual(rows[0]['mountain_no_status'], 'authoritative_csv_no');
    assert.strictEqual(rows[0]['gps_raw'], '35.36,138.73'); // due to comma in quotes, simple split splits it. Let's not rely on simple split for quoted fields.
    
    // Row 3 (Happy path - sequence-filled No)
    assert.strictEqual(rows[2]['No'], '3'); // max_existing_no + 1
    assert.strictEqual(rows[2]['mountain_no'], '3');
    assert.strictEqual(rows[2]['csv_no'], '');
    assert.strictEqual(rows[2]['source_row_no'], '4'); // Line 4
    assert.strictEqual(rows[2]['mountain_no_source'], 'sequence_fill_after_max_csv_no');
    assert.strictEqual(rows[2]['mountain_no_status'], 'provisional_sequence_filled_no');

    // Test 2: Duplicate existing No
    const dupCsv = `No,山名,GPS
1,Fuji,"35.36,138.73"
1,Duplicate,"32.00,131.00"
`;
    assert.throws(() => {
        processNoCompletion(dupCsv);
    }, /duplicate existing No/);

    // Test 3: Non-contiguous existing No values
    const nonContigCsv = `No,山名,GPS
1,Fuji,"35.36,138.73"
3,Gap,"32.00,131.00"
`;
    assert.throws(() => {
        processNoCompletion(nonContigCsv);
    }, /non-contiguous existing No values/);

    // Test 4: Non-integer non-empty No
    const floatCsv = `No,山名,GPS
1.5,Fuji,"35.36,138.73"
`;
    assert.throws(() => {
        processNoCompletion(floatCsv);
    }, /non-integer non-empty No/);

    // Test 5: Missing No column
    const missingNoCsv = `山名,GPS
Fuji,"35.36,138.73"
`;
    assert.throws(() => {
        processNoCompletion(missingNoCsv);
    }, /No column missing/);

    // Test 6: Missing GPS column
    const missingGpsCsv = `No,山名
1,Fuji
`;
    assert.throws(() => {
        processNoCompletion(missingGpsCsv);
    }, /GPS column missing/);

    console.log('complete-mountain-source-no tests passed!');
}

if (require.main === module) {
    run().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
}
module.exports = run;


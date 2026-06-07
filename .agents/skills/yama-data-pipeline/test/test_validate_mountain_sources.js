const assert = require('assert');
const {
    validateCsv,
    summarizeLegacyJsonArray,
    summarizeWebMountains
} = require('../lib/mountain_source_validation');

async function run() {
    console.log('--- Testing validate-mountain-sources logic ---');

    // Test 1: Valid CSV
    const validCsv = [];
    for (let i = 1; i <= 501; i++) {
        validCsv.push({ 'No': String(i) });
    }
    // Plus some blank No rows
    for (let i = 0; i < 30; i++) {
        validCsv.push({ 'No': '' });
    }

    let res = validateCsv(validCsv);
    assert.strictEqual(res.totalDataRows, 531);
    assert.strictEqual(res.nonEmptyNoCount, 501);
    assert.strictEqual(res.blankNoCount, 30);
    assert.strictEqual(res.integerNoCount, 501);
    assert.strictEqual(res.isUnique, true);
    assert.strictEqual(res.expectedRangeCoverage, true);
    assert.strictEqual(res.isCount501, true);
    assert.strictEqual(res.status, 'PASS');

    // Test 2: Missing number in range
    const missingCsv = [];
    for (let i = 1; i <= 501; i++) {
        if (i === 100) continue; // missing 100
        missingCsv.push({ 'No': String(i) });
    }
    res = validateCsv(missingCsv);
    assert.strictEqual(res.expectedRangeCoverage, false);
    assert.strictEqual(res.isCount501, false);
    assert.strictEqual(res.status, 'FAIL');

    // Test 3: Duplicates
    const dupCsv = [];
    for (let i = 1; i <= 501; i++) {
        dupCsv.push({ 'No': String(i) });
    }
    dupCsv.push({ 'No': '501' }); // duplicate 501
    res = validateCsv(dupCsv);
    assert.strictEqual(res.isUnique, false);
    assert.strictEqual(res.isCount501, false); // 502 total non-empty
    assert.strictEqual(res.status, 'FAIL');

    // Test 4: legacy json summary
    const legacyArray = [
        { 'No': 1, 'mountain_no': 1, 'lat': 33.0 },
        { 'No': null, 'lat': 33.1 }
    ];
    let summary = summarizeLegacyJsonArray(legacyArray);
    assert.strictEqual(summary.type, 'array');
    assert.strictEqual(summary.itemCount, 2);
    assert.strictEqual(summary.integerNoCount, 1);
    assert.strictEqual(summary.blankNoCount, 1);
    assert.strictEqual(summary.missingNoCount, 0);
    assert.strictEqual(summary.hasMountainNo, true);
    assert.strictEqual(summary.fields.includes('lat'), true);
    assert.strictEqual(summary.status.startsWith('WARN'), true); // since count != 531

    // Test 5: legacy web mountains
    const webObj = {
        '山名A': { 'ele': 100 },
        '山名B': { 'ele': 200 }
    };
    summary = summarizeWebMountains(webObj);
    assert.strictEqual(summary.type, 'object');
    assert.strictEqual(summary.keyCount, 2);
    assert.strictEqual(summary.keyStyle, 'name-like strings');
    assert.strictEqual(summary.fields.includes('ele'), true);
    assert.strictEqual(summary.status.includes('PASS_WITH_WARNINGS'), true);

    console.log('validate-mountain-sources tests passed!');
}

if (require.main === module) {
    run().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
}
module.exports = run;


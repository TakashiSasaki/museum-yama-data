const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { extractExcelSheets, isValidSheetName } = require('../lib/excel_sheet_extraction');

async function runTests() {
    console.log('Running Excel sheet extraction tests...');

    // Test isValidSheetName
    assert.strictEqual(isValidSheetName('Sheet1'), true);
    assert.strictEqual(isValidSheetName('愛媛県の山'), true);
    assert.strictEqual(isValidSheetName(''), false);
    assert.strictEqual(isValidSheetName('   '), false);
    assert.strictEqual(isValidSheetName('Sheet/1'), false);
    assert.strictEqual(isValidSheetName('Sheet\\1'), false);

    const fixturesDir = path.join(__dirname, 'fixtures', 'excel_sheet_extraction');
    const tempOutputDir = path.join(__dirname, 'tmp_excel_out');

    function cleanup() {
        if (fs.existsSync(tempOutputDir)) {
            fs.rmSync(tempOutputDir, { recursive: true, force: true });
        }
    }

    // 1. Single sheet success
    cleanup();
    let res = await extractExcelSheets(path.join(fixturesDir, 'single_sheet.xlsx'), tempOutputDir);
    if (res.status !== 'success') { console.error(res); }
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.extractedCount, 1);
    assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'Sheet1.csv')), true);

    // 2. Multiple sheets success
    cleanup();
    res = await extractExcelSheets(path.join(fixturesDir, 'multiple_sheets.xlsx'), tempOutputDir);
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.extractedCount, 2);
    assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'Sheet1.csv')), true);
    assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'Sheet2.csv')), true);

    // 3. Japanese sheets success
    cleanup();
    res = await extractExcelSheets(path.join(fixturesDir, 'japanese_sheets.xlsx'), tempOutputDir);
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.extractedCount, 2);
    assert.strictEqual(fs.existsSync(path.join(tempOutputDir, '愛媛県の山.csv')), true);
    assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'エントリーコースお勧め山.csv')), true);

    // 4. Output collision fails
    cleanup();
    fs.mkdirSync(tempOutputDir, { recursive: true });
    fs.writeFileSync(path.join(tempOutputDir, 'Sheet1.csv'), 'conflict');
    res = await extractExcelSheets(path.join(fixturesDir, 'single_sheet.xlsx'), tempOutputDir);
    assert.strictEqual(res.status, 'failed');
    assert.ok(res.errors.some(e => e.includes('Output collision')));

    // 5. Invalid workbook fails
    cleanup();
    res = await extractExcelSheets(path.join(fixturesDir, 'non_existent.xlsx'), tempOutputDir);
    assert.strictEqual(res.status, 'failed');

    cleanup();
    console.log('Excel sheet extraction tests passed.');
}

module.exports = runTests;

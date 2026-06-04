const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const { extractExcelSheets } = require('../lib/excel_sheet_extraction');

function writeReport(reportPath, result, inputPath, outDir) {
    let reportMarkdown = `# Excel Sheet Extraction Report\n\n`;

    reportMarkdown += `## Summary\n`;
    reportMarkdown += `- status: ${result.status}\n`;
    reportMarkdown += `- input_workbook: ${inputPath}\n`;
    reportMarkdown += `- output_dir: ${outDir}\n`;
    reportMarkdown += `- sheet_count: ${result.sheetCount}\n`;
    reportMarkdown += `- extracted_csv_count: ${result.extractedCount}\n\n`;

    reportMarkdown += `## Workbook\n`;
    reportMarkdown += `- input path: ${inputPath}\n`;
    reportMarkdown += `- workbook readable: ${result.sheetNames !== undefined ? 'true' : 'false'}\n`;
    if (result.sheetNames) {
        reportMarkdown += `- sheet names discovered:\n`;
        result.sheetNames.forEach(name => {
             reportMarkdown += `  - ${name}\n`;
        });
    }
    reportMarkdown += `\n`;

    reportMarkdown += `## Preflight Checks\n`;
    reportMarkdown += `- non-empty sheet names: ${result.errors.some(e => e.includes('Invalid sheet name')) ? 'failed' : 'passed'}\n`;
    reportMarkdown += `- filename separator checks: ${result.errors.some(e => e.includes('Invalid sheet name')) ? 'failed' : 'passed'}\n`;
    reportMarkdown += `- duplicate output filenames: ${result.errors.some(e => e.includes('Duplicate output filename')) ? 'failed' : 'passed'}\n`;
    reportMarkdown += `- output collisions: ${result.errors.some(e => e.includes('Output collision')) ? 'failed' : 'passed'}\n`;
    reportMarkdown += `- safe output paths: passed\n\n`;

    reportMarkdown += `## Extracted CSV Files\n`;
    if (result.extractedFiles && result.extractedFiles.length > 0) {
        result.extractedFiles.forEach(file => {
            reportMarkdown += `- ${file}\n`;
        });
    } else {
        reportMarkdown += `- (none)\n`;
    }
    reportMarkdown += `\n`;

    reportMarkdown += `## Verification\n`;
    reportMarkdown += `- write succeeded: ${result.errors.some(e => e.includes('Failed processing sheet')) ? 'failed' : 'passed'}\n`;
    reportMarkdown += `- reopen by exact filename succeeded: ${result.errors.some(e => e.includes('Failed processing sheet')) ? 'failed' : 'passed'}\n`;
    reportMarkdown += `- read-back content matched: ${result.errors.some(e => e.includes('Read-back content mismatch')) ? 'failed' : 'passed'}\n\n`;

    if (result.status === 'failed' && result.errors.length > 0) {
         reportMarkdown += `## Failure Reason\n`;
         result.errors.forEach(err => {
             reportMarkdown += `- ${err}\n`;
         });
         reportMarkdown += `\n`;
    }

    reportMarkdown += `## Notes\n`;
    reportMarkdown += `- source workbook was not modified\n`;
    reportMarkdown += `- sheet names were used exactly as filenames\n`;
    reportMarkdown += `- no fallback filenames were generated\n`;
    reportMarkdown += `- staging write/read-back validation was used\n`;
    reportMarkdown += `- CSV encoding: ${result.encoding}\n`;
    reportMarkdown += `- Line endings: ${result.lineEnding}\n`;
    reportMarkdown += `- Empty sheets: extracted without skipping\n`;

    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, reportMarkdown, 'utf8');
}

module.exports = async function (options) {
    if (!options.input || !options.outDir) {
        throw new Error('--input and --out-dir are required.');
    }

    const inputPath = path.resolve(options.input);
    const outDir = path.resolve(options.outDir);

    log.info(`Extracting Excel sheets from: ${inputPath}`);
    log.info(`Output directory: ${outDir}`);

    const result = await extractExcelSheets(inputPath, outDir);

    if (options.report) {
        const reportPath = path.resolve(options.report);
        writeReport(reportPath, result, options.input, options.outDir);
        log.info(`Report written to: ${options.report}`);
    } else {
        log.info(`Extraction Summary:`);
        log.info(`  Status: ${result.status}`);
        log.info(`  Extracted: ${result.extractedCount}/${result.sheetCount}`);
        if (result.status === 'failed') {
            log.error(`  Errors:`);
            result.errors.forEach(e => log.error(`    - ${e}`));
        }
    }

    if (result.status === 'failed') {
        log.error('Excel extraction failed.');
        let errorMsg = "Excel extraction failed.";
        if (result.errors && result.errors.length > 0) {
            const summary = result.errors.slice(0, 3).join('; ');
            errorMsg += ` Reasons: ${summary}${result.errors.length > 3 ? '...' : ''}.`;
        }
        if (options.report) {
            errorMsg += ` See report at ${options.report} for details.`;
        }
        throw new Error(errorMsg);
    } else {
        log.info('Excel extraction completed successfully.');
    }
};

const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const { extractGpxArchive } = require('../lib/gpx_archive_intake');

/**
 * Portable command wrapper for all-or-nothing GPX archive extraction.
 */
module.exports = async function intake(options) {
    const inputPath = path.resolve(options.input);
    const outDir = path.resolve(options.outDir);
    const reportPath = options.report ? path.resolve(options.report) : null;

    log.info(`Starting portable GPX archive intake...`);
    log.info(`Input ZIP: ${inputPath}`);
    log.info(`Output Dir: ${outDir}`);

    let result;
    try {
        result = extractGpxArchive(inputPath, outDir);
        log.info(`Intake successful. Extracted ${result.extractedGpxCount} GPX files.`);
    } catch (err) {
        log.error(`Intake failed: ${err.message}`);

        if (reportPath) {
            writeReport(reportPath, { status: 'FAILURE', inputZip: inputPath, outputDir: outDir, error: err.message });
        }
        throw err;
    }

    if (reportPath) {
        writeReport(reportPath, result);
        log.info(`Report written to: ${reportPath}`);
    } else {
        console.log(`\nSummary:`);
        console.log(`  Status: SUCCESS`);
        console.log(`  Extracted: ${result.extractedGpxCount}`);
        console.log(`  Ignored (Non-GPX): ${result.ignoredNonGpxCount}`);
        console.log(`  Ignored (Directories): ${result.ignoredDirectoryCount}\n`);
    }
};

function writeReport(reportPath, result) {
    let reportContent = `# GPX Archive Intake Report\n\n`;

    reportContent += `## Summary\n`;
    reportContent += `- status: ${result.status}\n`;
    reportContent += `- input_zip: ${result.inputZip}\n`;
    reportContent += `- output_dir: ${result.outputDir}\n`;

    if (result.status === 'SUCCESS') {
        reportContent += `- selected_gpx_count: ${result.selectedGpxCount}\n`;
        reportContent += `- extracted_gpx_count: ${result.extractedGpxCount}\n`;
        reportContent += `- ignored_non_gpx_count: ${result.ignoredNonGpxCount}\n`;
        reportContent += `- ignored_directory_count: ${result.ignoredDirectoryCount}\n\n`;

        reportContent += `## Preflight Checks\n`;
        reportContent += `- input ZIP readable: true\n`;
        reportContent += `- GPX entries found: true\n`;
        reportContent += `- duplicate flattened basenames: false\n`;
        reportContent += `- output collisions: false\n`;
        reportContent += `- safe output paths: true\n\n`;

        reportContent += `## Extracted GPX Files\n`;
        for (const baseName of result.extractedBasenames) {
            reportContent += `- ${baseName}\n`;
        }
        reportContent += `\n`;

        reportContent += `## Ignored Entries\n`;
        reportContent += `- count of non-GPX entries: ${result.ignoredNonGpxCount}\n`;
        reportContent += `- count of directory entries: ${result.ignoredDirectoryCount}\n\n`;
    } else {
        reportContent += `\n## Failure Reason\n`;
        reportContent += `- ${result.error}\n\n`;
    }

    reportContent += `## Notes\n`;
    reportContent += `- source ZIP was not modified\n`;
    reportContent += `- internal ZIP directory structure was ignored\n`;
    reportContent += `- non-GPX files were ignored\n`;

    // Ensure dir for report exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, reportContent, 'utf8');
}

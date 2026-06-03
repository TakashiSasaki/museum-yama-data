const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const {
    loadJson,
    loadCsv,
    validateCsv,
    summarizeLegacyJsonArray,
    summarizeWebMountains,
    buildReport
} = require('../lib/mountain_source_validation');

module.exports = async function validateMountainSources(options) {
    if (!options.csv) {
        throw new Error('Missing required argument: --csv');
    }
    if (!options.out) {
        throw new Error('Missing required argument: --out');
    }

    try {
        const csvData = loadCsv(options.csv);
        const csvResult = validateCsv(csvData);

        let legacyMergedData = null;
        let legacyMergedSummary = null;
        if (options.legacyMerged) {
            legacyMergedData = loadJson(options.legacyMerged);
            if (legacyMergedData) {
                legacyMergedSummary = summarizeLegacyJsonArray(legacyMergedData);
            }
        }

        let legacyLinkData = null;
        let legacyLinkSummary = null;
        if (options.legacyLinkMapping) {
            legacyLinkData = loadJson(options.legacyLinkMapping);
            if (legacyLinkData) {
                legacyLinkSummary = summarizeLegacyJsonArray(legacyLinkData);
            }
        }

        let legacySummitData = null;
        let legacySummitSummary = null;
        if (options.legacySummitCoordinates) {
            legacySummitData = loadJson(options.legacySummitCoordinates);
            if (legacySummitData) {
                legacySummitSummary = summarizeLegacyJsonArray(legacySummitData);
            }
        }

        let webMountainsData = null;
        let webMountainsSummary = null;
        if (options.webMountains) {
            webMountainsData = loadJson(options.webMountains);
            if (webMountainsData) {
                webMountainsSummary = summarizeWebMountains(webMountainsData);
            }
        }

        const { report, isFail } = buildReport(
            csvResult,
            legacyMergedSummary,
            legacyLinkSummary,
            legacySummitSummary,
            webMountainsSummary
        );

        fs.writeFileSync(options.out, report, 'utf8');
        log.info(`Validation report written to ${options.out}`);

        // Return success regardless of isFail, as we just want to output the report without crashing
        // The calling script `cli.js` exits with 1 only on exceptions
    } catch (e) {
        throw new Error(`Execution failed: ${e.message}`);
    }
};

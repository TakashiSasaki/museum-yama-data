const fs = require('fs');
const path = require('path');
const { parseCSV } = require('./csv');

function loadJson(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return { __PARSE_ERROR: e.message, filePath };
    }
}

function loadCsv(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Required CSV file missing: ${filePath}`);
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const rows = parseCSV(raw);
        if (rows.length === 0) return [];
        const headers = rows[0];
        const dataRows = [];
        for (let i = 1; i < rows.length; i++) {
            const rowArr = rows[i];
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = rowArr[j];
            }
            dataRows.push(obj);
        }
        return dataRows;
    } catch (e) {
        throw new Error(`Failed to parse CSV file at ${filePath}: ${e.message}`);
    }
}

function validateCsv(records) {
    let totalDataRows = records.length;
    let nonEmptyNoCount = 0;
    let blankNoCount = 0;
    let integerNoCount = 0;
    let uniqueNos = new Set();
    let duplicates = [];
    let isInteger = true;
    let nos = [];

    records.forEach(row => {
        let noStr = row['No'] !== undefined ? String(row['No']).trim() : '';
        if (noStr === '') {
            blankNoCount++;
        } else {
            nonEmptyNoCount++;
            let noInt = Number(noStr);
            if (Number.isInteger(noInt)) {
                integerNoCount++;
                nos.push(noInt);
                if (uniqueNos.has(noInt)) {
                    duplicates.push(noInt);
                }
                uniqueNos.add(noInt);
            } else {
                isInteger = false;
            }
        }
    });

    let expectedRangeCoverage = true;
    for (let i = 1; i <= 501; i++) {
        if (!uniqueNos.has(i)) {
            expectedRangeCoverage = false;
            break;
        }
    }

    const isUnique = duplicates.length === 0;
    const isCount501 = nonEmptyNoCount === 501 && integerNoCount === 501;

    let status = 'PASS';
    if (!isCount501 || !isUnique || !isInteger || !expectedRangeCoverage) {
        status = 'FAIL';
    }

    return {
        totalDataRows,
        nonEmptyNoCount,
        blankNoCount,
        integerNoCount,
        isUnique,
        duplicates,
        isInteger,
        expectedRangeCoverage,
        isCount501,
        status
    };
}

function summarizeLegacyJsonArray(data) {
    if (data && data.__PARSE_ERROR) {
        return {
            type: 'error',
            itemCount: 0,
            integerNoCount: 0,
            blankNoCount: 0,
            missingNoCount: 0,
            hasMountainNo: false,
            expectedRangeCoverage: false,
            fields: [],
            status: `WARN - Parse error: ${data.__PARSE_ERROR}`
        };
    }

    if (!Array.isArray(data)) {
        return {
            type: typeof data,
            itemCount: 0,
            integerNoCount: 0,
            blankNoCount: 0,
            missingNoCount: 0,
            hasMountainNo: false,
            expectedRangeCoverage: false,
            fields: [],
            status: 'WARN - Expected Array'
        };
    }

    let integerNoCount = 0;
    let blankNoCount = 0;
    let missingNoCount = 0;
    let hasMountainNo = false;
    let uniqueNos = new Set();
    let fields = new Set();

    data.forEach(item => {
        Object.keys(item).forEach(k => fields.add(k));

        if ('mountain_no' in item) {
            hasMountainNo = true;
        }

        if (!('No' in item)) {
            missingNoCount++;
        } else {
            let val = item['No'];
            if (val === null || val === '') {
                blankNoCount++;
            } else if (Number.isInteger(Number(val))) {
                integerNoCount++;
                uniqueNos.add(Number(val));
            }
        }
    });

    let expectedRangeCoverage = true;
    for (let i = 1; i <= 501; i++) {
        if (!uniqueNos.has(i)) {
            expectedRangeCoverage = false;
            break;
        }
    }

    return {
        type: 'array',
        itemCount: data.length,
        integerNoCount,
        blankNoCount,
        missingNoCount,
        hasMountainNo,
        expectedRangeCoverage,
        fields: Array.from(fields).sort(),
        status: data.length === 531 ? 'PASS_WITH_WARNINGS (Legacy schema)' : 'WARN - Unexpected item count'
    };
}

function summarizeWebMountains(data) {
    if (data && data.__PARSE_ERROR) {
        return {
            type: 'error',
            keyCount: 0,
            keyStyle: 'error',
            fields: [],
            status: `WARN - Parse error: ${data.__PARSE_ERROR}`
        };
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return {
            type: Array.isArray(data) ? 'array' : typeof data,
            keyCount: 0,
            keyStyle: 'unknown',
            fields: [],
            status: 'WARN - Expected Object'
        };
    }

    let keys = Object.keys(data);
    let keyCount = keys.length;
    let fields = new Set();

    // Check key style (whether it's numeric or name-like)
    let isNameKeyed = keys.length > 0 && isNaN(Number(keys[0]));

    if (keys.length > 0) {
        let sample = data[keys[0]];
        if (typeof sample === 'object' && sample !== null) {
            Object.keys(sample).forEach(k => fields.add(k));
        }
    }

    return {
        type: 'object',
        keyCount,
        keyStyle: isNameKeyed ? 'name-like strings' : 'numeric',
        fields: Array.from(fields).sort(),
        status: isNameKeyed ? 'PASS_WITH_WARNINGS (Legacy web cache)' : 'NEEDS_DECISION - Unexpected key format'
    };
}

function buildReport(csvResult, legacyMerged, legacyLink, legacySummit, webMountains) {
    const csvStatusStr = csvResult.status;
    const overallStatus = csvStatusStr === 'FAIL' ? 'FAIL' : 'PASS_WITH_WARNINGS';
    const dateStr = new Date().toISOString();

    let report = `# Mountain Source Validation Report

## Summary
- **overall_status**: ${overallStatus}
- **generated_by_command**: validate-mountain-sources
- **authoritative_record_count**: ${csvResult.isCount501 ? '501 (Satisfied)' : csvResult.nonEmptyNoCount + ' (Failed)'}
- **expected_key_set**: ${csvResult.expectedRangeCoverage ? '1..501 (Satisfied)' : 'Failed'}
- **blank_no_excluded_count**: ${csvResult.blankNoCount}
- **key conclusion**: ${overallStatus === 'FAIL' ? 'The authoritative count invariant is NOT satisfied.' : 'The required CSV invariant is assessable, but a documented design decision blocks future conversion until all fields are classified.'}

## Inputs
- **CSV path**: Provided, status: ${csvStatusStr}
- **Legacy merged JSON**: ${legacyMerged ? 'Provided' : 'not_provided'}
- **Legacy link mapping JSON**: ${legacyLink ? 'Provided' : 'not_provided'}
- **Legacy summit coordinates JSON**: ${legacySummit ? 'Provided' : 'not_provided'}
- **Web mountains JSON**: ${webMountains ? 'Provided' : 'not_provided'}

## CSV Authoritative Source Validation
- **total data rows**: ${csvResult.totalDataRows}
- **non-empty No count**: ${csvResult.nonEmptyNoCount}
- **blank No count**: ${csvResult.blankNoCount}
- **integer No count**: ${csvResult.integerNoCount}
- **uniqueness**: ${csvResult.isUnique ? 'Yes' : 'No'}
- **expected range coverage**: ${csvResult.expectedRangeCoverage ? 'Yes' : 'No'}
- **status**: ${csvStatusStr}

## Legacy JSON Schema References
`;

    if (legacyMerged) {
        report += `### processed/mountain_merged.json
- **top-level type**: ${legacyMerged.type}
- **item count**: ${legacyMerged.itemCount}
- **No presence summary**: ${legacyMerged.integerNoCount} integer, ${legacyMerged.blankNoCount} blank
- **mountain_no presence summary**: ${legacyMerged.hasMountainNo ? 'Present' : 'Not present'}
- **field inventory summary**: ${legacyMerged.fields.join(', ')}
- **status / notes**: ${legacyMerged.status}. Adaptation from No to mountain_no is required.

`;
    }

    if (legacyLink) {
        report += `### processed/mountain_link_mapping.json
- **top-level type**: ${legacyLink.type}
- **item count**: ${legacyLink.itemCount}
- **No presence summary**: ${legacyLink.integerNoCount} integer, ${legacyLink.blankNoCount} blank
- **mountain_no presence summary**: ${legacyLink.hasMountainNo ? 'Present' : 'Not present'}
- **field inventory summary**: ${legacyLink.fields.join(', ')}
- **status / notes**: ${legacyLink.status}. Schema/evidence reference only.

`;
    }

    if (legacySummit) {
        report += `### processed/mountain_summit_coordinates.json
- **top-level type**: ${legacySummit.type}
- **item count**: ${legacySummit.itemCount}
- **No presence summary**: ${legacySummit.integerNoCount} integer, ${legacySummit.blankNoCount} blank
- **mountain_no presence summary**: ${legacySummit.hasMountainNo ? 'Present' : 'Not present'}
- **field inventory summary**: ${legacySummit.fields.join(', ')}
- **status / notes**: ${legacySummit.status}. Schema/evidence reference only.

`;
    }

    report += `## Legacy Web Cache
`;

    if (webMountains) {
        report += `### museum-yama-web/mountains.json
- **top-level type**: ${webMountains.type}
- **key count**: ${webMountains.keyCount}
- **key style**: ${webMountains.keyStyle}
- **field inventory summary**: ${webMountains.fields.join(', ')}
- **status / notes**: ${webMountains.status}. Legacy web cache/evidence only, not primary-key source.

`;
    } else {
        report += `*not_provided*\n\n`;
    }

    report += `## Conclusions
- **whether CSV authoritative invariant is satisfied**: ${csvResult.isCount501 && csvResult.expectedRangeCoverage ? 'Yes' : 'No'}
- **whether legacy No can be adapted to mountain_no**: Yes, by adapting non-empty legacy No.
- **whether blank/null No records are excluded**: ${csvResult.blankNoCount > 0 ? 'Yes, they are present but logically excluded from authoritative count.' : 'No blank records found.'}
- **blockers before canonical resolved JSON generation**: Field classifications for legacy references and sources must be fully decided ('needs_decision', etc). Canonical output cannot be generated until this is completed.
`;

    return { report, isFail: csvStatusStr === 'FAIL' };
}

module.exports = {
    loadJson,
    loadCsv,
    validateCsv,
    summarizeLegacyJsonArray,
    summarizeWebMountains,
    buildReport
};

const fs = require('fs');
const path = require('path');
const os = require('os');
const xlsx = require('xlsx');
const safeFs = require('./fs_safe');
const log = require('./log');

/**
 * Validates a sheet name to ensure it's a valid, safe filename base.
 */
function isValidSheetName(name) {
    if (!name || name.trim() === '') return false;
    // Check for path separators
    if (name.includes('/') || name.includes('\\')) return false;
    // Additional basic sanity check (e.g., control characters)
    if (/[\x00-\x1F]/.test(name)) return false;
    return true;
}

/**
 * Extracts sheets from an Excel workbook into CSV files.
 * @param {string} inputPath Path to the Excel workbook.
 * @param {string} outDir Path to output directory for CSVs.
 * @returns {object} Result summary: { status, sheetCount, extractedCount, extractedFiles: [], errors: [], stagingDir }
 */
async function extractExcelSheets(inputPath, outDir) {
    const result = {
        status: 'failed',
        sheetCount: 0,
        extractedCount: 0,
        extractedFiles: [],
        errors: [],
        stagingDir: null,
        encoding: 'UTF-8 without BOM',
        lineEnding: 'LF (\\n)',
        emptySheetsHandled: true,
        validation: 'staged write/read-back exact equality'
    };

    if (!fs.existsSync(inputPath)) {
        result.errors.push(`Input workbook not found: ${inputPath}`);
        return result;
    }

    let workbook;
    try {
        workbook = xlsx.readFile(inputPath, { raw: true });
    } catch (e) {
        result.errors.push(`Failed to parse workbook: ${e.message}`);
        return result;
    }

    const sheetNames = workbook.SheetNames;
    result.sheetCount = sheetNames.length;
    result.sheetNames = sheetNames;

    if (sheetNames.length === 0) {
        result.errors.push('Workbook contains no worksheets.');
        return result;
    }

    // Preflight check 1: Sheet names valid as filenames
    const filenameMap = new Map();
    for (const name of sheetNames) {
        if (!isValidSheetName(name)) {
            result.errors.push(`Invalid sheet name for filename usage: "${name}"`);
            continue; // Will fail overall later
        }

        const filename = `${name}.csv`;
        if (filenameMap.has(filename)) {
            result.errors.push(`Duplicate output filename detected for sheet: "${name}"`);
        }
        filenameMap.set(filename, name);
    }

    if (result.errors.length > 0) return result;

    // Create final output directory if it doesn't exist
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // Preflight check 2: Check for collisions in output directory
    for (const filename of filenameMap.keys()) {
        const finalPath = path.join(outDir, filename);
        if (fs.existsSync(finalPath)) {
            result.errors.push(`Output collision: file already exists at ${finalPath}`);
        }
    }

    if (result.errors.length > 0) return result;

    // Create sibling staging directory
    const outDirAbsolute = path.resolve(outDir);
    const parentDir = path.dirname(outDirAbsolute);
    const basename = path.basename(outDirAbsolute);

    let stagingDir;
    try {
        const stagingPrefix = path.join(parentDir, `.${basename}.excel-sheets-tmp-`);
        stagingDir = fs.mkdtempSync(stagingPrefix);
    } catch (e) {
        log.warn(`Failed to create sibling staging directory: ${e.message}. Falling back to os.tmpdir().`);
        const stagingPrefix = path.join(os.tmpdir(), `excel-sheets-tmp-`);
        stagingDir = fs.mkdtempSync(stagingPrefix);
    }

    result.stagingDir = stagingDir;

    // Convert, Write, and Validate
    const stagedFiles = [];
    for (const sheetName of sheetNames) {
        const filename = `${sheetName}.csv`;
        const stagingPath = path.join(stagingDir, filename);

        try {
            const worksheet = workbook.Sheets[sheetName];
            const csvContent = xlsx.utils.sheet_to_csv(worksheet, { RS: '\n' });

            // Write
            fs.writeFileSync(stagingPath, csvContent, { encoding: 'utf8' });

            // Read-back and validate
            const readBackContent = fs.readFileSync(stagingPath, { encoding: 'utf8' });
            if (readBackContent !== csvContent) {
                 result.errors.push(`Read-back content mismatch for sheet "${sheetName}".`);
                 break; // Stop processing further sheets
            }

            stagedFiles.push({ filename, stagingPath, finalPath: path.join(outDir, filename) });
        } catch (e) {
            result.errors.push(`Failed processing sheet "${sheetName}": ${e.message}`);
            break;
        }
    }

    // If any error occurred during staging/validation, rollback
    if (result.errors.length > 0) {
        cleanupStaging(stagingDir);
        return result;
    }

    // Final Move
    const movedFiles = [];
    for (const file of stagedFiles) {
        try {
            try {
                fs.renameSync(file.stagingPath, file.finalPath);
            } catch (renameErr) {
                if (renameErr.code === 'EXDEV') {
                    // Fallback for cross-device moves when using os.tmpdir()
                    fs.copyFileSync(file.stagingPath, file.finalPath);
                    fs.unlinkSync(file.stagingPath);
                } else {
                    throw renameErr;
                }
            }
            movedFiles.push(file);
        } catch (e) {
            result.errors.push(`Failed to move file to final destination: ${file.finalPath} - ${e.message}`);
            // Rollback moved files
            for (const moved of movedFiles) {
                try {
                     fs.unlinkSync(moved.finalPath);
                } catch (rollbackErr) {
                     log.error(`Critical: Rollback failed for ${moved.finalPath}: ${rollbackErr.message}`);
                }
            }
            cleanupStaging(stagingDir);
            return result;
        }
    }

    // Success cleanup
    cleanupStaging(stagingDir);

    result.status = 'success';
    result.extractedCount = movedFiles.length;
    result.extractedFiles = movedFiles.map(f => f.filename);

    return result;
}

function cleanupStaging(stagingDir) {
    if (stagingDir && fs.existsSync(stagingDir)) {
        try {
            fs.rmSync(stagingDir, { recursive: true, force: true });
        } catch (e) {
            log.error(`Failed to remove staging directory ${stagingDir}: ${e.message}`);
        }
    }
}

module.exports = {
    extractExcelSheets,
    isValidSheetName
};

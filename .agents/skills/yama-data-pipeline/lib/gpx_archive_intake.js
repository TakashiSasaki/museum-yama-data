const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

/**
 * Extracts only GPX files from a ZIP archive into a flat output directory.
 * Operates atomically (all-or-nothing).
 *
 * @param {string} inputZipPath - Path to the source ZIP file.
 * @param {string} outDir - Destination directory for extracted GPX files.
 * @returns {object} - A summary of the extraction process.
 */
function extractGpxArchive(inputZipPath, outDir) {
    if (!fs.existsSync(inputZipPath)) {
        throw new Error(`Input ZIP does not exist: ${inputZipPath}`);
    }

    // Try to ensure outDir exists and is a writable directory
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    } else if (!fs.statSync(outDir).isDirectory()) {
        throw new Error(`Output path exists but is not a directory: ${outDir}`);
    }

    try {
        fs.accessSync(outDir, fs.constants.W_OK);
    } catch (e) {
        throw new Error(`Output directory is not writable: ${outDir}`);
    }

    const zip = new AdmZip(inputZipPath);
    const zipEntries = zip.getEntries();

    const selectedEntries = [];
    const flattenedBasenames = new Set();
    let ignoredNonGpxCount = 0;
    let ignoredDirectoryCount = 0;

    for (const entry of zipEntries) {
        if (entry.isDirectory) {
            ignoredDirectoryCount++;
            continue;
        }

        const entryName = entry.entryName;
        const ext = path.extname(entryName).toLowerCase();
        if (ext !== '.gpx') {
            ignoredNonGpxCount++;
            continue;
        }

        const baseName = path.basename(entryName);
        if (!baseName) {
             throw new Error(`Invalid GPX entry with empty basename: ${entryName}`);
        }

        if (flattenedBasenames.has(baseName)) {
            throw new Error(`Duplicate flattened GPX basename detected inside ZIP: ${baseName}`);
        }
        flattenedBasenames.add(baseName);

        const outPath = path.join(outDir, baseName);
        if (fs.existsSync(outPath)) {
            throw new Error(`Output filename collision. File already exists: ${outPath}`);
        }

        selectedEntries.push({ entry, baseName, outPath });
    }

    if (selectedEntries.length === 0) {
        throw new Error(`No GPX entries found in ZIP archive: ${inputZipPath}`);
    }

    // Prepare staging directory
    let stagingDir;
    // Prefer staging inside the parent of outDir for same-filesystem moves, fallback to os temp
    const parentDir = path.dirname(path.resolve(outDir));
    try {
        stagingDir = fs.mkdtempSync(path.join(parentDir, `.${path.basename(outDir)}.intake-tmp-`));
    } catch (e) {
        // Fallback
        stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-intake-tmp-'));
    }

    const movedPaths = [];
    let success = false;

    try {
        // 1. Extract to staging
        const stagedFiles = [];
        for (const { entry, baseName } of selectedEntries) {
            const stagePath = path.join(stagingDir, baseName);
            fs.writeFileSync(stagePath, entry.getData());
            stagedFiles.push({ stagePath, baseName });
        }

        // 2. Move to outDir (with EXDEV fallback)
        for (const { entry, baseName, outPath } of selectedEntries) {
             const stagePath = path.join(stagingDir, baseName);
             try {
                 fs.renameSync(stagePath, outPath);
             } catch (renameErr) {
                 if (renameErr.code === 'EXDEV') {
                     // Cross-device link fallback
                     fs.copyFileSync(stagePath, outPath);
                     fs.unlinkSync(stagePath);
                 } else {
                     throw renameErr;
                 }
             }
             movedPaths.push(outPath);
        }

        success = true;
    } catch (err) {
        // Rollback
        for (const movedPath of movedPaths) {
            if (fs.existsSync(movedPath)) {
                try {
                    fs.unlinkSync(movedPath);
                } catch (rmErr) {
                    console.error(`Failed to rollback moved file: ${movedPath}`, rmErr);
                }
            }
        }
        throw new Error(`Extraction failed: ${err.message}`);
    } finally {
        if (fs.existsSync(stagingDir)) {
             try {
                 fs.rmSync(stagingDir, { recursive: true, force: true });
             } catch (rmErr) {
                 console.error(`Failed to remove staging directory: ${stagingDir}`, rmErr);
             }
        }
    }

    return {
        status: 'SUCCESS',
        inputZip: inputZipPath,
        outputDir: outDir,
        selectedGpxCount: selectedEntries.length,
        extractedGpxCount: movedPaths.length,
        ignoredNonGpxCount,
        ignoredDirectoryCount,
        extractedBasenames: selectedEntries.map(e => e.baseName).sort()
    };
}

module.exports = {
    extractGpxArchive
};

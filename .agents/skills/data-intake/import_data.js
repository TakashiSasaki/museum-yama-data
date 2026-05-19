const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { getFileHash } = require('../lib/hash');
const { ensureDir, isSafePath } = require('../lib/fs_safe');
const log = require('../lib/log');

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--root');
const ROOT_DIR = (rootArgIndex !== -1 && args[rootArgIndex + 1])
    ? path.resolve(args[rootArgIndex + 1])
    : path.resolve(__dirname, '../../..');

const GPX_DIR = path.join(ROOT_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const CSV_DIR = path.join(ROOT_DIR, 'csv');
const PROCESSED_DIR = path.join(ROOT_DIR, 'processed');

function moveFilesRecursive(src, dest) {
    const items = fs.readdirSync(src);
    for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);

        if (!isSafePath(dest, destPath)) {
            log.error(`Unsafe path detected during move: ${destPath}`);
            continue;
        }

        if (fs.statSync(srcPath).isDirectory()) {
            ensureDir(destPath);
            moveFilesRecursive(srcPath, destPath);
        } else {
            handleCollisionAndMove(srcPath, destPath);
        }
    }
}

function handleCollisionAndMove(srcPath, destPath) {
    if (fs.existsSync(destPath)) {
        const srcHash = getFileHash(srcPath);
        const destHash = getFileHash(destPath);

        if (srcHash === destHash) {
            log.info(`Skipping exact duplicate file: ${path.basename(destPath)}`);
            fs.unlinkSync(srcPath); // remove redundant temp file
        } else {
            // Collision: same name but different content
            const ext = path.extname(destPath);
            const base = path.basename(destPath, ext);
            const newDestPath = path.join(path.dirname(destPath), `${base}_${Date.now()}${ext}`);
            log.warn(`Collision detected for ${path.basename(destPath)}. Different content. Renaming to ${path.basename(newDestPath)}`);
            fs.renameSync(srcPath, newDestPath);
        }
    } else {
        fs.renameSync(srcPath, destPath);
    }
}

function deduplicateExistingGpx() {
    log.info('Scanning for duplicate GPX files in raw directory...');
    const files = fs.readdirSync(RAW_DIR).filter(f => f.toLowerCase().endsWith('.gpx'));
    
    files.forEach(f => {
        // Detect files like foo (1).gpx
        const match = f.match(/^(.*)\s\(\d+\)\.gpx$/i);
        if (match) {
            const baseName = `${match[1]}.gpx`;
            const basePath = path.join(RAW_DIR, baseName);
            const dupPath = path.join(RAW_DIR, f);
            
            if (fs.existsSync(basePath)) {
                const baseHash = getFileHash(basePath);
                const dupHash = getFileHash(dupPath);
                
                if (baseHash === dupHash) {
                    log.info(`Deleting identical duplicate: ${f}`);
                    fs.unlinkSync(dupPath);
                } else {
                    log.warn(`Duplicate found but content differs, resolving collision: ${f}`);
                    // Same pattern but different content, let's rename it to something safe
                    const newDupPath = path.join(RAW_DIR, `${match[1]}_${Date.now()}.gpx`);
                    fs.renameSync(dupPath, newDupPath);
                }
            }
        }
    });
}

async function main() {
    log.info(`Starting automated data intake (v3) in root: ${ROOT_DIR}`);
    let hasErrors = false;

    try {
        ensureDir(GPX_DIR);
        ensureDir(RAW_DIR);
        ensureDir(CSV_DIR);
        ensureDir(PROCESSED_DIR);

        const files = fs.readdirSync(GPX_DIR);

        // 1. Process ZIP files
        const zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip'));
        for (const file of zipFiles) {
            const filePath = path.join(GPX_DIR, file);
            const tempDir = path.join(GPX_DIR, `temp_${Date.now()}`);
            log.info(`Extracting: ${file}`);
            try {
                ensureDir(tempDir);
                const zip = new AdmZip(filePath);

                // Safe extraction
                const zipEntries = zip.getEntries();
                zipEntries.forEach(entry => {
                    if (!entry.isDirectory) {
                        const entryPath = path.normalize(entry.entryName);
                        // Prevent path traversal
                        if (entryPath.includes('..') || path.isAbsolute(entryPath)) {
                            log.warn(`Skipping potentially unsafe zip entry: ${entry.entryName}`);
                            return;
                        }

                        const targetPath = path.join(tempDir, entryPath);
                        if (!isSafePath(tempDir, targetPath)) {
                            log.warn(`Skipping unsafe path: ${entry.entryName}`);
                            return;
                        }

                        zip.extractEntryTo(entry, tempDir, true, true);
                    }
                });

                moveFilesRecursive(tempDir, RAW_DIR);
                fs.rmSync(tempDir, { recursive: true, force: true });

                // Archive safely
                handleCollisionAndMove(filePath, path.join(PROCESSED_DIR, file));
                log.info(`Finished extracting ${file} and archived.`);
            } catch (err) {
                log.error(`Error extracting ${file}:`, err.message);
                hasErrors = true;
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
            }
        }

        // 2. Process Excel files
        const excelFiles = files.filter(f => f.toLowerCase().endsWith('.xlsx'));
        for (const file of excelFiles) {
            const filePath = path.join(GPX_DIR, file);
            log.info(`Processing Excel: ${file}`);
            try {
                const workbook = XLSX.readFile(filePath);
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    const outputFileName = `${path.basename(file, '.xlsx')}_${sheetName}.csv`;
                    const outputPath = path.join(CSV_DIR, outputFileName);

                    // Handle output collision safely using temp file then move
                    const tempCsvPath = path.join(CSV_DIR, `temp_${Date.now()}.csv`);
                    fs.writeFileSync(tempCsvPath, csv, 'utf8');
                    handleCollisionAndMove(tempCsvPath, outputPath);
                    log.info(`Saved sheet ${sheetName} to ${outputFileName}`);
                });

                handleCollisionAndMove(filePath, path.join(PROCESSED_DIR, file));
                log.info(`Finished processing ${file} and archived.`);
            } catch (err) {
                log.error(`Error processing Excel ${file}:`, err.message);
                hasErrors = true;
            }
        }

        // 3. Deduplicate
        deduplicateExistingGpx();

    } catch (err) {
        log.error('Fatal error during data intake:', err.message);
        hasErrors = true;
    }

    log.info('Data intake completed.');
    if (hasErrors) {
        process.exit(1);
    }
}

main();

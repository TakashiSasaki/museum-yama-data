const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const GPX_DIR = path.join(ROOT_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const CSV_DIR = path.join(ROOT_DIR, 'csv');
const PROCESSED_DIR = path.join(ROOT_DIR, 'processed');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function getHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

function moveFilesRecursive(src, dest) {
    const items = fs.readdirSync(src);
    for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        if (fs.statSync(srcPath).isDirectory()) {
            ensureDir(destPath);
            moveFilesRecursive(srcPath, destPath);
        } else {
            fs.renameSync(srcPath, destPath);
        }
    }
}

function deduplicateGpx() {
    console.log('Scanning for duplicate GPX files...');
    const files = fs.readdirSync(RAW_DIR).filter(f => f.toLowerCase().endsWith('.gpx'));
    
    files.forEach(f => {
        const match = f.match(/^(.*)\s\(\d+\)\.gpx$/i);
        if (match) {
            const baseName = `${match[1]}.gpx`;
            const basePath = path.join(RAW_DIR, baseName);
            const dupPath = path.join(RAW_DIR, f);
            
            if (fs.existsSync(basePath)) {
                const baseHash = getHash(basePath);
                const dupHash = getHash(dupPath);
                
                if (baseHash === dupHash) {
                    console.log(`Deleting identical duplicate: ${f}`);
                    fs.unlinkSync(dupPath);
                } else {
                    console.warn(`Duplicate found but content differs: ${f}`);
                }
            }
        }
    });
}

async function main() {
    console.log('Starting automated data intake (v2 with deduplication)...');

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
        console.log(`Extracting: ${file}`);
        try {
            ensureDir(tempDir);
            const zip = new AdmZip(filePath);
            zip.extractAllTo(tempDir, true);
            moveFilesRecursive(tempDir, RAW_DIR);
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.renameSync(filePath, path.join(PROCESSED_DIR, file));
            console.log(`Finished extracting ${file} and archived.`);
        } catch (err) {
            console.error(`Error extracting ${file}:`, err.message);
        }
    }

    // 2. Process Excel files
    const excelFiles = files.filter(f => f.toLowerCase().endsWith('.xlsx'));
    for (const file of excelFiles) {
        const filePath = path.join(GPX_DIR, file);
        console.log(`Processing Excel: ${file}`);
        try {
            const workbook = XLSX.readFile(filePath);
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                const outputFileName = `${path.basename(file, '.xlsx')}_${sheetName}.csv`;
                const outputPath = path.join(CSV_DIR, outputFileName);
                fs.writeFileSync(outputPath, csv, 'utf8');
                console.log(`Saved sheet ${sheetName} to ${outputFileName}`);
            });
            fs.renameSync(filePath, path.join(PROCESSED_DIR, file));
            console.log(`Finished processing ${file} and archived.`);
        } catch (err) {
            console.error(`Error processing Excel ${file}:`, err.message);
        }
    }

    // 3. Deduplicate
    deduplicateGpx();

    console.log('Data intake completed.');
}

main();

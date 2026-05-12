const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const GPX_DIR = path.resolve(__dirname, '../gpx');

async function main() {
    console.log('Starting data intake process...');

    const files = fs.readdirSync(GPX_DIR);

    // 1. Process ZIP files
    const zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip'));
    for (const file of zipFiles) {
        const filePath = path.join(GPX_DIR, file);
        console.log(`Extracting: ${file}`);
        try {
            const zip = new AdmZip(filePath);
            zip.extractAllTo(GPX_DIR, true);
            console.log(`Extracted ${file} to ${GPX_DIR}`);
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
                const outputPath = path.join(GPX_DIR, outputFileName);
                fs.writeFileSync(outputPath, csv, 'utf8');
                console.log(`Saved sheet ${sheetName} to ${outputFileName}`);
            });
        } catch (err) {
            console.error(`Error processing Excel ${file}:`, err.message);
        }
    }

    console.log('Data intake process completed.');
}

main();

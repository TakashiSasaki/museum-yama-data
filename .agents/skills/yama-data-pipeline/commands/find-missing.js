const fs = require('fs');
const path = require('path');
const log = require('../lib/log');

module.exports = async function findMissing(options) {
    if (!options.root) {
        throw new Error('find-missing requires a --root option');
    }

    const ROOT_DIR = path.resolve(options.root);
    const CSV_DIR = path.join(ROOT_DIR, 'csv');
    const YAMAP_DIR = path.join(ROOT_DIR, 'yamap');

    log.info(`Checking for missing YAMAP files in: ${ROOT_DIR}`);

    // Check directory existence gracefully
    if (!fs.existsSync(CSV_DIR)) {
        log.error(`[Required directory missing] CSV directory does not exist: ${CSV_DIR}`);
        return;
    }

    if (!fs.existsSync(YAMAP_DIR)) {
        log.error(`[Required directory missing] YAMAP directory does not exist: ${YAMAP_DIR}`);
        return;
    }

    // Get all YAMAP IDs from CSVs
    const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
    const allIdsFromCsv = new Set();

    for (const file of csvFiles) {
        try {
            const content = fs.readFileSync(path.join(CSV_DIR, file), 'utf8');
            const matches = content.matchAll(/https:\/\/yamap\.com\/activities\/(\d+)/g);
            for (const match of matches) {
                allIdsFromCsv.add(match[1]);
            }
        } catch (err) {
            log.error(`Failed to read CSV file ${file}: ${err.message}`);
        }
    }

    // Get all existing YAMAP MD files
    const yamapFiles = fs.readdirSync(YAMAP_DIR).filter(f => f.toLowerCase().endsWith('.md'));
    const existingIds = new Set(yamapFiles.map(f => f.slice(0, -3))); // Strip .md extension

    // Find missing IDs
    const missingIds = [];
    for (const id of allIdsFromCsv) {
        if (!existingIds.has(id)) {
            missingIds.push(id);
        }
    }

    log.info(`Total unique YAMAP IDs in CSVs: ${allIdsFromCsv.size}`);
    log.info(`Total existing YAMAP MD files: ${existingIds.size}`);
    
    if (missingIds.length > 0) {
        log.warn(`Missing YAMAP MD files (${missingIds.length}):`);
        console.log(missingIds.join('\n'));
    } else {
        log.info('All YAMAP activities in CSVs have corresponding MD files.');
    }
};

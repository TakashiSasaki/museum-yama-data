const fs = require('fs');
const path = require('path');
const { parseGpx, serializeGpx, extractTrkElements } = require('../lib/gpx');
const { ensureDir, atomicWriteSync } = require('../lib/fs_safe');
const log = require('../lib/log');
const { DOMParser } = require('@xmldom/xmldom');

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--root');
const ROOT_DIR = (rootArgIndex !== -1 && args[rootArgIndex + 1])
    ? path.resolve(args[rootArgIndex + 1])
    : path.resolve(__dirname, '../../..');
const GPX_DIR = path.join(ROOT_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const MERGED_DIR = path.join(GPX_DIR, 'merged');

async function mergeGpxByYear() {
    log.info(`Starting GPX merge by year in root: ${ROOT_DIR}`);

    if (!fs.existsSync(RAW_DIR)) {
        log.error(`Raw GPX directory not found: ${RAW_DIR}`);
        process.exit(1);
    }

    ensureDir(MERGED_DIR);

    const files = fs.readdirSync(RAW_DIR).filter(f => f.toLowerCase().endsWith('.gpx'));
    const groups = {};

    files.forEach(file => {
        // Extract year from filename like yamap_2024-06-16...
        const match = file.match(/(\d{4})-\d{2}-\d{2}/);
        if (match) {
            const year = match[1];
            if (!groups[year]) groups[year] = [];
            groups[year].push(file);
        } else {
            log.warn(`Could not extract year from filename: ${file}`);
        }
    });

    let hasErrors = false;

    for (const year in groups) {
        log.info(`Merging ${groups[year].length} tracks for year ${year}...`);
        
        try {
            const doc = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Yama Museum Merge Skill" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Merged Tracks ${year}</name>
  </metadata>
</gpx>`, 'text/xml');
            const rootGpx = doc.documentElement;

            groups[year].forEach(file => {
                try {
                    const content = fs.readFileSync(path.join(RAW_DIR, file), 'utf8');
                    const parsed = parseGpx(content);
                    const trks = extractTrkElements(parsed);

                    if (trks.length === 0) {
                        log.warn(`No <trk> elements found in: ${file}`);
                    }

                    trks.forEach(trk => {
                        // Import the node into our new document
                        const importedTrk = doc.importNode(trk, true);
                        rootGpx.appendChild(importedTrk);
                        rootGpx.appendChild(doc.createTextNode('\n'));
                    });
                } catch (err) {
                    log.error(`Failed to process ${file}:`, err.message);
                    hasErrors = true;
                }
            });

            const mergedContent = serializeGpx(doc);
            const outputPath = path.join(MERGED_DIR, `${year}_merged.gpx`);
            atomicWriteSync(outputPath, mergedContent);
            log.info(`Saved merged file: ${outputPath}`);
        } catch (err) {
            log.error(`Failed to create merged file for year ${year}:`, err.message);
            hasErrors = true;
        }
    }

    log.info('GPX merge completed.');
    if (hasErrors) {
        process.exit(1);
    }
}

mergeGpxByYear();

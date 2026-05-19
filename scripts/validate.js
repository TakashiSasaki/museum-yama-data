const fs = require('fs');
const path = require('path');
const { parseGpx, extractTrackPoints } = require('../.agents/skills/lib/gpx');
const log = require('../.agents/skills/lib/log');

const ROOT_DIR = process.cwd();
const GPX_DIR = path.join(ROOT_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const MERGED_DIR = path.join(GPX_DIR, 'merged');
const ANNOTATED_DIR = path.join(GPX_DIR, 'annotated');

let hasErrors = false;

function validateDirExists(dir) {
    if (!fs.existsSync(dir)) {
        log.error(`Required directory missing: ${dir}`);
        hasErrors = true;
        return false;
    }
    return true;
}

function validateGpxFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // 1. Validate Well-formed XML
        let doc;
        try {
            doc = parseGpx(content);
        } catch (e) {
            log.error(`[Malformed XML] ${filePath}: ${e.message}`);
            hasErrors = true;
            return;
        }

        // 2. Validate valid lat/lon values
        const points = extractTrackPoints(doc);
        let validPoints = 0;

        for (const pt of points) {
            if (isNaN(pt.lat) || isNaN(pt.lon) || pt.lat < -90 || pt.lat > 90 || pt.lon < -180 || pt.lon > 180) {
                log.error(`[Invalid Coordinates] ${filePath}: lat=${pt.lat}, lon=${pt.lon}`);
                hasErrors = true;
                return;
            }
            validPoints++;
        }

        if (validPoints === 0 && doc.getElementsByTagName('wpt').length === 0) {
            log.warn(`[No valid track points or waypoints found] ${filePath}`);
            // Not marking as error, just warning
        }

    } catch (e) {
        log.error(`[Read Error] ${filePath}: ${e.message}`);
        hasErrors = true;
    }
}

function validateFilesInDirectory(dir) {
    if (!validateDirExists(dir)) return;

    log.info(`Validating GPX files in ${dir}...`);
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.gpx'));

    for (const file of files) {
        validateGpxFile(path.join(dir, file));
    }
}

function main() {
    log.info('Starting validation process...');

    validateFilesInDirectory(RAW_DIR);
    validateFilesInDirectory(MERGED_DIR);
    validateFilesInDirectory(ANNOTATED_DIR);

    if (hasErrors) {
        log.error('Validation failed. See errors above.');
        process.exit(1);
    } else {
        log.info('Validation passed successfully.');
    }
}

main();

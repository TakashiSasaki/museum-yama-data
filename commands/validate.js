const fs = require('fs');
const path = require('path');
const { parseGpx, extractTrackPoints } = require('../lib/gpx');
const log = require('../lib/log');

function validateDirExists(dir, context) {
    if (!fs.existsSync(dir)) {
        log.error(`Required directory missing: ${dir}`);
        context.hasErrors = true;
        return false;
    }
    return true;
}

function validateGpxFile(filePath, context) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // 1. Validate Well-formed XML
        let doc;
        try {
            doc = parseGpx(content);
        } catch (e) {
            log.error(`[Malformed XML] ${filePath}: ${e.message}`);
            context.hasErrors = true;
            return;
        }

        // 2. Validate valid lat/lon values
        const points = extractTrackPoints(doc);
        let validPoints = 0;

        for (const pt of points) {
            if (isNaN(pt.lat) || isNaN(pt.lon) || pt.lat < -90 || pt.lat > 90 || pt.lon < -180 || pt.lon > 180) {
                log.error(`[Invalid Coordinates] ${filePath}: lat=${pt.lat}, lon=${pt.lon}`);
                context.hasErrors = true;
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
        context.hasErrors = true;
    }
}

function validateFilesInDirectory(dir, context) {
    if (!validateDirExists(dir, context)) return;

    log.info(`Validating GPX files in ${dir}...`);
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.gpx'));

    for (const file of files) {
        validateGpxFile(path.join(dir, file), context);
    }
}

module.exports = async function validate(options) {
    const ROOT_DIR = path.resolve(options.root || process.cwd());
    const GPX_DIR = path.join(ROOT_DIR, 'gpx');
    const RAW_DIR = path.join(GPX_DIR, 'raw');
    const MERGED_DIR = path.join(GPX_DIR, 'merged');
    const ANNOTATED_DIR = path.join(GPX_DIR, 'annotated');

    log.info('Starting validation process...');

    const context = { hasErrors: false };

    validateFilesInDirectory(RAW_DIR, context);
    validateFilesInDirectory(MERGED_DIR, context);
    validateFilesInDirectory(ANNOTATED_DIR, context);

    if (context.hasErrors) {
        log.error('Validation failed. See errors above.');
        throw new Error('Validation failed.');
    } else {
        log.info('Validation passed successfully.');
    }
};

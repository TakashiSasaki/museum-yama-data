const fs = require('fs');
const path = require('path');
const { parseGpx, extractTrackPoints } = require('../lib/gpx');
const { parseCSV } = require('../lib/csv');
const log = require('../lib/log');

function validateDirExists(dir, context) {
    if (!fs.existsSync(dir)) {
        log.error(`[Required directory missing] ${dir}`);
        context.hasErrors = true;
        return false;
    }
    return true;
}

function validateGpxFile(filePath, context, dirType) {
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

        const rootNode = doc.documentElement;
        if (!rootNode || rootNode.tagName !== 'gpx') {
            log.error(`[Invalid Root Element] ${filePath}: Expected <gpx>, found <${rootNode ? rootNode.tagName : 'none'}>`);
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
            if (!pt.hasEle) {
                log.error(`[Missing Elevation] ${filePath}: <ele> is strictly required`);
                context.hasErrors = true;
                return;
            }
            if (pt.hasEle && Number.isNaN(pt.ele)) {
                log.error(`[Invalid Elevation] ${filePath}: ele=${pt.ele} is NaN`);
                context.hasErrors = true;
                return;
            }
            if (pt.time) {
                const date = new Date(pt.time);
                if (isNaN(date.getTime())) {
                    log.error(`[Invalid Time] ${filePath}: time=${pt.time}`);
                    context.hasErrors = true;
                    return;
                }
            }
            validPoints++;
        }

        const wpts = doc.getElementsByTagName('wpt');
        const rtepts = doc.getElementsByTagName('rtept');
        const trks = doc.getElementsByTagName('trk');

        if (validPoints === 0 && wpts.length === 0 && rtepts.length === 0) {
            log.error(`[No geospatial elements] ${filePath}: Missing <trkpt>, <wpt>, or <rtept>`);
            context.hasErrors = true;
        }

        if (dirType === 'merged' && trks.length === 0) {
            log.error(`[Missing <trk> in merged] ${filePath}: Expected at least one <trk> element`);
            context.hasErrors = true;
        }

        if (dirType === 'annotated') {
            for (let i = 0; i < wpts.length; i++) {
                const wLat = parseFloat(wpts[i].getAttribute('lat'));
                const wLon = parseFloat(wpts[i].getAttribute('lon'));
                if (isNaN(wLat) || isNaN(wLon) || wLat < -90 || wLat > 90 || wLon < -180 || wLon > 180) {
                    log.error(`[Invalid Waypoint Coordinates] ${filePath}: lat=${wLat}, lon=${wLon}`);
                    context.hasErrors = true;
                }
            }
        }

    } catch (e) {
        log.error(`[Read Error] ${filePath}: ${e.message}`);
        context.hasErrors = true;
    }
}

function validateGpxFilesInDirectory(dir, context, dirType) {
    if (!validateDirExists(dir, context)) return;

    log.info(`Validating GPX files in ${dir}...`);
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.gpx'));

    for (const file of files) {
        validateGpxFile(path.join(dir, file), context, dirType);
    }
}

function validateCsvFile(filePath, context) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const rows = parseCSV(content);

        if (rows.length === 0) {
            log.error(`[Empty CSV] ${filePath}`);
            context.hasErrors = true;
            return;
        }

        const headerRow = rows[0];
        const expectedLength = headerRow.length;

        const nameIdx = headerRow.findIndex(h => h.includes('山名'));
        const elevIdx = headerRow.findIndex(h => h.includes('標高'));

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length !== expectedLength) {
                log.error(`[Row Length Mismatch] ${filePath}: Row ${i + 1} has ${row.length} fields, expected ${expectedLength}`);
                context.hasErrors = true;
            }

            if (nameIdx !== -1 && elevIdx !== -1) {
                const elevStr = row[elevIdx];
                if (elevStr) {
                    const cleaned = elevStr.replace(/,/g, '').replace(/\s*m\s*/gi, '').trim();
                    const elevNum = parseFloat(cleaned);
                    if (isNaN(elevNum)) {
                        log.error(`[Invalid Elevation in CSV] ${filePath}: Row ${i + 1} has non-numeric elevation '${elevStr}'`);
                        context.hasErrors = true;
                    }
                }
            }
        }
    } catch (e) {
        log.error(`[CSV Read Error] ${filePath}: ${e.message}`);
        context.hasErrors = true;
    }
}

function validateCsvFilesInDirectory(dir, context) {
    if (!validateDirExists(dir, context)) return;

    log.info(`Validating CSV files in ${dir}...`);
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.csv'));

    for (const file of files) {
        validateCsvFile(path.join(dir, file), context);
    }
}

module.exports = async function validate(options) {
    if (!options.root) {
        throw new Error('validate requires a --root option');
    }
    const ROOT_DIR = path.resolve(options.root);
    const GPX_DIR = path.join(ROOT_DIR, 'gpx');
    const RAW_DIR = path.join(GPX_DIR, 'raw');
    const MERGED_DIR = path.join(GPX_DIR, 'merged-by-year');
    const ANNOTATED_DIR = path.join(GPX_DIR, 'annotated');
    const CSV_DIR = path.join(ROOT_DIR, 'csv');

    log.info(`Starting validation process...`);

    const context = { hasErrors: false };

    validateGpxFilesInDirectory(RAW_DIR, context, 'raw');
    validateGpxFilesInDirectory(MERGED_DIR, context, 'merged');
    validateGpxFilesInDirectory(ANNOTATED_DIR, context, 'annotated');
    validateCsvFilesInDirectory(CSV_DIR, context);

    if (context.hasErrors) {
        log.error('Validation failed. See errors above.');
        throw new Error('Validation failed.');
    } else {
        log.info('Validation passed successfully.');
    }
};

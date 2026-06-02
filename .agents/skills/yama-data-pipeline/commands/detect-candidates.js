const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/log');
const { parseGpx, extractTrackPoints } = require('../lib/gpx');
const { detectSummitCandidates, normalizeDetectionConfig } = require('../lib/summit_detection');

function generateCandidateId(sourcePathKey, trackpointIndex, detectionParams) {
    const hash = crypto.createHash('sha1');
    hash.update(`${sourcePathKey}:${trackpointIndex}:${detectionParams}`);
    return `summit-candidate:${hash.digest('hex').substring(0, 16)}`;
}

module.exports = async function detectCandidates(options) {
    log.info('=== Summit Candidate Detection ===');

    const inputPath = path.resolve(options.input);
    const outPath = path.resolve(options.out);

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input path not found: ${inputPath}`);
    }

    const stat = fs.statSync(inputPath);
    let gpxFiles = [];

    if (stat.isDirectory()) {
        const files = fs.readdirSync(inputPath);
        gpxFiles = files
            .filter(f => f.toLowerCase().endsWith('.gpx'))
            .sort() // Sort deterministically
            .map(f => ({
                fullPath: path.join(inputPath, f),
                sourceKey: f // Base name if it's a directory
            }));
    } else if (stat.isFile() && inputPath.toLowerCase().endsWith('.gpx')) {
        gpxFiles = [{
            fullPath: inputPath,
            sourceKey: path.basename(inputPath)
        }];
    } else {
        throw new Error(`Input path is neither a GPX directory nor a GPX file: ${inputPath}`);
    }

    if (gpxFiles.length === 0) {
        log.warn('No GPX files found to process.');
        return;
    }

    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const config = normalizeDetectionConfig(options);

    log.info(`Processing ${gpxFiles.length} GPX file(s) with parameters: window=${config.smoothWindow}, radius=${config.peakRadius}, min_prominence=${config.minProminence}, merge=${config.mergeDistance}`);

    let totalCandidates = 0;

    const csvHeader = [
        'summit_candidate_id',
        'source_gpx_path',
        'source_track_id',
        'source_trackpoint_index',
        'valid_elevation_index',
        'lat',
        'lon',
        'ele',
        'time',
        'smoothed_ele',
        'prominence',
        'detection_method',
        'detection_parameters',
        'candidate_status',
        'needs_review',
        'notes'
    ].join(',');

    // We'll write manually since lib/csv.js might only have parse
    const rows = [csvHeader];

    for (const fileObj of gpxFiles) {
        try {
            const content = fs.readFileSync(fileObj.fullPath, 'utf8');
            let doc;
            try {
                doc = parseGpx(content);
            } catch (err) {
                log.warn(`Skipping ${fileObj.sourceKey} due to XML parse error: ${err.message}`);
                continue;
            }

            const points = extractTrackPoints(doc);
            if (points.length < 3) {
                log.info(`[SKIP] ${fileObj.sourceKey}: Too few track points (${points.length})`);
                continue;
            }

            const candidates = detectSummitCandidates(points, config);

            for (const c of candidates) {
                const id = generateCandidateId(fileObj.sourceKey, c.source_trackpoint_index, c.detection_parameters);

                // Track ID could be extracted from trk name, but keeping it empty or simple since not passed through extractTrackPoints in current baseline
                const source_track_id = '';

                rows.push([
                    id,
                    fileObj.sourceKey,
                    source_track_id,
                    c.source_trackpoint_index,
                    c.valid_elevation_index,
                    c.lat,
                    c.lon,
                    c.ele,
                    c.time || '',
                    c.smoothed_ele,
                    c.prominence,
                    c.detection_method,
                    c.detection_parameters,
                    'unresolved',
                    'false',
                    ''
                ].join(','));
                totalCandidates++;
            }
        } catch (err) {
            log.error(`Failed to process ${fileObj.sourceKey}: ${err.message}`);
        }
    }

    fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8');
    log.info(`Finished processing. Total candidates detected: ${totalCandidates}`);
    log.info(`Results written to: ${outPath}`);
};

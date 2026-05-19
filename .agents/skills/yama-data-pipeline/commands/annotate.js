/**
 * Peak Detection & GPX Annotation Skill
 * 
 * Analyzes GPX track elevation profiles to detect summit points,
 * matches them against known mountain names from CSV records,
 * and generates annotated GPX files with <wpt> waypoint markers.
 * 
 * Usage: node annotate_peaks.js [--root <path>]
 */

const fs = require('fs');
const path = require('path');
const { parseGpx, serializeGpx, extractTrackPoints, extractTrackName, appendWaypoint } = require('../lib/gpx');
const { ensureDir, atomicWriteSync } = require('../lib/fs_safe');
const log = require('../lib/log');



const CONFIG = {
    SMOOTH_WINDOW: 5,
    PEAK_RADIUS: 10,
    MIN_PROMINENCE: 30,
    MERGE_DISTANCE: 100,
    ELEV_TOLERANCE: 50,
};

// === Utility Functions ===

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function smooth(data, window) {
    const half = Math.floor(window / 2);
    return data.map((_, i) => {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - half); j <= Math.min(data.length - 1, i + half); j++) {
            sum += data[j];
            count++;
        }
        return sum / count;
    });
}

function parseElevation(s) {
    if (!s) return NaN;
    const cleaned = s.replace(/,/g, '').replace(/\s*m\s*/gi, '').trim();
    return parseFloat(cleaned);
}

function loadMountainDatabase(CSV_DIR) {
    const db = new Map();
    if (!fs.existsSync(CSV_DIR)) {
        log.warn(`CSV directory not found: ${CSV_DIR}`);
        return db;
    }
    const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
    const { parseCSV } = require('../lib/csv');

    for (const csvFile of csvFiles) {
        const content = fs.readFileSync(path.join(CSV_DIR, csvFile), 'utf8');
        let rows;
        try {
            rows = parseCSV(content);
        } catch (e) {
            log.warn(`Skipping CSV file due to parse error (${csvFile}): ${e.message}`);
            continue;
        }
        if (rows.length < 2) continue;

        const header = rows[0];
        const nameIdx = header.findIndex(h => h.includes('山名'));
        const elevIdx = header.findIndex(h => h.includes('標高'));

        if (nameIdx === -1 || elevIdx === -1) continue;

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            const name = cols[nameIdx];
            const elev = parseElevation(cols[elevIdx]);
            if (name && !isNaN(elev)) {
                const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').trim();
                db.set(cleanName, { name: cleanName, elevation: elev });
            }
        }
    }

    return db;
}

// === Peak Detection ===

function detectPeaks(points) {
    // Only use points that have a valid elevation value
    const validPoints = points.filter(p => !isNaN(p.ele));

    if (validPoints.length < 3) return [];

    const elevations = validPoints.map(p => p.ele);

    const smoothed = smooth(elevations, CONFIG.SMOOTH_WINDOW);
    const candidates = [];
    const radius = Math.min(CONFIG.PEAK_RADIUS, Math.floor(validPoints.length / 3));

    for (let i = radius; i < validPoints.length - radius; i++) {
        let isMax = true;
        for (let j = 1; j <= radius; j++) {
            if (smoothed[i] <= smoothed[i - j] || smoothed[i] <= smoothed[i + j]) {
                isMax = false;
                break;
            }
        }
        if (isMax) {
            candidates.push({ index: i, smoothedEle: smoothed[i], ...validPoints[i] });
        }
    }

    let maxIdx = 0;
    for (let i = 1; i < smoothed.length; i++) {
        if (smoothed[i] > smoothed[maxIdx]) maxIdx = i;
    }
    const maxAlreadyIncluded = candidates.some(c => Math.abs(c.index - maxIdx) < radius);
    if (!maxAlreadyIncluded) {
        candidates.push({ index: maxIdx, smoothedEle: smoothed[maxIdx], ...validPoints[maxIdx] });
    }

    const peaks = [];
    for (const candidate of candidates) {
        const prominence = calculateProminence(smoothed, candidate.index);
        if (prominence >= CONFIG.MIN_PROMINENCE) {
            peaks.push({ ...candidate, prominence });
        }
    }

    return mergeNearbyPeaks(peaks);
}

function calculateProminence(elevations, peakIdx) {
    const peakElev = elevations[peakIdx];
    let leftMin = peakElev;
    let rightMin = peakElev;

    for (let i = peakIdx - 1; i >= 0; i--) {
        if (elevations[i] > peakElev) break;
        leftMin = Math.min(leftMin, elevations[i]);
    }

    for (let i = peakIdx + 1; i < elevations.length; i++) {
        if (elevations[i] > peakElev) break;
        rightMin = Math.min(rightMin, elevations[i]);
    }

    const keyCol = Math.max(leftMin, rightMin);
    return peakElev - keyCol;
}

function mergeNearbyPeaks(peaks) {
    if (peaks.length <= 1) return peaks;

    const sorted = [...peaks].sort((a, b) => b.ele - a.ele);
    const merged = [];
    const used = new Set();

    for (const peak of sorted) {
        if (used.has(peak.index)) continue;

        for (const other of sorted) {
            if (other.index === peak.index) continue;
            if (used.has(other.index)) continue;
            const dist = haversineDistance(peak.lat, peak.lon, other.lat, other.lon);
            if (dist < CONFIG.MERGE_DISTANCE) {
                used.add(other.index);
            }
        }

        merged.push(peak);
    }

    return merged.sort((a, b) => a.index - b.index);
}

function assignPeakNames(peaks, trackName, mountainDb) {
    if (!trackName || peaks.length === 0) {
        return peaks.map(p => ({ ...p, name: `Peak (${Math.round(p.ele)}m)` }));
    }

    const trackMountains = trackName.split(/[・\/〜～→]/).map(s => s.trim()).filter(s => s);
    const knownPeaks = [];

    for (const mName of trackMountains) {
        if (mountainDb.has(mName)) {
            knownPeaks.push(mountainDb.get(mName));
            continue;
        }
        for (const [dbName, dbEntry] of mountainDb.entries()) {
            if (mName.includes(dbName) || dbName.includes(mName)) {
                knownPeaks.push(dbEntry);
                break;
            }
        }
    }

    const usedKnown = new Set();
    const namedPeaks = peaks.map(peak => {
        let bestMatch = null;
        let bestDiff = Infinity;

        for (let i = 0; i < knownPeaks.length; i++) {
            if (usedKnown.has(i)) continue;
            const diff = Math.abs(peak.ele - knownPeaks[i].elevation);
            if (diff < bestDiff && diff <= CONFIG.ELEV_TOLERANCE) {
                bestDiff = diff;
                bestMatch = i;
            }
        }

        if (bestMatch !== null) {
            usedKnown.add(bestMatch);
            return { ...peak, name: knownPeaks[bestMatch].name };
        } else {
            return { ...peak, name: `Peak (${Math.round(peak.ele)}m)` };
        }
    });

    return namedPeaks;
}

// === Main ===

module.exports = async function annotate(options) {
    const ROOT_DIR = path.resolve(options.root || process.cwd());
    const GPX_DIR = path.join(ROOT_DIR, 'gpx');
    const RAW_DIR = path.join(GPX_DIR, 'raw');
    const CSV_DIR = path.join(ROOT_DIR, 'csv');
    const OUTPUT_DIR = path.join(GPX_DIR, 'annotated');

    log.info('=== Yama Museum Peak Detection ===');
    log.info(`Root Directory: ${ROOT_DIR}`);

    if (!fs.existsSync(RAW_DIR)) {
        log.error(`Raw GPX directory not found: ${RAW_DIR}`);
        throw new Error('Raw GPX directory not found');
    }

    ensureDir(OUTPUT_DIR);

    log.info('Loading mountain database from CSV...');
    const mountainDb = loadMountainDatabase(CSV_DIR);
    log.info(`Loaded ${mountainDb.size} mountains from CSV.`);

    const gpxFiles = fs.readdirSync(RAW_DIR).filter(f =>
        f.toLowerCase().endsWith('.gpx') && !f.includes('merged')
    );
    log.info(`Found ${gpxFiles.length} GPX files to process.`);

    let totalPeaks = 0;
    let totalNamed = 0;
    let processed = 0;
    let skipped = 0;
    let hasErrors = false;

    for (const file of gpxFiles) {
        const filePath = path.join(RAW_DIR, file);

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const doc = parseGpx(content);
            const points = extractTrackPoints(doc);
            const trackName = extractTrackName(doc);

            if (points.length < 3) {
                log.info(`[SKIP] ${file}: Too few track points (${points.length})`);
                skipped++;
                continue;
            }

            const peaks = detectPeaks(points);
            const namedPeaks = assignPeakNames(peaks, trackName, mountainDb);

            // Add waypoints to the parsed document
            namedPeaks.forEach(peak => {
                appendWaypoint(doc, {
                    lat: peak.lat,
                    lon: peak.lon,
                    ele: Math.round(peak.ele),
                    name: peak.name,
                    desc: `Peak detected at ${Math.round(peak.ele)}m (prominence: ${Math.round(peak.prominence)}m)`,
                    sym: 'Summit'
                });
            });

            // Update creator attribute
            if (doc.documentElement) {
                doc.documentElement.setAttribute('creator', 'Yama Museum Peak Annotator');
            }

            const annotatedContent = serializeGpx(doc);
            atomicWriteSync(path.join(OUTPUT_DIR, file), annotatedContent);

            const named = namedPeaks.filter(p => !p.name.startsWith('Peak (')).length;
            totalPeaks += namedPeaks.length;
            totalNamed += named;
            processed++;

            if (namedPeaks.length > 0) {
                const peakList = namedPeaks.map(p => `${p.name} (${Math.round(p.ele)}m)`).join(', ');
                log.info(`[OK] ${file}: ${namedPeaks.length} peak(s) -> ${peakList}`);
            } else {
                log.info(`[OK] ${file}: No significant peaks detected`);
            }
        } catch (err) {
            log.error(`Failed to process ${file}:`, err.message);
            hasErrors = true;
        }
    }

    log.info('=== Summary ===');
    log.info(`Processed: ${processed} files`);
    log.info(`Skipped: ${skipped} files`);
    log.info(`Total peaks detected: ${totalPeaks}`);
    log.info(`Named peaks: ${totalNamed}`);
    log.info(`Unnamed peaks: ${totalPeaks - totalNamed}`);

    if (hasErrors) {
        throw new Error('Annotate completed with errors.');
    }
};

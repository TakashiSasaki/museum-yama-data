/**
 * Peak Detection & GPX Annotation Skill
 * 
 * Analyzes GPX track elevation profiles to detect summit points,
 * matches them against known mountain names from CSV records,
 * and generates annotated GPX files with <wpt> waypoint markers.
 * 
 * Usage: node annotate_peaks.js
 * 
 * Input:  gpx/raw/*.gpx (original tracks), csv/*.csv (mountain records)
 * Output: gpx/annotated/*.gpx (tracks with peak waypoints)
 */

const fs = require('fs');
const path = require('path');

// === Configuration ===
const ROOT_DIR = path.resolve(__dirname, '../../../');
const GPX_DIR = path.join(ROOT_DIR, 'gpx');
const RAW_DIR = path.join(GPX_DIR, 'raw');
const CSV_DIR = path.join(ROOT_DIR, 'csv');
const OUTPUT_DIR = path.join(GPX_DIR, 'annotated');

const CONFIG = {
    SMOOTH_WINDOW: 5,       // Moving average window for elevation smoothing
    PEAK_RADIUS: 10,        // Number of neighboring points to check for local max
    MIN_PROMINENCE: 30,     // Minimum prominence in meters
    MERGE_DISTANCE: 100,    // Merge peaks closer than this (meters)
    ELEV_TOLERANCE: 50,     // Max elevation diff for CSV name matching (meters)
};

// === Utility Functions ===

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Calculate distance between two lat/lon points in meters (Haversine formula)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Apply moving average smoothing to an array of numbers
 */
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

// === CSV Parsing ===

/**
 * Parse CSV with proper handling of quoted fields containing commas
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

/**
 * Parse elevation string from CSV (handles "1,151" format)
 */
function parseElevation(s) {
    if (!s) return NaN;
    const cleaned = s.replace(/,/g, '').replace(/\s*m\s*/gi, '').trim();
    return parseFloat(cleaned);
}

/**
 * Load mountain database from CSV files
 * Returns: Map<mountainName, {name, elevation}>
 */
function loadMountainDatabase() {
    const db = new Map();
    const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.toLowerCase().endsWith('.csv'));

    for (const csvFile of csvFiles) {
        const content = fs.readFileSync(path.join(CSV_DIR, csvFile), 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) continue;

        const header = parseCSVLine(lines[0]);
        const nameIdx = header.findIndex(h => h.includes('山名'));
        const elevIdx = header.findIndex(h => h.includes('標高'));

        if (nameIdx === -1 || elevIdx === -1) continue;

        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            const name = cols[nameIdx];
            const elev = parseElevation(cols[elevIdx]);
            if (name && !isNaN(elev)) {
                // Remove parenthetical suffixes like (島根) for matching
                const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').trim();
                db.set(cleanName, { name: cleanName, elevation: elev });
            }
        }
    }

    return db;
}

// === GPX Parsing ===

/**
 * Parse track points from GPX content
 */
function parseTrackPoints(gpxContent) {
    const points = [];
    const regex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>[\s\S]*?<ele>([\d.]+)<\/ele>[\s\S]*?(?:<time>([^<]+)<\/time>)?[\s\S]*?<\/trkpt>/g;
    let match;
    while ((match = regex.exec(gpxContent)) !== null) {
        points.push({
            lat: parseFloat(match[1]),
            lon: parseFloat(match[2]),
            ele: parseFloat(match[3]),
            time: match[4] || ''
        });
    }
    return points;
}

/**
 * Extract track name from GPX content
 */
function extractTrackName(gpxContent) {
    const match = gpxContent.match(/<trk>[\s\S]*?<name>([^<]+)<\/name>/);
    return match ? match[1] : '';
}

// === Peak Detection ===

/**
 * Detect peaks in a track point array using local maxima + prominence
 */
function detectPeaks(points) {
    if (points.length < 3) return [];

    const elevations = points.map(p => p.ele);
    const smoothed = smooth(elevations, CONFIG.SMOOTH_WINDOW);

    // Step 1: Find local maxima
    const candidates = [];
    const radius = Math.min(CONFIG.PEAK_RADIUS, Math.floor(points.length / 3));

    for (let i = radius; i < points.length - radius; i++) {
        let isMax = true;
        for (let j = 1; j <= radius; j++) {
            if (smoothed[i] <= smoothed[i - j] || smoothed[i] <= smoothed[i + j]) {
                isMax = false;
                break;
            }
        }
        if (isMax) {
            candidates.push({ index: i, smoothedEle: smoothed[i], ...points[i] });
        }
    }

    // Also consider the absolute maximum point as a candidate
    let maxIdx = 0;
    for (let i = 1; i < smoothed.length; i++) {
        if (smoothed[i] > smoothed[maxIdx]) maxIdx = i;
    }
    const maxAlreadyIncluded = candidates.some(c => Math.abs(c.index - maxIdx) < radius);
    if (!maxAlreadyIncluded) {
        candidates.push({ index: maxIdx, smoothedEle: smoothed[maxIdx], ...points[maxIdx] });
    }

    // Step 2: Calculate prominence and filter
    const peaks = [];
    for (const candidate of candidates) {
        const prominence = calculateProminence(smoothed, candidate.index);
        if (prominence >= CONFIG.MIN_PROMINENCE) {
            peaks.push({ ...candidate, prominence });
        }
    }

    // Step 3: Merge nearby peaks
    return mergeNearbyPeaks(peaks);
}

/**
 * Calculate the topographic prominence of a peak
 */
function calculateProminence(elevations, peakIdx) {
    const peakElev = elevations[peakIdx];

    // Find the lowest point between this peak and any higher peak on each side
    let leftMin = peakElev;
    let rightMin = peakElev;

    // Scan left
    for (let i = peakIdx - 1; i >= 0; i--) {
        if (elevations[i] > peakElev) {
            break; // Found a higher peak
        }
        leftMin = Math.min(leftMin, elevations[i]);
    }

    // Scan right
    for (let i = peakIdx + 1; i < elevations.length; i++) {
        if (elevations[i] > peakElev) {
            break; // Found a higher peak
        }
        rightMin = Math.min(rightMin, elevations[i]);
    }

    // Prominence is the drop from the peak to the higher of the two minimums
    const keyCol = Math.max(leftMin, rightMin);
    return peakElev - keyCol;
}

/**
 * Merge peaks that are too close together, keeping the higher one
 */
function mergeNearbyPeaks(peaks) {
    if (peaks.length <= 1) return peaks;

    // Sort by elevation descending
    const sorted = [...peaks].sort((a, b) => b.ele - a.ele);
    const merged = [];
    const used = new Set();

    for (const peak of sorted) {
        if (used.has(peak.index)) continue;

        // Mark all lower nearby peaks as used
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

    // Sort by track order (index)
    return merged.sort((a, b) => a.index - b.index);
}

// === Name Matching ===

/**
 * Match detected peaks to known mountain names
 * Uses the track name and CSV elevation data
 */
function assignPeakNames(peaks, trackName, mountainDb) {
    if (!trackName || peaks.length === 0) {
        return peaks.map(p => ({ ...p, name: `Peak (${Math.round(p.ele)}m)` }));
    }

    // Extract individual mountain names from track name (split by ・ or /)
    const trackMountains = trackName.split(/[・\/〜～→]/).map(s => s.trim()).filter(s => s);

    // Find matching entries in the database
    const knownPeaks = [];
    for (const mName of trackMountains) {
        // Try exact match first
        if (mountainDb.has(mName)) {
            knownPeaks.push(mountainDb.get(mName));
            continue;
        }
        // Try partial match
        for (const [dbName, dbEntry] of mountainDb.entries()) {
            if (mName.includes(dbName) || dbName.includes(mName)) {
                knownPeaks.push(dbEntry);
                break;
            }
        }
    }

    // Assign names to detected peaks by closest elevation match
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

// === GPX Generation ===

/**
 * Generate annotated GPX content with waypoints for detected peaks
 */
function generateAnnotatedGpx(originalContent, namedPeaks) {
    // Build waypoint XML
    let waypointsXml = '';
    for (const peak of namedPeaks) {
        waypointsXml += `  <wpt lat="${peak.lat}" lon="${peak.lon}">
    <ele>${peak.ele}</ele>
    <name>${escapeXml(peak.name)}</name>
    <desc>Peak detected at ${Math.round(peak.ele)}m (prominence: ${Math.round(peak.prominence)}m)</desc>
    <sym>Summit</sym>
  </wpt>\n`;
    }

    // Insert waypoints before the first <trk> element
    let annotated = originalContent;

    // Find insertion point (before <trk>)
    const trkIndex = annotated.indexOf('<trk>');
    if (trkIndex !== -1) {
        annotated = annotated.slice(0, trkIndex) + waypointsXml + annotated.slice(trkIndex);
    }

    // Update creator attribute
    annotated = annotated.replace(/creator="[^"]*"/, 'creator="Yama Museum Peak Annotator"');

    return annotated;
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// === Main ===

function main() {
    console.log('=== Yama Museum Peak Detection ===');
    console.log(`Config: ${JSON.stringify(CONFIG)}`);

    ensureDir(OUTPUT_DIR);

    // Load mountain database
    console.log('\nLoading mountain database from CSV...');
    const mountainDb = loadMountainDatabase();
    console.log(`Loaded ${mountainDb.size} mountains from CSV.`);

    // Process GPX files
    const gpxFiles = fs.readdirSync(RAW_DIR).filter(f =>
        f.toLowerCase().endsWith('.gpx') && !f.includes('merged')
    );
    console.log(`Found ${gpxFiles.length} GPX files to process.\n`);

    let totalPeaks = 0;
    let totalNamed = 0;
    let processed = 0;
    let skipped = 0;

    for (const file of gpxFiles) {
        const filePath = path.join(RAW_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Parse
        const points = parseTrackPoints(content);
        const trackName = extractTrackName(content);

        if (points.length < 3) {
            console.log(`[SKIP] ${file}: Too few track points (${points.length})`);
            skipped++;
            continue;
        }

        // Detect peaks
        const peaks = detectPeaks(points);

        // Assign names
        const namedPeaks = assignPeakNames(peaks, trackName, mountainDb);

        // Generate annotated GPX
        const annotated = generateAnnotatedGpx(content, namedPeaks);
        fs.writeFileSync(path.join(OUTPUT_DIR, file), annotated, 'utf8');

        const named = namedPeaks.filter(p => !p.name.startsWith('Peak (')).length;
        totalPeaks += namedPeaks.length;
        totalNamed += named;
        processed++;

        if (namedPeaks.length > 0) {
            const peakList = namedPeaks.map(p => `${p.name} (${Math.round(p.ele)}m)`).join(', ');
            console.log(`[OK] ${file}: ${namedPeaks.length} peak(s) → ${peakList}`);
        } else {
            console.log(`[OK] ${file}: No significant peaks detected`);
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Processed: ${processed} files`);
    console.log(`Skipped: ${skipped} files`);
    console.log(`Total peaks detected: ${totalPeaks}`);
    console.log(`Named peaks (matched to CSV): ${totalNamed}`);
    console.log(`Unnamed peaks: ${totalPeaks - totalNamed}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();

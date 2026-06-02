const crypto = require('crypto');

const DEFAULT_SUMMIT_DETECTION_CONFIG = {
    smoothWindow: 5,
    peakRadius: 10,
    minProminence: 30,
    mergeDistance: 100
};

function normalizeDetectionConfig(config) {
    return {
        smoothWindow: config.smoothWindow !== undefined ? Number(config.smoothWindow) : DEFAULT_SUMMIT_DETECTION_CONFIG.smoothWindow,
        peakRadius: config.peakRadius !== undefined ? Number(config.peakRadius) : DEFAULT_SUMMIT_DETECTION_CONFIG.peakRadius,
        minProminence: config.minProminence !== undefined ? Number(config.minProminence) : DEFAULT_SUMMIT_DETECTION_CONFIG.minProminence,
        mergeDistance: config.mergeDistance !== undefined ? Number(config.mergeDistance) : DEFAULT_SUMMIT_DETECTION_CONFIG.mergeDistance,
    };
}

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

function mergeNearbyPeaks(peaks, mergeDistance) {
    if (peaks.length <= 1) return peaks;

    const sorted = [...peaks].sort((a, b) => b.ele - a.ele);
    const merged = [];
    const used = new Set();

    for (const peak of sorted) {
        if (used.has(peak.valid_elevation_index)) continue;

        for (const other of sorted) {
            if (other.valid_elevation_index === peak.valid_elevation_index) continue;
            if (used.has(other.valid_elevation_index)) continue;
            const dist = haversineDistance(peak.lat, peak.lon, other.lat, other.lon);
            if (dist < mergeDistance) {
                used.add(other.valid_elevation_index);
            }
        }

        merged.push(peak);
    }

    return merged.sort((a, b) => a.valid_elevation_index - b.valid_elevation_index);
}

function detectSummitCandidates(points, rawConfig) {
    const config = normalizeDetectionConfig(rawConfig || {});
    const validPoints = [];

    // Map to valid points tracking original indexes
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.ele !== undefined && p.ele !== null && !isNaN(p.ele)) {
            validPoints.push({ ...p, source_trackpoint_index: i, valid_elevation_index: validPoints.length });
        }
    }

    if (validPoints.length < 3) return [];

    const elevations = validPoints.map(p => p.ele);
    const smoothed = smooth(elevations, config.smoothWindow);
    const candidates = [];
    const radius = Math.min(config.peakRadius, Math.floor(validPoints.length / 3));

    for (let i = radius; i < validPoints.length - radius; i++) {
        let isMax = true;
        for (let j = 1; j <= radius; j++) {
            if (smoothed[i] <= smoothed[i - j] || smoothed[i] <= smoothed[i + j]) {
                isMax = false;
                break;
            }
        }
        if (isMax) {
            candidates.push({
                ...validPoints[i],
                smoothed_ele: smoothed[i]
            });
        }
    }

    let maxIdx = 0;
    for (let i = 1; i < smoothed.length; i++) {
        if (smoothed[i] > smoothed[maxIdx]) maxIdx = i;
    }
    const maxAlreadyIncluded = candidates.some(c => Math.abs(c.valid_elevation_index - maxIdx) < radius);
    if (!maxAlreadyIncluded) {
        candidates.push({
            ...validPoints[maxIdx],
            smoothed_ele: smoothed[maxIdx]
        });
    }

    const peaks = [];
    for (const candidate of candidates) {
        const prominence = calculateProminence(smoothed, candidate.valid_elevation_index);
        if (prominence >= config.minProminence) {
            peaks.push({
                ...candidate,
                prominence: prominence,
                detection_method: 'local_maxima_with_prominence',
                detection_parameters: `window=${config.smoothWindow},radius=${config.peakRadius},min_prominence=${config.minProminence},merge=${config.mergeDistance}`
            });
        }
    }

    return mergeNearbyPeaks(peaks, config.mergeDistance);
}

module.exports = {
    DEFAULT_SUMMIT_DETECTION_CONFIG,
    normalizeDetectionConfig,
    haversineDistance,
    smooth,
    calculateProminence,
    mergeNearbyPeaks,
    detectSummitCandidates
};

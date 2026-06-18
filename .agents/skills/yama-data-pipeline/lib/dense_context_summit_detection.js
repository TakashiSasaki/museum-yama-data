const crypto = require('crypto');
const { haversineDistance } = require('./geo_distance.js');

const CANDIDATE_TYPE_PRIORITY = [
    'prominent_local_peak',
    'gemini_near_trackpoint_peak',
    'csv_near_trackpoint_peak',
    'named_track_context_candidate',
    'traverse_split_candidate',
    'minor_local_peak'
];

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

function getLocalWindowStats(points, centerIdx, radiusM) {
    const center = points[centerIdx];
    let minEle = center.ele;
    let maxEle = center.ele;
    let count = 0;

    for (const p of points) {
        if (haversineDistance(center.lat, center.lon, p.lat, p.lon) <= radiusM) {
            count++;
            if (p.ele < minEle) minEle = p.ele;
            if (p.ele > maxEle) maxEle = p.ele;
        }
    }

    return {
        count,
        min: minEle,
        max: maxEle,
        range: maxEle - minEle
    };
}

function extractRawProposals(points, config, anchors) {
    // points is a flat array but includes segment_index and point_index
    const proposals = [];
    const validPoints = points.filter(p => p.hasEle && !isNaN(p.ele));

    if (validPoints.length < 3) return [];

    const elevations = validPoints.map(p => p.ele);
    const smoothed = smooth(elevations, config.v1_prominent_smooth_window || 5);

    // Find basic local maxima (smoothed)
    const radius = Math.min(config.v1_prominent_peak_radius || 10, Math.floor(validPoints.length / 3));
    const localMaxima = [];
    for (let i = radius; i < validPoints.length - radius; i++) {
        let isMax = true;
        for (let j = 1; j <= radius; j++) {
            if (smoothed[i] <= smoothed[i - j] || smoothed[i] <= smoothed[i + j]) {
                isMax = false;
                break;
            }
        }
        if (isMax) {
            localMaxima.push(i);
        }
    }

    // Always include absolute maximum
    let maxIdx = 0;
    for (let i = 1; i < smoothed.length; i++) {
        if (smoothed[i] > smoothed[maxIdx]) maxIdx = i;
    }
    if (!localMaxima.includes(maxIdx)) localMaxima.push(maxIdx);

    // Generate Prominent and Minor peaks
    for (const i of localMaxima) {
        const prominence = calculateProminence(smoothed, i);
        const p = validPoints[i];

        let type = null;
        if (prominence >= (config.v1_prominent_min_prominence_m || 30)) {
            type = 'prominent_local_peak';
        } else if (prominence >= (config.minor_peak_min_prominence_m || 10)) {
            type = 'minor_local_peak';
        }

        if (type) {
            proposals.push({
                ...p,
                type,
                reason_codes: [type],
                smoothed_ele_m: smoothed[i],
                prominence_m: prominence,
                anchor_distance: 0,
                evidence: {
                    prominence: { smoothed_ele_m: smoothed[i], prominence_m: prominence }
                }
            });
        }
    }

    // Anchor-based search (Gemini & CSV)
    // Find best peak-like point near anchors
    for (const anchor of anchors) {
        const radiusM = anchor.type === 'gemini' ? (config.gemini_anchor_search_radius_m || 300) : (config.csv_anchor_search_radius_m || 300);
        let nearestDist = Infinity;
        let nearestIdx = -1;
        let highestEle = -Infinity;
        let highestIdx = -1;

        const inWindow = [];
        for (let i = 0; i < validPoints.length; i++) {
            const p = validPoints[i];
            const d = haversineDistance(anchor.lat, anchor.lon, p.lat, p.lon);
            if (d <= radiusM) {
                inWindow.push(i);
                if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
                if (p.ele > highestEle) { highestEle = p.ele; highestIdx = i; }
            }
        }

        if (inWindow.length === 0) continue;

        // Prefer a local max within window
        const localMaxInWindow = inWindow.filter(i => localMaxima.includes(i));
        let bestIdx = -1;
        let selectionReason = '';

        if (localMaxInWindow.length > 0) {
            bestIdx = localMaxInWindow.reduce((best, cur) => validPoints[cur].ele > validPoints[best].ele ? cur : best, localMaxInWindow[0]);
            selectionReason = 'local_maximum';
        } else if (highestIdx !== -1) {
            bestIdx = highestIdx;
            selectionReason = 'highest_elevation_fallback';
        } else {
            bestIdx = nearestIdx;
            selectionReason = 'nearest_trackpoint_fallback';
        }

        if (bestIdx !== -1) {
            const bp = validPoints[bestIdx];
            const dist = haversineDistance(anchor.lat, anchor.lon, bp.lat, bp.lon);
            const propType = anchor.type === 'gemini' ? 'gemini_near_trackpoint_peak' : 'csv_near_trackpoint_peak';

            proposals.push({
                ...bp,
                type: propType,
                reason_codes: [propType, selectionReason],
                smoothed_ele_m: smoothed[bestIdx],
                prominence_m: calculateProminence(smoothed, bestIdx),
                anchor_distance: dist,
                evidence: {
                    [anchor.type === 'gemini' ? 'gemini_grounding_context' : 'csv_coordinate_context']: {
                        anchor_lat: anchor.lat,
                        anchor_lon: anchor.lon,
                        distance_m: dist,
                        selection_reason: selectionReason
                    }
                }
            });
        }
    }

    return proposals;
}

function deduplicateAndSelectRepresentatives(proposals, distanceThreshold = 30) {
    if (proposals.length === 0) return [];

    // Group proposals
    const groups = [];
    const used = new Set();

    for (let i = 0; i < proposals.length; i++) {
        if (used.has(i)) continue;
        const group = [proposals[i]];
        used.add(i);

        for (let j = i + 1; j < proposals.length; j++) {
            if (used.has(j)) continue;
            const dist = haversineDistance(proposals[i].lat, proposals[i].lon, proposals[j].lat, proposals[j].lon);
            if (dist <= distanceThreshold) {
                group.push(proposals[j]);
                used.add(j);
            }
        }
        groups.push(group);
    }

    const getTypePriority = (t) => {
        const idx = CANDIDATE_TYPE_PRIORITY.indexOf(t);
        return idx === -1 ? 999 : idx;
    };

    const results = [];
    for (const group of groups) {
        // Selection Rules:
        // 1. highest primary type priority
        // 2. stronger peak evidence (prominence)
        // 3. higher elevation
        // 4. smaller anchor distance
        // 5. smaller source trackpoint index
        group.sort((a, b) => {
            const pA = getTypePriority(a.type);
            const pB = getTypePriority(b.type);
            if (pA !== pB) return pA - pB;

            const promA = a.prominence_m || 0;
            const promB = b.prominence_m || 0;
            if (Math.abs(promA - promB) > 0.1) return promB - promA;

            if (Math.abs(a.ele - b.ele) > 0.1) return b.ele - a.ele;

            const dA = a.anchor_distance || Infinity;
            const dB = b.anchor_distance || Infinity;
            if (Math.abs(dA - dB) > 0.1) return dA - dB;

            return a.trackpoint_index - b.trackpoint_index;
        });

        const rep = group[0];

        // Merge evidence and reason codes
        const mergedReasonCodes = new Set();
        const deduplicationEvidence = {
            merged_proposal_count: group.length,
            representative_type: rep.type,
            merged_types: [...new Set(group.map(p => p.type))],
            trackpoint_indices: group.map(p => p.trackpoint_index),
            discarded_coordinates: group.slice(1).map(p => ({ lat: p.lat, lon: p.lon, ele: p.ele, type: p.type }))
        };

        const mergedEvidence = {};
        for (const p of group) {
            p.reason_codes.forEach(c => mergedReasonCodes.add(c));
            Object.assign(mergedEvidence, p.evidence || {});
        }
        mergedEvidence.deduplication = deduplicationEvidence;

        results.push({
            lat: rep.lat,
            lon: rep.lon,
            ele: rep.ele,
            time: rep.time,
            trackpoint_segment_index: rep.segment_index,
            trackpoint_index: rep.trackpoint_index,
            primary_candidate_type: rep.type,
            candidate_generation_reason_codes: Array.from(mergedReasonCodes),
            smoothed_ele_m: rep.smoothed_ele_m,
            prominence_m: rep.prominence_m,
            evidence: mergedEvidence
        });
    }

    return results;
}

function processGPX(points, config, anchors, gpxContext) {
    const rawProposals = extractRawProposals(points, config, anchors);

    // Named context proposals integration (if named context exists, attach to existing peaks or add if it matches multi-peak criteria)
    if (gpxContext.named_matches && gpxContext.named_matches.length > 0) {
         // Apply to all proposals as additional evidence
         for (const p of rawProposals) {
             p.reason_codes.push('named_context_with_local_peak');
             if (!p.evidence.name_activity_title_context) p.evidence.name_activity_title_context = {};
             p.evidence.name_activity_title_context.matches = gpxContext.named_matches;

             // Promote minor peaks to named context candidates
             if (p.type === 'minor_local_peak') {
                 p.type = 'named_track_context_candidate';
             }
         }
    }

    // Traverse split logic
    if (gpxContext.is_traverse && rawProposals.length > 0) {
         const sortedByProminence = [...rawProposals].sort((a,b) => (b.prominence_m||0) - (a.prominence_m||0));
         const retained = [];
         for (const p of sortedByProminence) {
             // Check separation distance
             let isSeparated = true;
             for (const r of retained) {
                 if (haversineDistance(p.lat, p.lon, r.lat, r.lon) < (config.traverse_split_min_separation_m || 300)) {
                     isSeparated = false;
                     break;
                 }
             }
             if (isSeparated) {
                 if (p.type === 'minor_local_peak') {
                     p.type = 'traverse_split_candidate';
                     p.reason_codes.push('traverse_split_candidate');
                 }
                 retained.push(p);
             }
         }
         // rawProposals is already modified by reference
    }

    const candidates = deduplicateAndSelectRepresentatives(rawProposals, config.dedupe_distance_m || 30);

    // Calculate local window stats for final candidates
    for (const c of candidates) {
        const stats = getLocalWindowStats(points, c.trackpoint_index, 300);
        c.local_window_trackpoint_count = stats.count;
        c.local_window_max_ele_m = stats.max;
        c.local_window_min_ele_m = stats.min;
        c.local_window_ele_range_m = stats.range;
        c.evidence.local_trackpoint_window = stats;
    }

    return candidates;
}

function generateCandidateId(prefix, dataStr) {
    const hash = crypto.createHash('sha256').update(dataStr).digest('hex').substring(0, 16);
    return `dense-summit-candidate:${hash}`;
}

module.exports = {
    extractRawProposals,
    deduplicateAndSelectRepresentatives,
    processGPX,
    generateCandidateId,
    smooth,
    calculateProminence,
    getLocalWindowStats
};

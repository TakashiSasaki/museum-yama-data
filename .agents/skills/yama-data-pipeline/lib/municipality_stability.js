'use strict';

const { lookupPoint, STATUS } = require('./municipality_point_lookup');

const STABILITY_STATUS = {
    STABLE_INTERIOR: 'stable_interior',
    STABLE_CARDINAL_SAME: 'stable_cardinal_1km_same',
    NEAR_BOUNDARY: 'near_boundary',
    OFFSET_INCONSISTENT: 'offset_inconsistent',
    BOUNDARY_AMBIGUOUS: 'boundary_ambiguous',
    OUTSIDE_PREFECTURE: 'outside_prefecture',
    INVALID_COORDINATE: 'invalid_coordinate'
};

/**
 * Classify the municipality stability of a summit candidate.
 * 
 * @param {Array} municipalities - Loaded municipality geometries
 * @param {Object} candidate - Summit candidate record (with lat, lon, summit_candidate_id)
 * @param {Object} lookupRecord - Center point lookup record from Stage 15
 * @param {Object} options - Parameters (offsetM, boundaryToleranceM, stableInteriorThresholdM)
 * @returns {Object} Stability classification record
 */
function classifyStability(municipalities, candidate, lookupRecord, options = {}) {
    const offsetM = options.offsetM !== undefined ? Number(options.offsetM) : 1000;
    const boundaryToleranceM = options.boundaryToleranceM !== undefined ? Number(options.boundaryToleranceM) : 20;
    const stableInteriorThresholdM = options.stableInteriorThresholdM !== undefined ? Number(options.stableInteriorThresholdM) : 1000;

    const lat = Number(candidate.lat);
    const lon = Number(candidate.lon);

    const baseResult = {
        summit_candidate_id: candidate.summit_candidate_id,
        lat,
        lon,
        offset_m: offsetM,
        boundary_tolerance_m: boundaryToleranceM,
        stable_interior_threshold_m: stableInteriorThresholdM,
        source_dataset: 'ksj_administrative_area_N03',
        prefecture: '愛媛県',
        prefecture_code: '38',
        data_reference_date: '2026-01-01',
        notes: null
    };

    // 1. Center lookup
    let centerLookup;
    if (lookupRecord) {
        // Reuse and verify center lookup
        centerLookup = lookupRecord;
    } else {
        // Direct lookup at center
        const lookup = lookupPoint(municipalities, lat, lon, boundaryToleranceM);
        const primary = lookup.status === STATUS.SINGLE && lookup.municipality_matches.length === 1
            ? lookup.municipality_matches[0]
            : null;

        centerLookup = {
            lookup_status: lookup.status,
            municipality_matches: lookup.municipality_matches,
            boundary_matches: lookup.boundary_matches,
            primary_municipality_code: primary ? primary.code : null,
            primary_municipality_name: primary ? primary.name : null
        };
    }

    baseResult.center_lookup_status = centerLookup.lookup_status;
    baseResult.center_municipality_code = centerLookup.primary_municipality_code || null;
    baseResult.center_municipality_name = centerLookup.primary_municipality_name || null;

    // Get center distance to boundary (or null if outside/invalid)
    let centerDist = null;
    if (centerLookup.lookup_status === STATUS.SINGLE && centerLookup.municipality_matches && centerLookup.municipality_matches[0]) {
        centerDist = centerLookup.municipality_matches[0].distance_to_boundary_m;
    } else if (centerLookup.lookup_status === STATUS.AMBIGUOUS && centerLookup.municipality_matches && centerLookup.municipality_matches[0]) {
        // For ambiguous, the minimum distance to boundary is the distance of matches
        centerDist = centerLookup.municipality_matches[0].distance_to_boundary_m;
    }
    baseResult.center_distance_to_boundary_m = centerDist;

    const reasonCodes = [];

    // Early exits for non-single center points
    if (centerLookup.lookup_status === STATUS.INVALID) {
        reasonCodes.push('CENTER_INVALID');
        return {
            ...baseResult,
            north_lookup: null,
            south_lookup: null,
            east_lookup: null,
            west_lookup: null,
            all_cardinal_1km_same: false,
            distance_stable_interior: false,
            municipality_stability: STABILITY_STATUS.INVALID_COORDINATE,
            municipality_stability_reason_codes: reasonCodes
        };
    }

    if (centerLookup.lookup_status === STATUS.OUTSIDE) {
        reasonCodes.push('CENTER_OUTSIDE');
        return {
            ...baseResult,
            north_lookup: null,
            south_lookup: null,
            east_lookup: null,
            west_lookup: null,
            all_cardinal_1km_same: false,
            distance_stable_interior: false,
            municipality_stability: STABILITY_STATUS.OUTSIDE_PREFECTURE,
            municipality_stability_reason_codes: reasonCodes
        };
    }

    if (centerLookup.lookup_status === STATUS.AMBIGUOUS) {
        reasonCodes.push('CENTER_AMBIGUOUS');
        return {
            ...baseResult,
            north_lookup: null,
            south_lookup: null,
            east_lookup: null,
            west_lookup: null,
            all_cardinal_1km_same: false,
            distance_stable_interior: false,
            municipality_stability: STABILITY_STATUS.BOUNDARY_AMBIGUOUS,
            municipality_stability_reason_codes: reasonCodes
        };
    }

    reasonCodes.push('CENTER_SINGLE');

    // 2. Perform 4 cardinal offset lookups
    const TO_RAD = Math.PI / 180;
    const deltaLat = offsetM / 111320;
    const deltaLon = offsetM / (111320 * Math.cos(lat * TO_RAD));

    const offsets = {
        north: { lat: lat + deltaLat, lon: lon },
        south: { lat: lat - deltaLat, lon: lon },
        east: { lat: lat, lon: lon + deltaLon },
        west: { lat: lat, lon: lon - deltaLon }
    };

    const offsetResults = {};
    for (const [dir, coord] of Object.entries(offsets)) {
        const lookup = lookupPoint(municipalities, coord.lat, coord.lon, boundaryToleranceM);
        const primary = lookup.status === STATUS.SINGLE && lookup.municipality_matches.length === 1
            ? lookup.municipality_matches[0]
            : null;

        offsetResults[dir] = {
            lat: coord.lat,
            lon: coord.lon,
            lookup_status: lookup.status,
            municipality_code: primary ? primary.code : null,
            municipality_name: primary ? primary.name : null,
            municipality_matches: lookup.municipality_matches
        };
    }

    baseResult.north_lookup = offsetResults.north;
    baseResult.south_lookup = offsetResults.south;
    baseResult.east_lookup = offsetResults.east;
    baseResult.west_lookup = offsetResults.west;

    // 3. Evaluate stability rules
    const centerCode = centerLookup.primary_municipality_code;
    const allCardinal1kmSame = (
        offsetResults.north.lookup_status === STATUS.SINGLE && offsetResults.north.municipality_code === centerCode &&
        offsetResults.south.lookup_status === STATUS.SINGLE && offsetResults.south.municipality_code === centerCode &&
        offsetResults.east.lookup_status === STATUS.SINGLE && offsetResults.east.municipality_code === centerCode &&
        offsetResults.west.lookup_status === STATUS.SINGLE && offsetResults.west.municipality_code === centerCode
    );

    const distanceStableInterior = (centerDist !== null && centerDist >= stableInteriorThresholdM);

    baseResult.all_cardinal_1km_same = allCardinal1kmSame;
    baseResult.distance_stable_interior = distanceStableInterior;

    if (allCardinal1kmSame) {
        reasonCodes.push('ALL_OFFSETS_SAME');
    } else {
        reasonCodes.push('OFFSETS_DIFFER');
    }

    if (distanceStableInterior) {
        reasonCodes.push('DISTANCE_ABOVE_THRESHOLD');
    } else {
        reasonCodes.push('DISTANCE_BELOW_THRESHOLD');
    }

    let finalStability;
    if (allCardinal1kmSame && distanceStableInterior) {
        finalStability = STABILITY_STATUS.STABLE_INTERIOR;
    } else if (allCardinal1kmSame && !distanceStableInterior) {
        finalStability = STABILITY_STATUS.STABLE_CARDINAL_SAME;
    } else if (!allCardinal1kmSame && centerDist < stableInteriorThresholdM) {
        finalStability = STABILITY_STATUS.NEAR_BOUNDARY;
    } else {
        finalStability = STABILITY_STATUS.OFFSET_INCONSISTENT;
    }

    baseResult.municipality_stability = finalStability;
    baseResult.municipality_stability_reason_codes = reasonCodes;

    return baseResult;
}

module.exports = {
    classifyStability,
    STABILITY_STATUS
};

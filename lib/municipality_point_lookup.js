'use strict';

/**
 * municipality_point_lookup.js
 *
 * Reusable KSJ/N03 municipality point-in-polygon lookup for Ehime Prefecture.
 *
 * Algorithm notes:
 * - Uses a ray-casting algorithm for point-in-polygon containment.
 * - Point-to-segment distance uses a local planar approximation.
 *   At ~33°N latitude, 1 degree longitude ≈ 92,800 m and 1 degree latitude ≈ 111,000 m.
 *   This approximation introduces < 0.1% error over single-municipality scales.
 * - No external APIs are used. All geometry is processed from the input GeoJSON file.
 * - Coordinate convention: [longitude, latitude] in WGS84 for GeoJSON coordinates.
 *   CLI accepts --lat and --lon separately.
 */

const fs = require('fs');
const path = require('path');

const EARTH_RADIUS_M = 6371000;
const TO_RAD = Math.PI / 180;
const PREFECTURE = '愛媛県';
const PREFECTURE_CODE_PREFIX = '38';
const DATA_REFERENCE_DATE = '2026-01-01';
const SOURCE_DATASET = 'ksj_administrative_area_N03';
const DEFAULT_BOUNDARY_TOLERANCE_M = 20;

// Lookup statuses
const STATUS = {
    SINGLE: 'single_municipality',
    AMBIGUOUS: 'boundary_ambiguous',
    OUTSIDE: 'outside_prefecture',
    INVALID: 'invalid_coordinate'
};

/**
 * Validate a WGS84 latitude/longitude pair.
 * Returns null on success or an error string on failure.
 */
function validateCoordinates(lat, lon) {
    if (typeof lat !== 'number' || isNaN(lat)) return 'lat is not a number';
    if (typeof lon !== 'number' || isNaN(lon)) return 'lon is not a number';
    if (lat < -90 || lat > 90) return `lat ${lat} is outside valid range [-90, 90]`;
    if (lon < -180 || lon > 180) return `lon ${lon} is outside valid range [-180, 180]`;
    return null;
}

/**
 * Approximate meters per degree of latitude (nearly constant).
 */
function metersPerDegreeLat() {
    return EARTH_RADIUS_M * TO_RAD; // ≈111,000 m
}

/**
 * Approximate meters per degree of longitude at a given latitude.
 */
function metersPerDegreeLon(latDeg) {
    return EARTH_RADIUS_M * Math.cos(latDeg * TO_RAD) * TO_RAD;
}

/**
 * Point-to-segment distance in meters, using a local planar approximation.
 * Segment defined by [lon1, lat1] → [lon2, lat2].
 * Point is [pLon, pLat].
 * Returns approximate distance in meters.
 */
function pointToSegmentDistanceM(pLon, pLat, lon1, lat1, lon2, lat2) {
    // Scale degrees to approximate meters using a local reference at pLat
    const mPerLon = metersPerDegreeLon(pLat);
    const mPerLat = metersPerDegreeLat();

    const px = (pLon - lon1) * mPerLon;
    const py = (pLat - lat1) * mPerLat;
    const dx = (lon2 - lon1) * mPerLon;
    const dy = (lat2 - lat1) * mPerLat;

    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        // Degenerate segment (both endpoints the same)
        return Math.sqrt(px * px + py * py);
    }

    let t = (px * dx + py * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearX = t * dx;
    const nearY = t * dy;
    const diffX = px - nearX;
    const diffY = py - nearY;

    return Math.sqrt(diffX * diffX + diffY * diffY);
}

/**
 * Ray-casting point-in-polygon test.
 * ring is an array of [lon, lat] pairs.
 * Returns true if point [pLon, pLat] is inside.
 */
function pointInRing(pLon, pLat, ring) {
    let inside = false;
    const n = ring.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        // Edge from j to i crosses ray?
        const intersects =
            ((yi > pLat) !== (yj > pLat)) &&
            (pLon < ((xj - xi) * (pLat - yi)) / (yj - yi) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

/**
 * Test if point [pLon, pLat] is inside a GeoJSON Polygon (array of rings).
 * First ring is outer boundary, subsequent rings are holes.
 * Returns true if inside outer ring and NOT inside any hole.
 */
function pointInPolygon(pLon, pLat, rings) {
    if (!pointInRing(pLon, pLat, rings[0])) return false;
    for (let h = 1; h < rings.length; h++) {
        if (pointInRing(pLon, pLat, rings[h])) return false; // inside a hole
    }
    return true;
}

/**
 * Compute minimum distance from point to polygon boundary in meters.
 * rings: array of rings (outer + holes), each ring is [[lon, lat], ...]
 */
function minDistToBoundaryM(pLon, pLat, rings) {
    let minDist = Infinity;
    for (const ring of rings) {
        for (let i = 0; i < ring.length - 1; i++) {
            const [lon1, lat1] = ring[i];
            const [lon2, lat2] = ring[i + 1];
            const d = pointToSegmentDistanceM(pLon, pLat, lon1, lat1, lon2, lat2);
            if (d < minDist) minDist = d;
        }
    }
    return minDist;
}

/**
 * Compute min distance from point to a MultiPolygon (array of polygons, each array of rings).
 */
function minDistToMultiPolygonBoundaryM(pLon, pLat, polygons) {
    let minDist = Infinity;
    for (const rings of polygons) {
        const d = minDistToBoundaryM(pLon, pLat, rings);
        if (d < minDist) minDist = d;
    }
    return minDist;
}

/**
 * Test if point is inside any polygon of a MultiPolygon.
 */
function pointInMultiPolygon(pLon, pLat, polygons) {
    for (const rings of polygons) {
        if (pointInPolygon(pLon, pLat, rings)) return true;
    }
    return false;
}

/**
 * Load and parse the N03 GeoJSON, grouping features by municipality code.
 * Validates all features are for Ehime prefecture.
 * Returns an array of municipality objects:
 *   { code, name, polygons }
 * where polygons is an array of [ rings[] ] (MultiPolygon representation).
 */
function loadMunicipalities(geojsonPath) {
    const absPath = path.resolve(geojsonPath);
    if (!fs.existsSync(absPath)) {
        throw new Error(`N03 GeoJSON file not found: ${geojsonPath}`);
    }

    const geojson = JSON.parse(fs.readFileSync(absPath, 'utf-8'));
    if (!geojson || !Array.isArray(geojson.features)) {
        throw new Error(`Invalid GeoJSON: missing features array in ${geojsonPath}`);
    }

    const munMap = new Map(); // code -> { code, name, polygons[] }

    for (const feature of geojson.features) {
        const props = feature.properties || {};
        const name = props.N03_004;
        const code = props.N03_007;
        const pref = props.N03_001;
        const geom = feature.geometry;

        if (!name || !code) continue; // skip features without municipality info

        // Validate prefecture
        if (pref !== PREFECTURE || !code.startsWith(PREFECTURE_CODE_PREFIX)) {
            throw new Error(
                `GeoJSON contains non-Ehime feature: prefecture="${pref}", code="${code}". ` +
                `Expected prefecture="${PREFECTURE}" with code prefix "${PREFECTURE_CODE_PREFIX}".`
            );
        }

        if (!geom) continue;

        if (!munMap.has(code)) {
            munMap.set(code, { code, name, polygons: [] });
        }
        const mun = munMap.get(code);

        if (geom.type === 'Polygon') {
            mun.polygons.push(geom.coordinates);
        } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) {
                mun.polygons.push(poly);
            }
        }
        // Other geometry types ignored
    }

    if (munMap.size === 0) {
        throw new Error('No valid Ehime municipality features found in GeoJSON');
    }

    // Sort deterministically by code
    const sorted = [...munMap.values()].sort((a, b) => a.code.localeCompare(b.code));
    return sorted;
}

/**
 * Perform point-in-polygon lookup for a single WGS84 point.
 *
 * @param {Array} municipalities - loaded municipality objects from loadMunicipalities()
 * @param {number} lat - WGS84 latitude
 * @param {number} lon - WGS84 longitude
 * @param {number} boundaryToleranceM - boundary tolerance in meters (default 20)
 * @returns {Object} lookup result
 */
function lookupPoint(municipalities, lat, lon, boundaryToleranceM = DEFAULT_BOUNDARY_TOLERANCE_M) {
    const base = {
        lat,
        lon,
        source_dataset: SOURCE_DATASET,
        prefecture: PREFECTURE,
        prefecture_code: PREFECTURE_CODE_PREFIX,
        data_reference_date: DATA_REFERENCE_DATE
    };

    // Validate coordinates
    const coordErr = validateCoordinates(lat, lon);
    if (coordErr) {
        return {
            ...base,
            status: STATUS.INVALID,
            municipality_matches: [],
            boundary_matches: [],
            notes: `Invalid coordinate: ${coordErr}`
        };
    }

    const pLon = lon;
    const pLat = lat;

    const containing = [];     // municipalities whose polygon contains the point
    const nearBoundary = [];   // municipalities whose boundary is within tolerance

    for (const mun of municipalities) {
        const isInside = pointInMultiPolygon(pLon, pLat, mun.polygons);
        const distM = minDistToMultiPolygonBoundaryM(pLon, pLat, mun.polygons);

        if (isInside) {
            containing.push({
                code: mun.code,
                name: mun.name,
                relationship: 'contains',
                distance_to_boundary_m: parseFloat(distM.toFixed(3))
            });
        } else if (distM <= boundaryToleranceM) {
            nearBoundary.push({
                code: mun.code,
                name: mun.name,
                relationship: 'within_tolerance',
                distance_to_boundary_m: parseFloat(distM.toFixed(3))
            });
        }
    }

    // Determine status
    if (containing.length === 1 && nearBoundary.length === 0) {
        return {
            ...base,
            status: STATUS.SINGLE,
            municipality_matches: containing,
            boundary_matches: [],
            notes: null
        };
    }

    if (containing.length > 1 || (containing.length >= 1 && nearBoundary.length > 0) || nearBoundary.length > 0) {
        // Ambiguous: on or near boundary between municipalities
        const allMatches = [
            ...containing,
            ...nearBoundary
        ];
        const boundaryMatches = allMatches.map(m => ({ code: m.code, name: m.name }));
        return {
            ...base,
            status: STATUS.AMBIGUOUS,
            municipality_matches: allMatches,
            boundary_matches: boundaryMatches,
            notes: `Point is within ${boundaryToleranceM}m of a municipality boundary or contained in multiple polygons`
        };
    }

    // Outside all Ehime municipality polygons
    return {
        ...base,
        status: STATUS.OUTSIDE,
        municipality_matches: [],
        boundary_matches: [],
        notes: 'Point is outside all Ehime prefecture municipality polygons'
    };
}

/**
 * Perform lookup for a batch of points.
 *
 * @param {Array} municipalities - loaded from loadMunicipalities()
 * @param {Array} points - array of { id, lat, lon } objects
 * @param {number} boundaryToleranceM
 * @returns {Array} array of result objects with source_record_id
 */
function lookupPoints(municipalities, points, boundaryToleranceM = DEFAULT_BOUNDARY_TOLERANCE_M) {
    return points.map(pt => {
        const result = lookupPoint(municipalities, pt.lat, pt.lon, boundaryToleranceM);
        const primary = result.status === STATUS.SINGLE && result.municipality_matches.length === 1
            ? result.municipality_matches[0]
            : null;

        return {
            source_record_id: pt.id,
            lat: pt.lat,
            lon: pt.lon,
            lookup_status: result.status,
            municipality_matches: result.municipality_matches,
            boundary_matches: result.boundary_matches,
            primary_municipality_code: primary ? primary.code : null,
            primary_municipality_name: primary ? primary.name : null,
            source_dataset: SOURCE_DATASET,
            prefecture: PREFECTURE,
            prefecture_code: PREFECTURE_CODE_PREFIX,
            data_reference_date: DATA_REFERENCE_DATE,
            boundary_tolerance_m: boundaryToleranceM,
            notes: result.notes || null
        };
    });
}

module.exports = {
    loadMunicipalities,
    lookupPoint,
    lookupPoints,
    validateCoordinates,
    pointInPolygon,
    pointInMultiPolygon,
    pointToSegmentDistanceM,
    minDistToBoundaryM,
    STATUS,
    DEFAULT_BOUNDARY_TOLERANCE_M,
    SOURCE_DATASET,
    PREFECTURE,
    PREFECTURE_CODE_PREFIX,
    DATA_REFERENCE_DATE
};

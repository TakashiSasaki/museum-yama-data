const { haversineDistance } = require('./geo_distance');

/**
 * enriches a single summit candidate with reverse geocoding point evidence.
 * @param {object} candidate The summit candidate record
 * @param {object[]} geocodedPoints All extracted geocoded points from the index
 * @param {number} radiusM Search radius in meters
 * @returns {object} The enriched candidate record
 */
function enrichSummitCandidate(candidate, geocodedPoints, radiusM = 1000) {
    const enriched = {
        summit_candidate_id: candidate.summit_candidate_id,
        candidate_status: candidate.candidate_status,
        lat: candidate.lat,
        lon: candidate.lon,
        ele_m: candidate.ele_m,
        source_gpx_path: candidate.source_gpx_path,
        source_gpx_basename: candidate.source_gpx_basename,
        summit_candidate_gpx_path: candidate.summit_candidate_gpx_path,
        summit_candidate_gpx_basename: candidate.summit_candidate_gpx_basename,
        track_name: candidate.track_name,
        search_radius_m: radiusM,
        nearest_distance_m: null,
        nearest_geocoded_point_id: null,
        nearest_display_name: null,
        nearest_address: null,
        nearby_reverse_geocoded_points: [],
        location_candidates: [],
        prefecture_candidates: [],
        county_candidates: [],
        city_candidates: [],
        town_candidates: [],
        village_candidates: [],
        island_candidates: [],
        local_candidates: [],
        location_evidence_status: 'no_nearby_reverse_geocode_point',
        location_evidence_level: 'none',
        border_tolerance_applied: true,
        needs_review: false,
        notes: ''
    };

    // Coordinate validation
    const latValid = typeof candidate.lat === 'number' && !isNaN(candidate.lat) && candidate.lat >= -90 && candidate.lat <= 90;
    const lonValid = typeof candidate.lon === 'number' && !isNaN(candidate.lon) && candidate.lon >= -180 && candidate.lon <= 180;

    if (!latValid || !lonValid) {
        enriched.location_evidence_status = 'invalid_candidate_coordinates';
        enriched.needs_review = true;
        enriched.notes = 'Invalid candidate coordinates';
        return enriched;
    }

    // Find nearby geocoded points
    const nearbyPoints = [];
    for (const point of geocodedPoints) {
        if (point.coordinate_parse_status !== 'valid') continue;
        const pLat = point.lat;
        const pLon = point.lon;
        if (typeof pLat !== 'number' || isNaN(pLat) || typeof pLon !== 'number' || isNaN(pLon)) continue;

        const dist = haversineDistance(candidate.lat, candidate.lon, pLat, pLon);
        if (dist <= radiusM) {
            nearbyPoints.push({
                geocoded_point_id: point.geocoded_point_id,
                distance_m: Number(dist.toFixed(1)),
                provider: point.provider,
                display_name: point.display_name,
                prefecture: point.prefecture,
                county: point.county,
                city: point.city,
                town: point.town,
                village: point.village,
                island: point.island,
                local: point.local,
                raw_file_path: point.raw_file_path,
                address: point.address
            });
        }
    }

    // Sort by distance ascending
    nearbyPoints.sort((a, b) => a.distance_m - b.distance_m);

    enriched.nearby_reverse_geocoded_points = nearbyPoints;

    if (nearbyPoints.length === 0) {
        enriched.location_evidence_status = 'no_nearby_reverse_geocode_point';
        enriched.location_evidence_level = 'none';
        enriched.needs_review = true;
        enriched.notes = 'No nearby reverse geocoding evidence within radius';
        return enriched;
    }

    // Set nearest details
    const nearest = nearbyPoints[0];
    enriched.location_evidence_status = 'nearby_reverse_geocode_found';
    enriched.nearest_geocoded_point_id = nearest.geocoded_point_id;
    enriched.nearest_distance_m = nearest.distance_m;
    enriched.nearest_display_name = nearest.display_name;
    enriched.nearest_address = nearest.address;

    // Determine evidence level based on closest point distance
    const dist = nearest.distance_m;
    if (dist <= 100) {
        enriched.location_evidence_level = 'very_strong';
    } else if (dist <= 300) {
        enriched.location_evidence_level = 'strong';
    } else {
        enriched.location_evidence_level = 'weak_but_usable';
    }

    // Compile location candidates and granular arrays
    const locationCandidateMap = new Map();
    const prefectureSet = new Set();
    const countySet = new Set();
    const citySet = new Set();
    const townSet = new Set();
    const villageSet = new Set();
    const islandSet = new Set();
    const localSet = new Set();

    const addLocationCandidate = (name, type, point) => {
        if (!name) return;
        const key = `${type}:${name}`;
        if (!locationCandidateMap.has(key)) {
            locationCandidateMap.set(key, {
                location_name: name,
                location_type: type,
                support_count: 1,
                min_distance_m: point.distance_m,
                nearest_geocoded_point_id: point.geocoded_point_id
            });
        } else {
            const existing = locationCandidateMap.get(key);
            existing.support_count++;
            if (point.distance_m < existing.min_distance_m) {
                existing.min_distance_m = point.distance_m;
                existing.nearest_geocoded_point_id = point.geocoded_point_id;
            }
        }
    };

    for (const p of nearbyPoints) {
        if (p.prefecture) prefectureSet.add(p.prefecture);
        if (p.county) countySet.add(p.county);
        if (p.city) citySet.add(p.city);
        if (p.town) townSet.add(p.town);
        if (p.village) villageSet.add(p.village);
        if (p.island) islandSet.add(p.island);
        if (p.local) localSet.add(p.local);

        addLocationCandidate(p.prefecture, 'prefecture', p);
        addLocationCandidate(p.county, 'county', p);
        addLocationCandidate(p.city, 'city', p);
        addLocationCandidate(p.town, 'town', p);
        addLocationCandidate(p.village, 'village', p);
        addLocationCandidate(p.island, 'island', p);
        addLocationCandidate(p.local, 'local', p);
    }

    // Since nearbyPoints is sorted by distance ascending, Set insertion order matches nearest distance order.
    enriched.prefecture_candidates = Array.from(prefectureSet);
    enriched.county_candidates = Array.from(countySet);
    enriched.city_candidates = Array.from(citySet);
    enriched.town_candidates = Array.from(townSet);
    enriched.village_candidates = Array.from(villageSet);
    enriched.island_candidates = Array.from(islandSet);
    enriched.local_candidates = Array.from(localSet);

    // Convert location candidates map to array and sort deterministically
    const locCandidates = Array.from(locationCandidateMap.values());
    locCandidates.sort((a, b) => {
        if (a.min_distance_m !== b.min_distance_m) {
            return a.min_distance_m - b.min_distance_m;
        }
        if (a.location_type !== b.location_type) {
            return a.location_type.localeCompare(b.location_type);
        }
        return a.location_name.localeCompare(b.location_name);
    });
    enriched.location_candidates = locCandidates;

    // Review logic
    const muniNames = new Set([...citySet, ...townSet, ...villageSet]);
    const hasConflict = prefectureSet.size > 1 || countySet.size > 1 || muniNames.size > 1;

    if (enriched.location_evidence_level === 'weak_but_usable') {
        enriched.needs_review = true;
        enriched.notes = 'Weak geocoding evidence (distance > 300m)';
    } else if (hasConflict) {
        enriched.needs_review = true;
        const conflicts = [];
        if (prefectureSet.size > 1) conflicts.push(`prefectures: [${Array.from(prefectureSet).join(', ')}]`);
        if (muniNames.size > 1) conflicts.push(`municipalities: [${Array.from(muniNames).join(', ')}]`);
        enriched.notes = `Conflicting nearby location candidates. ${conflicts.join('; ')}`;
    } else {
        enriched.needs_review = false;
        enriched.notes = `Resolved with ${enriched.location_evidence_level} evidence.`;
    }

    return enriched;
}

module.exports = {
    enrichSummitCandidate
};

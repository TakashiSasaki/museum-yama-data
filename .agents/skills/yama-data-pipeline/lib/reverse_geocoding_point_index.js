const path = require('path');

/**
 * Extract reverse geocoding points from a raw Nominatim JSON array.
 *
 * @param {Array} rawArray - Parsed JSON array content of a Nominatim cache file.
 * @param {string} filePath - Path to the raw JSON file.
 * @param {string} fileSha256 - Checksum of the raw JSON file.
 * @returns {Array} List of extracted point objects.
 */
function extractGeocodedPoints(rawArray, filePath, fileSha256) {
    if (!Array.isArray(rawArray)) {
        throw new Error(`Raw JSON file content must be a JSON array, got ${typeof rawArray}`);
    }

    const basename = path.basename(filePath);
    const records = [];

    for (let recordIndex = 0; recordIndex < rawArray.length; recordIndex++) {
        const pt = rawArray[recordIndex];
        if (!pt || typeof pt !== 'object') {
            throw new Error(`Record at index ${recordIndex} in ${basename} is not a valid object`);
        }

        const provider = pt.reverse_geocoding?.provider || 'nominatim';
        const geocoded_point_id = `${provider}:${basename}:${recordIndex}`;

        const sourceFile = pt.source_file || null;
        const sourcePoint = pt.source_point || null;

        // 1. Coordinate extraction
        let lat = null;
        let lon = null;
        let coordinateParseStatus = 'missing';

        if (sourcePoint && typeof sourcePoint === 'object') {
            const parsedLat = parseFloat(sourcePoint.lat);
            const parsedLon = parseFloat(sourcePoint.lon);

            if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
                if (parsedLat >= -90 && parsedLat <= 90 && parsedLon >= -180 && parsedLon <= 180) {
                    lat = parsedLat;
                    lon = parsedLon;
                    coordinateParseStatus = 'valid';
                } else {
                    coordinateParseStatus = 'out_of_bounds';
                }
            } else {
                coordinateParseStatus = 'nan';
            }
        }

        // 2. Address extraction (prioritize requests.ja.response.body)
        const responseBody = pt.reverse_geocoding?.requests?.ja?.response?.body || null;
        const displayName = responseBody?.display_name || null;
        const address = responseBody?.address || null;

        let prefecture = null;
        let county = null;
        let city = null;
        let town = null;
        let village = null;
        let island = null;
        let local = null;
        let addressExtractStatus = 'missing';

        if (address && typeof address === 'object') {
            prefecture = address.province || address.state || address.prefecture || address.region || null;
            county = address.county || null;
            city = address.city || address.town || address.village || null;
            town = address.town || null;
            village = address.village || null;
            island = address.island || null;
            local = address.suburb || address.quarter || address.neighbourhood || address.road || address.local || address.hamlet || address.city_district || null;
            addressExtractStatus = 'valid';
        }

        const metadata = pt.metadata || null;

        records.push({
            geocoded_point_id,
            provider,
            raw_file_path: filePath,
            raw_file_sha256: fileSha256,
            raw_record_index: recordIndex,
            source_file: sourceFile,
            source_point: sourcePoint,
            lat,
            lon,
            display_name: displayName,
            address,
            prefecture,
            county,
            city,
            town,
            village,
            island,
            local,
            metadata,
            raw_snapshot_preserved: true,
            coordinate_parse_status: coordinateParseStatus,
            address_extract_status: addressExtractStatus,
            notes: []
        });
    }

    return records;
}

module.exports = {
    extractGeocodedPoints
};

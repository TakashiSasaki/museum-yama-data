const { parseGpx } = require('./gpx');
const path = require('path');

/**
 * Extract summit candidate features from GPX files listed in a manifest.
 *
 * @param {Object} manifestObj - The parsed input manifest object.
 * @param {Function} readGpxFileFn - A function (gpxPath) => xmlString to read GPX files.
 * @returns {Object} { records, summary }
 */
function extractSummitCandidateFeatures(manifestObj, readGpxFileFn) {
    if (!manifestObj || typeof manifestObj !== 'object') {
        throw new Error('Invalid manifest object');
    }
    const files = manifestObj.files || manifestObj.outputs || [];
    if (!Array.isArray(files)) {
        throw new Error('Manifest files/outputs must be an array');
    }

    const records = [];
    let zeroCandidateGpxCount = 0;
    const seenCandidateIds = new Set();

    const detectionStage = manifestObj.stage || 'unknown';
    const detectionParameters = manifestObj.parameters || {};

    for (let recordIndex = 0; recordIndex < files.length; recordIndex++) {
        const fileEntry = files[recordIndex];
        const sourceGpxPath = fileEntry.source_gpx_path;
        const sourceGpxSha256 = fileEntry.source_gpx_sha256;
        const outputGpxPath = fileEntry.output_gpx_path;
        const outputGpxSha256 = fileEntry.output_gpx_sha256;
        const trackName = fileEntry.track_name || '';
        const trackpointCount = fileEntry.trackpoint_count || 0;
        const bounds = fileEntry.bounds || null;
        const expectedCandidateCount = fileEntry.summit_candidate_count || 0;
        const manifestCandidateIds = fileEntry.candidate_ids || [];

        if (!sourceGpxPath || !outputGpxPath) {
            throw new Error(`Manifest file entry at index ${recordIndex} is missing source_gpx_path or output_gpx_path`);
        }

        const sourceGpxBasename = path.basename(sourceGpxPath);
        const summitCandidateGpxBasename = path.basename(outputGpxPath);

        if (expectedCandidateCount === 0) {
            zeroCandidateGpxCount++;
            continue;
        }

        // Read and parse output GPX
        let gpxXml;
        try {
            gpxXml = readGpxFileFn(outputGpxPath);
        } catch (err) {
            throw new Error(`Failed to read output GPX file at ${outputGpxPath}: ${err.message}`);
        }

        const doc = parseGpx(gpxXml);
        const wptNodes = doc.getElementsByTagName('wpt');
        const extractedCount = wptNodes.length;

        if (extractedCount !== expectedCandidateCount) {
            throw new Error(`Candidate count mismatch for ${outputGpxPath}: expected ${expectedCandidateCount} from manifest, found ${extractedCount} in GPX`);
        }

        for (let wptIndex = 0; wptIndex < extractedCount; wptIndex++) {
            const wptNode = wptNodes[wptIndex];

            // 1. Coordinates
            const latAttr = wptNode.getAttribute('lat');
            const lonAttr = wptNode.getAttribute('lon');
            if (!latAttr || !lonAttr) {
                throw new Error(`Waypoint at index ${wptIndex} in ${outputGpxPath} is missing lat or lon attribute`);
            }
            const lat = parseFloat(latAttr);
            const lon = parseFloat(lonAttr);

            if (isNaN(lat) || lat < -90 || lat > 90) {
                throw new Error(`Invalid latitude value ${latAttr} at index ${wptIndex} in ${outputGpxPath}`);
            }
            if (isNaN(lon) || lon < -180 || lon > 180) {
                throw new Error(`Invalid longitude value ${lonAttr} at index ${wptIndex} in ${outputGpxPath}`);
            }

            // 2. Elevation
            const eleNode = wptNode.getElementsByTagName('ele')[0];
            let ele_m = null;
            if (eleNode && eleNode.textContent !== undefined && eleNode.textContent !== null) {
                const eleVal = parseFloat(eleNode.textContent);
                if (!isNaN(eleVal)) {
                    ele_m = eleVal;
                } else {
                    throw new Error(`Invalid elevation value "${eleNode.textContent}" at index ${wptIndex} in ${outputGpxPath}`);
                }
            }

            // 3. Name & Desc
            const nameNode = wptNode.getElementsByTagName('name')[0];
            const waypoint_name = nameNode && nameNode.textContent ? nameNode.textContent.trim() : '';

            const descNode = wptNode.getElementsByTagName('desc')[0];
            const waypoint_desc = descNode && descNode.textContent ? descNode.textContent.trim() : '';

            // 4. Candidate ID
            let summit_candidate_id = '';
            if (waypoint_name.startsWith('summit-candidate:')) {
                summit_candidate_id = waypoint_name;
            } else if (manifestCandidateIds[wptIndex]) {
                summit_candidate_id = manifestCandidateIds[wptIndex];
            } else {
                throw new Error(`Could not determine summit_candidate_id for waypoint ${wptIndex} in ${outputGpxPath}`);
            }

            if (seenCandidateIds.has(summit_candidate_id)) {
                throw new Error(`Duplicate summit_candidate_id detected: ${summit_candidate_id}`);
            }
            seenCandidateIds.add(summit_candidate_id);

            records.push({
                summit_candidate_id,
                candidate_status: 'unresolved',
                source_gpx_path: sourceGpxPath,
                source_gpx_sha256: sourceGpxSha256,
                source_gpx_basename: sourceGpxBasename,
                summit_candidate_gpx_path: outputGpxPath,
                summit_candidate_gpx_sha256: outputGpxSha256,
                summit_candidate_gpx_basename: summitCandidateGpxBasename,
                track_name: trackName,
                candidate_index_in_gpx: wptIndex + 1, // 1-based index
                lat,
                lon,
                ele_m,
                waypoint_name,
                waypoint_desc,
                detection_stage: detectionStage,
                detection_parameters: detectionParameters,
                manifest_trackpoint_count: trackpointCount,
                manifest_bounds: bounds,
                source_manifest_record_index: recordIndex
            });
        }
    }

    return {
        records,
        summary: {
            input_summit_candidate_gpx_count: files.length,
            output_candidate_records: records.length,
            zero_candidate_gpx_count: zeroCandidateGpxCount,
            candidate_ids_unique: true,
            lat_lon_valid: true,
            source_files_modified: false
        }
    };
}

module.exports = {
    extractSummitCandidateFeatures
};

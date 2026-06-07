const { parseGpx } = require('./gpx');

/**
 * Parses a GPX document and returns trackpoints with global and segment indices.
 * @param {string} xmlString Raw GPX XML string
 * @returns {Array<Object>} List of trackpoints
 */
function extractTrackPointsWithIndices(xmlString) {
    const doc = parseGpx(xmlString);
    const trackpoints = [];
    let globalIndex = 0;

    const trkNodes = doc.getElementsByTagName('trk');
    for (let t = 0; t < trkNodes.length; t++) {
        const trk = trkNodes[t];
        const trksegNodes = trk.getElementsByTagName('trkseg');
        for (let s = 0; s < trksegNodes.length; s++) {
            const trkseg = trksegNodes[s];
            const trkptNodes = trkseg.getElementsByTagName('trkpt');
            for (let p = 0; p < trkptNodes.length; p++) {
                const node = trkptNodes[p];
                const lat = parseFloat(node.getAttribute('lat'));
                const lon = parseFloat(node.getAttribute('lon'));

                const eleNode = node.getElementsByTagName('ele')[0];
                const ele = eleNode && eleNode.textContent ? parseFloat(eleNode.textContent) : null;

                const timeNode = node.getElementsByTagName('time')[0];
                const time = timeNode && timeNode.textContent ? timeNode.textContent : '';

                trackpoints.push({
                    global_index: globalIndex++,
                    segment_index: s,
                    local_index: p,
                    lat,
                    lon,
                    ele,
                    time
                });
            }
        }
    }
    return trackpoints;
}

module.exports = {
    extractTrackPointsWithIndices
};

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

/**
 * Parse a GPX XML string into a DOM Document.
 */
function parseGpx(xmlString) {
    let errorOccurred = false;
    let errorMessage = '';

    const parser = new DOMParser({
        locator: {},
        onError: (level, msg) => {
            if (level === 'error' || level === 'fatalError') {
                errorOccurred = true;
                errorMessage = msg;
            } else if (level === 'warn' || level === 'warning') {
                console.warn('XML Warning:', msg);
            }
        }
    });
    const doc = parser.parseFromString(xmlString, 'text/xml');

    if (errorOccurred) {
        throw new Error('XML Error: ' + errorMessage);
    }

    // xmldom may return a document containing parsererror node even if errorHandler wasn't called in some cases
    const parseError = doc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
        throw new Error('XML Error: ' + parseError[0].textContent);
    }

    return doc;
}

/**
 * Serialize a DOM Document back to a GPX XML string.
 */
function serializeGpx(doc) {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
}

/**
 * Extract all track points from a GPX document.
 */
function extractTrackPoints(doc) {
    const points = [];
    const trkptNodes = doc.getElementsByTagName('trkpt');
    for (let i = 0; i < trkptNodes.length; i++) {
        const node = trkptNodes[i];
        const lat = parseFloat(node.getAttribute('lat'));
        const lon = parseFloat(node.getAttribute('lon'));

        const eleNode = node.getElementsByTagName('ele')[0];
        const hasEle = !!eleNode;
        const ele = (eleNode && eleNode.textContent !== undefined && eleNode.textContent !== null)
                    ? parseFloat(eleNode.textContent)
                    : undefined;

        const timeNode = node.getElementsByTagName('time')[0];
        const time = timeNode && timeNode.textContent ? timeNode.textContent : '';

        points.push({ lat, lon, hasEle, ele, time });
    }
    return points;
}

/**
 * Extract the first track name from a GPX document.
 */
function extractTrackName(doc) {
    const trkNodes = doc.getElementsByTagName('trk');
    if (trkNodes.length > 0) {
        const nameNode = trkNodes[0].getElementsByTagName('name')[0];
        if (nameNode && nameNode.textContent) {
            return nameNode.textContent;
        }
    }
    return '';
}

/**
 * Create a new way point element and append it before the first <trk> node.
 */
function appendWaypoint(doc, { lat, lon, ele, name, desc, sym }) {
    const wpt = doc.createElement('wpt');
    wpt.setAttribute('lat', lat.toString());
    wpt.setAttribute('lon', lon.toString());

    if (ele !== undefined && !isNaN(ele)) {
        const eleNode = doc.createElement('ele');
        eleNode.textContent = ele.toString();
        wpt.appendChild(eleNode);
    }

    if (name) {
        const nameNode = doc.createElement('name');
        nameNode.textContent = name;
        wpt.appendChild(nameNode);
    }

    if (desc) {
        const descNode = doc.createElement('desc');
        descNode.textContent = desc;
        wpt.appendChild(descNode);
    }

    if (sym) {
        const symNode = doc.createElement('sym');
        symNode.textContent = sym;
        wpt.appendChild(symNode);
    }

    // Insert before the first <trk> element, or at the end of the root <gpx> element
    const gpxNode = doc.documentElement;
    const trkNodes = doc.getElementsByTagName('trk');

    if (trkNodes.length > 0) {
        gpxNode.insertBefore(wpt, trkNodes[0]);
        // Also insert a newline for formatting
        const textNode = doc.createTextNode('\n  ');
        gpxNode.insertBefore(textNode, trkNodes[0]);
    } else {
        gpxNode.appendChild(wpt);
        const textNode = doc.createTextNode('\n');
        gpxNode.appendChild(textNode);
    }
}

/**
 * Extract all <trk> elements from a GPX document.
 */
function extractTrkElements(doc) {
    const trks = [];
    const trkNodes = doc.getElementsByTagName('trk');
    for (let i = 0; i < trkNodes.length; i++) {
        trks.push(trkNodes[i]);
    }
    return trks;
}

module.exports = {
    parseGpx,
    serializeGpx,
    extractTrackPoints,
    extractTrackName,
    appendWaypoint,
    extractTrkElements
};

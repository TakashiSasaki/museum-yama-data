const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Helper to calculate distance between two coordinates to handle slight float precision differences
function distanceSq(lat1, lon1, lat2, lon2) {
    return Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2);
}

// Function to find the closest geocoded point within a very small tolerance
function findMatchingPoint(lat, lon, geocodedPoints) {
    let closestMatch = null;
    let minDistance = 0.00000001; // extremely small tolerance (~1 meter)

    for (const pt of geocodedPoints) {
        const d = distanceSq(parseFloat(lat), parseFloat(lon), pt.lat, pt.lon);
        if (d < minDistance) {
            minDistance = d;
            closestMatch = pt;
        }
    }
    return closestMatch;
}

// Main execution function
async function main() {
    const args = process.argv.slice(2);
    let gpxInput = null;
    let jsonDir = null;
    let gpxOutput = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--gpx' && i + 1 < args.length) gpxInput = args[++i];
        else if (args[i] === '--json-dir' && i + 1 < args.length) jsonDir = args[++i];
        else if (args[i] === '--out' && i + 1 < args.length) gpxOutput = args[++i];
    }

    if (!gpxInput || !jsonDir || !gpxOutput) {
        console.error("Usage: node merge_address.js --gpx <input.gpx> --json-dir <reverse_geocoding_dir> --out <output.gpx>");
        process.exit(1);
    }

    console.log(`Input GPX: ${gpxInput}`);
    console.log(`JSON Dir: ${jsonDir}`);
    console.log(`Output GPX: ${gpxOutput}`);

    // Load and merge all JSON files
    let allGeocodedPoints = [];
    const files = fs.readdirSync(jsonDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const content = fs.readFileSync(path.join(jsonDir, file), 'utf8');
            try {
                const points = JSON.parse(content);
                allGeocodedPoints = allGeocodedPoints.concat(points);
            } catch (e) {
                console.error(`Error parsing JSON file ${file}:`, e.message);
            }
        }
    }
    console.log(`Loaded ${allGeocodedPoints.length} geocoded points.`);

    // Load GPX
    const gpxContent = fs.readFileSync(gpxInput, 'utf8');
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ renderOpts: { pretty: true, indent: '  ', newline: '\n' } });

    try {
        const gpxObj = await parser.parseStringPromise(gpxContent);

        // Add namespace for extensions
        if (!gpxObj.gpx['$']['xmlns:address']) {
            gpxObj.gpx['$']['xmlns:address'] = "http://example.com/address";
        }

        let updatedCount = 0;

        if (gpxObj.gpx.wpt) {
            for (let wpt of gpxObj.gpx.wpt) {
                const lat = wpt['$'].lat;
                const lon = wpt['$'].lon;

                const match = findMatchingPoint(lat, lon, allGeocodedPoints);
                if (match && match.geocode && match.geocode.ja) {
                    const ja = match.geocode.ja;

                    // Build address string
                    const addrParts = [];
                    if (ja.prefecture) addrParts.push(ja.prefecture);
                    if (ja.county) addrParts.push(ja.county);
                    if (ja.city) addrParts.push(ja.city);
                    if (ja.local) addrParts.push(ja.local);
                    const addrStr = addrParts.join('');

                    // Update description
                    if (wpt.desc && wpt.desc.length > 0) {
                        wpt.desc[0] = wpt.desc[0] + `\n[Address] ${addrStr}`;
                    } else {
                        wpt.desc = [`[Address] ${addrStr}`];
                    }

                    // Update extensions
                    if (!wpt.extensions) {
                        wpt.extensions = [{}];
                    }
                    if (!wpt.extensions[0]) {
                        wpt.extensions[0] = {};
                    }

                    if (ja.prefecture) wpt.extensions[0]['address:prefecture'] = [ja.prefecture];
                    if (ja.county) wpt.extensions[0]['address:county'] = [ja.county];
                    if (ja.city) wpt.extensions[0]['address:city'] = [ja.city];
                    if (ja.local) wpt.extensions[0]['address:local'] = [ja.local];

                    updatedCount++;
                }
            }
        }

        const newGpxXml = builder.buildObject(gpxObj);
        fs.writeFileSync(gpxOutput, newGpxXml, 'utf8');
        console.log(`Successfully updated ${updatedCount} waypoints.`);
        console.log(`Saved new GPX to ${gpxOutput}`);

    } catch (err) {
        console.error("Error processing GPX file:", err);
        process.exit(1);
    }
}

main();

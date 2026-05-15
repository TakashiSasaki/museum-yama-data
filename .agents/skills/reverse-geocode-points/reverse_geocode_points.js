const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse command-line arguments
const args = process.argv.slice(2);
let inputPaths = [];
let outArg = null;
    let originalOutArg = null;
let limit = 100;
let allTrkpt = false;
let requestInterval = 2500; // default 2.5s

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') {
        i++;
        while (i < args.length && !args[i].startsWith('--')) {
            inputPaths.push(path.resolve(process.cwd(), args[i]));
            i++;
        }
        i--; // Adjust index back to process the next flag correctly
    } else if (args[i] === '--out' && i + 1 < args.length) {
        originalOutArg = args[i + 1];
        outArg = path.resolve(process.cwd(), originalOutArg);
        i++;
    } else if (args[i] === '--limit' && i + 1 < args.length) {
        limit = parseInt(args[i + 1], 10);
        i++;
    } else if (args[i] === '--all-trkpt') {
        allTrkpt = true;
    } else if (args[i] === '--interval' && i + 1 < args.length) {
        requestInterval = parseInt(args[i + 1], 10);
        i++;
    }
}

if (requestInterval < 1000) {
    console.error("Error: --interval cannot be less than 1000ms (1 second) due to server guidelines.");
    process.exit(1);
}

if (inputPaths.length === 0 || !outArg) {
    console.error("Usage: node reverse_geocode_points.js --input <path1> [<path2> ...] --out <output_path> [--limit <num>] [--all-trkpt] [--interval <ms>]");
    process.exit(1);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseWpt(xmlStr, filename) {
    const points = [];
    const regex = /<wpt lat="([^"]+)" lon="([^"]+)">/g;
    let match;
    while ((match = regex.exec(xmlStr)) !== null) {
        points.push({
            type: 'waypoint',
            source_file: filename,
            lat: parseFloat(match[1]),
            lon: parseFloat(match[2])
        });
    }
    return points;
}

function parseTrkpt(xmlStr, filename, allTrkpt) {
    const regex = /<trkpt lat="([^"]+)" lon="([^"]+)">/g;
    let match;
    const pts = [];
    while ((match = regex.exec(xmlStr)) !== null) {
        pts.push({
            lat: parseFloat(match[1]),
            lon: parseFloat(match[2])
        });
    }
    const results = [];
    if (pts.length > 0) {
        if (allTrkpt) {
            pts.forEach(pt => {
                results.push({
                    type: 'trackpoint',
                    source_file: filename,
                    lat: pt.lat,
                    lon: pt.lon
                });
            });
        } else {
            results.push({
                type: 'trackpoint_start',
                source_file: filename,
                lat: pts[0].lat,
                lon: pts[0].lon
            });
            results.push({
                type: 'trackpoint_end',
                source_file: filename,
                lat: pts[pts.length - 1].lat,
                lon: pts[pts.length - 1].lon
            });
        }
    }
    return results;
}

function fetchGeocode(lat, lon, lang) {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1&accept-language=${lang}`;
        const options = {
            headers: { 'User-Agent': 'YamaMuseumGeocodingAgent/1.0' }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            resolve(null);
        });
    });
}

function extractAddressInfo(address) {
    if (!address) return { prefecture: "", county: "", city: "", local: "" };

    const prefecture = address.province || address.state || "";
    const county = address.county || "";
    const city = address.city || address.town || address.village || "";
    const local = address.suburb || address.quarter || address.neighbourhood || address.road || address.local || address.hamlet || address.city_district || "";

    return { prefecture, county, city, local };
}

async function main() {
    console.log("Reading data...");
    let points = [];
    const gpxFiles = [];

    for (const inputPath of inputPaths) {
        if (!fs.existsSync(inputPath)) {
            console.error(`Error: The specified input path does not exist: ${inputPath}`);
            process.exit(1);
        }

        const stats = fs.statSync(inputPath);
        if (stats.isDirectory()) {
            const files = fs.readdirSync(inputPath);
            for (const file of files) {
                if (file.toLowerCase().endsWith('.gpx')) {
                    const fullPath = path.join(inputPath, file);
                    if (fs.statSync(fullPath).isFile()) {
                        gpxFiles.push(fullPath);
                    }
                }
            }
        } else if (stats.isFile() && inputPath.toLowerCase().endsWith('.gpx')) {
            gpxFiles.push(inputPath);
        } else {
            console.warn(`Warning: Skipping non-GPX file: ${inputPath}`);
        }
    }

    if (gpxFiles.length === 0) {
        console.error("Error: No GPX files found in the specified input paths.");
        process.exit(1);
    }

    for (const file of gpxFiles) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const filename = path.basename(file);
            points = points.concat(parseWpt(content, filename));
            points = points.concat(parseTrkpt(content, filename, allTrkpt));
        } catch (err) {
            console.error(`Error reading file ${file}:`, err.message);
        }
    }

    console.log(`Total points collected: ${points.length}`);

    // Load existing results based on whether outArg is a directory or file
    let results = [];
    const processedSet = new Set();
    let outputFile = outArg;

    const isDirectoryIntent = originalOutArg.endsWith('/') || originalOutArg.endsWith('\\') || (fs.existsSync(outArg) && fs.statSync(outArg).isDirectory());

    if (isDirectoryIntent) {
        if (!fs.existsSync(outArg)) {
            console.error(`Error: Output directory does not exist: ${outArg}`);
            process.exit(1);
        }
        const files = fs.readdirSync(outArg);
        for (const file of files) {
            if (file.toLowerCase().endsWith('.json')) {
                try {
                    const existingContent = fs.readFileSync(path.join(outArg, file), 'utf-8');
                    const json = JSON.parse(existingContent);
                    for (const pt of json) {
                        processedSet.add(`${pt.lat},${pt.lon}`);
                    }
                } catch (e) {
                    console.warn(`Warning: Could not parse existing output file ${file}.`);
                }
            }
        }
        console.log(`Loaded existing results from directory. Previously processed unique points: ${processedSet.size}.`);

        // Output to a new timestamped file in the directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputFile = path.join(outArg, `geocoded_points_${timestamp}.json`);
        results = []; // Ensure results are empty when outputting to a directory so we only save new points
    } else {
        if (fs.existsSync(outArg)) {
            try {
                const existingContent = fs.readFileSync(outArg, 'utf-8');
                results = JSON.parse(existingContent);
                for (const pt of results) {
                    processedSet.add(`${pt.lat},${pt.lon}`);
                }
                console.log(`Loaded ${results.length} existing results from ${outArg}. Previously processed unique points: ${processedSet.size}.`);
            } catch (e) {
                console.warn(`Warning: Could not parse existing output file ${outArg}, starting fresh.`);
            }
        }
    }

    const targetPoints = [];
    for (const pt of points) {
        if (!processedSet.has(`${pt.lat},${pt.lon}`)) {
            targetPoints.push(pt);
            processedSet.add(`${pt.lat},${pt.lon}`); // Prevent duplicates within the targetPoints array itself
        }
        if (targetPoints.length >= limit) {
            break;
        }
    }

    console.log(`Geocoding ${targetPoints.length} new points...`);

    for (let i = 0; i < targetPoints.length; i++) {
        const pt = targetPoints[i];
        console.log(`[${i+1}/${targetPoints.length}] Geocoding ${pt.type} at ${pt.lat}, ${pt.lon} (Source: ${pt.source_file})`);

        let geocode = null;
        try {
            const resJa = await fetchGeocode(pt.lat, pt.lon, 'ja');
            await sleep(requestInterval);

            const resEn = await fetchGeocode(pt.lat, pt.lon, 'en');
            await sleep(requestInterval);

            if (resJa && resEn && !resJa.error && !resEn.error) {
                geocode = {
                    ja: extractAddressInfo(resJa.address),
                    en: extractAddressInfo(resEn.address)
                };
            }
        } catch (e) {
            console.error(`Error geocoding point ${i}:`, e.message);
        }

        results.push({
            type: pt.type,
            source_file: pt.source_file,
            lat: pt.lat,
            lon: pt.lon,
            geocode: geocode
        });

        // Save progressively
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    }

    console.log(`Done! Results saved to ${outputFile}`);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});

const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse command-line arguments
const args = process.argv.slice(2);
let summitsFile = null;
let rawDir = null;
let outputFile = null;
let skip = 0;
let limit = 100;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--summits' && i + 1 < args.length) {
        summitsFile = path.resolve(process.cwd(), args[i + 1]);
        i++;
    } else if (args[i] === '--raw-dir' && i + 1 < args.length) {
        rawDir = path.resolve(process.cwd(), args[i + 1]);
        i++;
    } else if (args[i] === '--out' && i + 1 < args.length) {
        outputFile = path.resolve(process.cwd(), args[i + 1]);
        i++;
    } else if (args[i] === '--skip' && i + 1 < args.length) {
        skip = parseInt(args[i + 1], 10);
        if (!Number.isInteger(skip) || skip < 0) {
            console.error("Invalid value for --skip. Expected a non-negative integer.");
            process.exit(1);
        }
        i++;
    } else if (args[i] === '--limit' && i + 1 < args.length) {
        limit = parseInt(args[i + 1], 10);
        if (!Number.isInteger(limit) || limit <= 0) {
            console.error("Invalid value for --limit. Expected a positive integer.");
            process.exit(1);
        }
        i++;
    }
}

if (!summitsFile || !rawDir || !outputFile) {
    console.error("Usage: node geocode_points.js --summits <path_to_summits_gpx> --raw-dir <path_to_raw_gpx_dir> --out <path_to_output_json> [--skip <skip_count>] [--limit <limit_count>]");
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
            type: 'peak',
            source_file: filename,
            lat: parseFloat(match[1]),
            lon: parseFloat(match[2])
        });
    }
    return points;
}

function parseTrkpt(xmlStr, filename) {
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
        results.push({
            type: 'start_point',
            source_file: filename,
            lat: pts[0].lat,
            lon: pts[0].lon
        });
        results.push({
            type: 'end_point',
            source_file: filename,
            lat: pts[pts.length - 1].lat,
            lon: pts[pts.length - 1].lon
        });
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

    // 1. Read peaks
    if (fs.existsSync(summitsFile)) {
        const content = fs.readFileSync(summitsFile, 'utf-8');
        points = points.concat(parseWpt(content, path.basename(summitsFile)));
    } else {
        console.warn(`Warning: Summits file not found at ${summitsFile}`);
    }

    // 2. Read start/end points
    if (fs.existsSync(rawDir)) {
        const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.gpx'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(rawDir, file), 'utf-8');
            points = points.concat(parseTrkpt(content, file));
        }
    } else {
        console.warn(`Warning: Raw GPX directory not found at ${rawDir}`);
    }

    console.log(`Total points collected: ${points.length}`);
    const targetPoints = points.slice(skip, skip + limit);
    console.log(`Geocoding ${targetPoints.length} points (skipping ${skip})...`);

    // Load existing results if output file exists
    let results = [];
    if (fs.existsSync(outputFile)) {
        try {
            const existingContent = fs.readFileSync(outputFile, 'utf-8');
            results = JSON.parse(existingContent);
            console.log(`Loaded ${results.length} existing results from ${outputFile}`);
        } catch (e) {
            console.warn(`Warning: Could not parse existing output file ${outputFile}, starting fresh.`);
        }
    }

    for (let i = 0; i < targetPoints.length; i++) {
        const pt = targetPoints[i];
        console.log(`[${i+1}/${targetPoints.length}] Geocoding ${pt.type} at ${pt.lat}, ${pt.lon} (Source: ${pt.source_file})`);

        let geocode = null;
        try {
            const resJa = await fetchGeocode(pt.lat, pt.lon, 'ja');
            await sleep(3500); // Wait > 3 seconds

            const resEn = await fetchGeocode(pt.lat, pt.lon, 'en');
            await sleep(3500); // Wait > 3 seconds

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
    }

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Done! Results saved to ${outputFile}`);
}

main().catch(console.error);

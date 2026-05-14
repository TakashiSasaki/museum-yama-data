const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
let outputFile = 'all_unique_summits.gpx';
const inputPaths = [];

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
        outputFile = args[++i];
    } else {
        inputPaths.push(args[i]);
    }
}

if (inputPaths.length === 0) {
    console.error("Usage: node merge_summits.js [file_or_dir1] [file_or_dir2] ... [--output result.gpx]");
    process.exit(1);
}

// Recursively gather GPX files
function getGpxFiles(targetPath, fileList = []) {
    if (!fs.existsSync(targetPath)) {
        console.warn(`Warning: Path does not exist: ${targetPath}`);
        return fileList;
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
        const items = fs.readdirSync(targetPath);
        for (const item of items) {
            getGpxFiles(path.join(targetPath, item), fileList);
        }
    } else if (stat.isFile() && targetPath.toLowerCase().endsWith('.gpx')) {
        fileList.push(targetPath);
    }
    return fileList;
}

const gpxFiles = [];
for (const p of inputPaths) {
    getGpxFiles(p, gpxFiles);
}

if (gpxFiles.length === 0) {
    console.error("No GPX files found in the provided paths.");
    process.exit(1);
}

console.log(`Found ${gpxFiles.length} GPX files to process.`);

// Extract all waypoints
const waypoints = [];
const seenCoords = new Set(); // For exact coordinate deduplication first

for (const file of gpxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/<wpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/wpt>/g);
    
    if (matches) {
        for (const wpt of matches) {
            const latMatch = wpt.match(/lat="([^"]+)"/);
            const lonMatch = wpt.match(/lon="([^"]+)"/);
            const eleMatch = wpt.match(/<ele>([\s\S]*?)<\/ele>/);
            const nameMatch = wpt.match(/<name>(.*?)<\/name>/);
            
            if (latMatch && lonMatch && eleMatch && nameMatch) {
                const latStr = latMatch[1];
                const lonStr = lonMatch[1];
                const coord = `${latStr},${lonStr}`;
                
                // Basic deduplication for literally identical coordinates
                if (!seenCoords.has(coord)) {
                    seenCoords.add(coord);
                    waypoints.push({
                        lat: parseFloat(latStr),
                        lon: parseFloat(lonStr),
                        ele: parseFloat(eleMatch[1]),
                        name: nameMatch[1],
                        raw: wpt
                    });
                }
            }
        }
    }
}

console.log(`Extracted ${waypoints.length} initial unique-coordinate waypoints.`);

// Distance calculation using Haversine formula
function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}

// Sort by elevation descending (highest first)
waypoints.sort((a, b) => b.ele - a.ele);

const finalWaypoints = [];
let mergedCount = 0;

for (const w of waypoints) {
    let duplicateOf = null;
    for (const fw of finalWaypoints) {
        if (getDist(w.lat, w.lon, fw.lat, fw.lon) < 50) {
            duplicateOf = fw;
            break;
        }
    }
    
    if (!duplicateOf) {
        finalWaypoints.push(w);
    } else {
        mergedCount++;
        // If discarded point has a proper name and kept point has a generic 'Peak' name, transfer it
        if (duplicateOf.name.startsWith('Peak (') && !w.name.startsWith('Peak (')) {
            console.log(`Transferred proper name "${w.name}" to higher peak (${Math.round(duplicateOf.ele)}m)`);
            duplicateOf.name = w.name;
            duplicateOf.raw = duplicateOf.raw.replace(/<name>.*?<\/name>/, `<name>${w.name}</name>`);
        }
    }
}

let outXml = `<?xml version='1.0' encoding='UTF-8'?>\n<gpx version="1.1" creator="Merge Summits Skill" xmlns="http://www.topografix.com/GPX/1/1">\n`;
for (const w of finalWaypoints) {
    outXml += `  ${w.raw}\n`;
}
outXml += `</gpx>\n`;

fs.writeFileSync(outputFile, outXml);

console.log(`Merged ${mergedCount} proximity duplicates.`);
console.log(`Final unique summits: ${finalWaypoints.length}`);
console.log(`Saved result to ${outputFile}`);

const fs = require('fs');
const path = require('path');

const GPX_DIR = path.resolve(__dirname, '../../../gpx');
const MERGED_DIR = path.join(GPX_DIR, 'merged');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function mergeGpxByYear() {
    console.log('Starting GPX merge by year...');
    ensureDir(MERGED_DIR);

    const files = fs.readdirSync(GPX_DIR).filter(f => f.toLowerCase().endsWith('.gpx'));
    const groups = {};

    files.forEach(file => {
        // Extract year from filename like yamap_2024-06-16...
        const match = file.match(/(\d{4})-\d{2}-\d{2}/);
        if (match) {
            const year = match[1];
            if (!groups[year]) groups[year] = [];
            groups[year].push(file);
        }
    });

    for (const year in groups) {
        console.log(`Merging ${groups[year].length} tracks for year ${year}...`);
        
        let mergedContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Yama Museum Merge Skill" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Merged Tracks ${year}</name>
  </metadata>`;

        groups[year].forEach(file => {
            const content = fs.readFileSync(path.join(GPX_DIR, file), 'utf8');
            // Extract everything between <trk> and </trk>
            const trkMatch = content.match(/<trk>([\s\S]*?)<\/trk>/);
            if (trkMatch) {
                mergedContent += `\n  <trk>${trkMatch[1]}</trk>`;
            }
        });

        mergedContent += '\n</gpx>';
        const outputPath = path.join(MERGED_DIR, `${year}_merged.gpx`);
        fs.writeFileSync(outputPath, mergedContent, 'utf8');
        console.log(`Saved merged file: ${outputPath}`);
    }

    console.log('GPX merge completed.');
}

mergeGpxByYear();

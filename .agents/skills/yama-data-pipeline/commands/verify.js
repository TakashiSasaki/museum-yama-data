const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const { parseGpx, extractTrackName } = require('../lib/gpx');

module.exports = async function verify(options) {
    if (!options.root) {
        throw new Error('verify requires a --root option');
    }

    const ROOT_DIR = path.resolve(options.root);
    const ANNOTATED_DIR = path.join(ROOT_DIR, 'gpx', 'annotated');
    const YAMAP_DIR = path.join(ROOT_DIR, 'yamap');

    log.info(`Verifying GPX to YAMAP record consistency in: ${ROOT_DIR}`);

    // Check directory existence gracefully
    if (!fs.existsSync(ANNOTATED_DIR)) {
        log.error(`[Required directory missing] GPX annotated directory does not exist: ${ANNOTATED_DIR}`);
        return;
    }

    if (!fs.existsSync(YAMAP_DIR)) {
        log.error(`[Required directory missing] YAMAP directory does not exist: ${YAMAP_DIR}`);
        return;
    }

    // Parse all YAMAP MD files
    const yamapFiles = fs.readdirSync(YAMAP_DIR).filter(f => f.toLowerCase().endsWith('.md'));
    const yamapRecords = [];

    for (const file of yamapFiles) {
        const id = file.slice(0, -3); // Strip .md
        try {
            const content = fs.readFileSync(path.join(YAMAP_DIR, file), 'utf8');
            const titleMatch = content.match(/- \*\*Title\*\*: (.*)/);
            // Accommodate multiple date formats if present
            const dateMatch = content.match(/- \*\*Date\*\*: (\d{4})[年\/\-.](\d{1,2})[年\/月\/\-.](\d{1,2})[日]?/);
            
            if (titleMatch && dateMatch) {
                const title = titleMatch[1].trim();
                const yyyy = dateMatch[1];
                const mm = dateMatch[2].padStart(2, '0');
                const dd = dateMatch[3].padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                yamapRecords.push({ id, title, date: dateStr });
            }
        } catch (err) {
            log.error(`Failed to parse YAMAP markdown file ${file}: ${err.message}`);
        }
    }

    // Parse GPX files and try to match
    const gpxFiles = fs.readdirSync(ANNOTATED_DIR).filter(f => f.toLowerCase().endsWith('.gpx'));

    let matchedCount = 0;
    const unmatched = [];

    for (const file of gpxFiles) {
        try {
            const content = fs.readFileSync(path.join(ANNOTATED_DIR, file), 'utf8');
            const doc = parseGpx(content);
            
            // Extract Track Name
            let trackName = extractTrackName(doc) || '';
            trackName = trackName.trim();
            
            // Extract Date from <time> tag
            let gpxDate = '';
            const timeNodes = doc.getElementsByTagName('time');
            if (timeNodes.length > 0) {
                const timeStr = timeNodes[0].textContent;
                const dateObj = new Date(timeStr);
                if (!isNaN(dateObj.getTime())) {
                    // Adjust for JST (+9 hours)
                    dateObj.setHours(dateObj.getHours() + 9);
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    gpxDate = `${yyyy}-${mm}-${dd}`;
                }
            }
            
            // Fallback to parsing filename, e.g., yamap_2022-01-15_08_17.gpx
            if (!gpxDate) {
                const fileDateMatch = file.match(/yamap_(\d{4}-\d{2}-\d{2})/);
                if (fileDateMatch) {
                    gpxDate = fileDateMatch[1];
                }
            }
            
            // 1. Exact Match (Date + Name)
            let match = yamapRecords.find(r => r.date === gpxDate && r.title === trackName);
            
            // 2. Fallback Match (Date + Partial Name)
            if (!match) {
                match = yamapRecords.find(r => r.date === gpxDate && (r.title.includes(trackName) || trackName.includes(r.title)));
            }
            
            // 3. Last Resort Fallback Match (Date only - if there's exactly one activity on this date)
            if (!match) {
                const dateMatches = yamapRecords.filter(r => r.date === gpxDate);
                if (dateMatches.length === 1) {
                    match = dateMatches[0];
                }
            }
            
            if (match) {
                matchedCount++;
            } else {
                unmatched.push({ file, trackName, gpxDate });
            }
        } catch (err) {
            log.error(`Failed to parse or match GPX file ${file}: ${err.message}`);
            unmatched.push({ file, trackName: 'XML_ERROR', gpxDate: 'XML_ERROR' });
        }
    }

    log.info(`Successfully matched: ${matchedCount} / ${gpxFiles.length}`);
    if (unmatched.length > 0) {
        log.warn(`Unmatched GPX files (${unmatched.length}):`);
        unmatched.forEach(u => {
            console.log(`- ${u.file} (Date: ${u.gpxDate}, Name: ${u.trackName})`);
        });
    } else {
        log.info('All GPX files successfully matched YAMAP records.');
    }
};

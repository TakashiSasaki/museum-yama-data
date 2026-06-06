const { parseCSV } = require('./csv');

/**
 * Normalizes mountain source rows from CSV content into a structured JSON array.
 *
 * @param {string} inputCsvContent - CSV content of No-completed intermediate mountain source rows.
 * @returns {object} { records, summary }
 */
function normalizeMountainSourceJson(inputCsvContent) {
    const rows = parseCSV(inputCsvContent);
    if (rows.length === 0) {
        throw new Error('Input CSV is empty');
    }

    const headers = rows[0];
    const requiredHeaders = [
        'mountain_no',
        'csv_no',
        'source_row_no',
        'mountain_no_source',
        'mountain_no_status',
        '山名',
        'GPS',
        'エントリーコースお勧め山',
        '難易度ランク',
        '標高',
        'YAMAP link',
        '市町村・島'
    ];

    for (const req of requiredHeaders) {
        if (!headers.includes(req)) {
            throw new Error(`Required column missing: "${req}"`);
        }
    }

    // Classify other columns
    const expectedHeadersSet = new Set(requiredHeaders);
    const ignoredColumns = headers.filter(h => !expectedHeadersSet.has(h));

    const normalizedRecords = [];
    const mountainNos = [];

    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
        const rowArr = rows[i];
        if (rowArr.length !== headers.length) {
            throw new Error(`Row ${i + 1} has ${rowArr.length} columns, expected ${headers.length}`);
        }

        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = rowArr[j];
        }

        // 1. mountain_no (integer, required)
        const rawMountainNo = row['mountain_no'];
        if (!rawMountainNo || !/^\d+$/.test(rawMountainNo.trim())) {
            throw new Error(`Invalid or missing mountain_no at row ${i + 1}: "${rawMountainNo}"`);
        }
        const mountain_no = parseInt(rawMountainNo, 10);

        // 2. csv_no (integer or null)
        const rawCsvNo = row['csv_no'];
        const csv_no = (rawCsvNo && /^\d+$/.test(rawCsvNo.trim())) ? parseInt(rawCsvNo, 10) : null;

        // 3. source_row_no (integer)
        const rawSourceRowNo = row['source_row_no'];
        if (!rawSourceRowNo || !/^\d+$/.test(rawSourceRowNo.trim())) {
            throw new Error(`Invalid or missing source_row_no at row ${i + 1}: "${rawSourceRowNo}"`);
        }
        const source_row_no = parseInt(rawSourceRowNo, 10);

        // 4. mountain_no_source
        const mountain_no_source = row['mountain_no_source'].trim();
        if (!['csv_no', 'sequence_fill_after_max_csv_no'].includes(mountain_no_source)) {
            throw new Error(`Unexpected mountain_no_source: "${mountain_no_source}" at row ${i + 1}`);
        }

        // 5. mountain_no_status
        const mountain_no_status = row['mountain_no_status'].trim();
        if (!['authoritative_csv_no', 'provisional_sequence_filled_no'].includes(mountain_no_status)) {
            throw new Error(`Unexpected mountain_no_status: "${mountain_no_status}" at row ${i + 1}`);
        }

        // 6. name (trimmed)
        const name = row['山名'].trim();
        if (!name) {
            throw new Error(`Empty mountain name at row ${i + 1}`);
        }

        // 7. GPS / coordinates
        const gpsStr = row['GPS'].trim();
        let lat = null;
        let lon = null;
        if (gpsStr) {
            const parts = gpsStr.split(',').map(s => s.trim());
            if (parts.length !== 2) {
                throw new Error(`Invalid GPS format: "${gpsStr}" at row ${i + 1}`);
            }
            lat = parseFloat(parts[0]);
            lon = parseFloat(parts[1]);
            if (isNaN(lat) || isNaN(lon)) {
                throw new Error(`Non-numeric GPS values: "${gpsStr}" at row ${i + 1}`);
            }
            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                throw new Error(`GPS coordinates out of bounds: lat=${lat}, lon=${lon} at row ${i + 1}`);
            }
        }
        const coordinates = {
            lat,
            lon,
            source: 'csv_existing_gps',
            raw: gpsStr
        };

        // 8. entry-course recommendation (boolean)
        const entryCourseVal = row['エントリーコースお勧め山'].trim();
        const entry_course_recommended = (entryCourseVal === '〇' || entryCourseVal === '○' || entryCourseVal.toLowerCase() === 'true' || entryCourseVal === '1');

        // 9. difficulty_rank (null, number, or string)
        const diffVal = row['難易度ランク'].trim();
        let difficulty_rank = null;
        if (diffVal) {
            const parsed = Number(diffVal);
            difficulty_rank = isNaN(parsed) ? diffVal : parsed;
        }

        // 10. elevation_m (null or number)
        const eleStr = row['標高'].trim().replace(/,/g, '');
        let elevation_m = null;
        if (eleStr) {
            elevation_m = parseFloat(eleStr);
            if (isNaN(elevation_m)) {
                elevation_m = null;
            }
        }

        // 11. yamap_url (null or string)
        const yamap_url = row['YAMAP link'].trim() || null;

        // 12. Location (municipality/island)
        const locVal = row['市町村・島'].trim();
        let municipality = null;
        let island = null;
        if (locVal) {
            if (locVal.endsWith('島')) {
                island = locVal;
            } else {
                municipality = locVal;
            }
        }
        const location = {
            municipality_or_island: locVal || null,
            municipality,
            island
        };

        normalizedRecords.push({
            mountain_no,
            csv_no,
            source_row_no,
            mountain_no_source,
            mountain_no_status,
            name,
            location,
            coordinates,
            elevation_m,
            difficulty_rank,
            entry_course_recommended,
            yamap_url
        });

        mountainNos.push(mountain_no);
    }

    // Invariant validations
    if (normalizedRecords.length !== 531) {
        throw new Error(`Record count mismatch: expected 531, got ${normalizedRecords.length}`);
    }

    // Unique and contiguous 1..531
    mountainNos.sort((a, b) => a - b);
    for (let idx = 0; idx < mountainNos.length; idx++) {
        const expected = idx + 1;
        if (mountainNos[idx] !== expected) {
            throw new Error(`mountain_no mismatch or duplicate: expected contiguous 1..531, found mismatch at index ${idx} (got ${mountainNos[idx]})`);
        }
    }

    // Counts for summary
    let gps_parsed_count = 0;
    let gps_null_count = 0;
    let entry_course_true_count = 0;
    let entry_course_false_count = 0;
    let difficulty_rank_null_count = 0;
    let yamap_url_present_count = 0;
    let yamap_url_null_count = 0;

    for (const r of normalizedRecords) {
        if (r.coordinates.lat !== null) gps_parsed_count++;
        else gps_null_count++;

        if (r.entry_course_recommended) entry_course_true_count++;
        else entry_course_false_count++;

        if (r.difficulty_rank === null) difficulty_rank_null_count++;

        if (r.yamap_url !== null) yamap_url_present_count++;
        else yamap_url_null_count++;
    }

    return {
        records: normalizedRecords,
        summary: {
            input_rows: rows.length - 1,
            output_records: normalizedRecords.length,
            mountain_no_unique: true,
            mountain_no_expected_set: '1..531',
            gps_parsed_count,
            gps_null_count,
            entry_course_true_count,
            entry_course_false_count,
            difficulty_rank_null_count,
            yamap_url_present_count,
            yamap_url_null_count,
            ignored_source_columns: ignoredColumns
        }
    };
}

module.exports = {
    normalizeMountainSourceJson
};

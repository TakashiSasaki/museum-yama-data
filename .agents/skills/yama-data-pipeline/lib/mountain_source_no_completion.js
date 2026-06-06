const fs = require('fs');
const path = require('path');
const { parseCSV } = require('./csv');
const { getFileSha256 } = require('./sha256');

function escapeCSVField(val) {
    if (val === null || val === undefined) {
        return '';
    }
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function stringifyCSV(headers, dataRows) {
    const headerLine = headers.map(escapeCSVField).join(',');
    const lines = [headerLine];
    for (const row of dataRows) {
        const line = headers.map(h => escapeCSVField(row[h])).join(',');
        lines.push(line);
    }
    return lines.join('\n') + '\n';
}

function processNoCompletion(inputCsvContent) {
    const rows = parseCSV(inputCsvContent);
    if (rows.length === 0) {
        throw new Error('Input CSV is empty');
    }

    const headers = rows[0];
    const noIndex = headers.indexOf('No');
    const gpsIndex = headers.indexOf('GPS');

    if (noIndex === -1) {
        throw new Error('No column missing');
    }
    if (gpsIndex === -1) {
        throw new Error('GPS column missing');
    }

    const dataRows = [];
    for (let i = 1; i < rows.length; i++) {
        const rowArr = rows[i];
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = rowArr[j];
        }
        dataRows.push(obj);
    }

    const totalDataRows = dataRows.length;
    const isRealData = (totalDataRows === 531);

    // Initial inspection of rows with non-empty source No values
    const non_empty = [];
    const blank_rows = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const physical_row_no = i + 2; // header is row 1
        const raw_no = (row['No'] || '').trim();
        if (raw_no) {
            const noVal = Number(raw_no);
            if (!Number.isInteger(noVal)) {
                throw new Error(`non-integer non-empty No: ${raw_no}`);
            }
            non_empty.append ? non_empty.push({ physical_row_no, value: noVal }) : non_empty.push({ physical_row_no, value: noVal });
        } else {
            blank_rows.push(physical_row_no);
        }
    }

    const existing_values = non_empty.map(x => x.value);
    const existing_set = new Set(existing_values);

    if (existing_values.length !== existing_set.size) {
        throw new Error('duplicate existing No');
    }

    const max_existing_no = existing_values.length > 0 ? Math.max(...existing_values) : 0;
    const expected_existing = new Set(Array.from({ length: max_existing_no }, (_, idx) => idx + 1));

    // Existing non-empty source No values must form a contiguous sequence from 1 to max_existing_no
    for (const val of expected_existing) {
        if (!existing_set.has(val)) {
            throw new Error('non-contiguous existing No values');
        }
    }

    // Strict counts for production/real data
    if (isRealData) {
        if (non_empty.length !== 501) {
            throw new Error(`unexpected non-empty No count: expected 501, got ${non_empty.length}`);
        }
        if (blank_rows.length !== 30) {
            throw new Error(`unexpected blank No count: expected 30, got ${blank_rows.length}`);
        }
        if (max_existing_no !== 501) {
            throw new Error(`max_existing_no mismatch: expected 501, got ${max_existing_no}`);
        }
    }

    const completedRows = [];
    let next_no = max_existing_no + 1;

    for (let i = 0; i < dataRows.length; i++) {
        const originalRow = dataRows[i];
        const physical_row_no = i + 2;
        const raw_no = (originalRow['No'] || '').trim();

        const completedRow = { ...originalRow };

        if (raw_no) {
            const parsedNo = parseInt(raw_no, 10);
            completedRow['No'] = parsedNo;
            completedRow['mountain_no'] = parsedNo;
            completedRow['csv_no'] = parsedNo;
            completedRow['source_row_no'] = physical_row_no;
            completedRow['mountain_no_source'] = 'csv_no';
            completedRow['mountain_no_status'] = 'authoritative_csv_no';
        } else {
            const filledNo = next_no++;
            completedRow['No'] = filledNo;
            completedRow['mountain_no'] = filledNo;
            completedRow['csv_no'] = '';
            completedRow['source_row_no'] = physical_row_no;
            completedRow['mountain_no_source'] = 'sequence_fill_after_max_csv_no';
            completedRow['mountain_no_status'] = 'provisional_sequence_filled_no';
        }

        completedRow['gps_raw'] = originalRow['GPS'] || '';
        completedRow['coordinate_source'] = 'csv_existing_gps';
        completedRow['coordinate_status'] = 'csv_provided_unverified';

        completedRows.push(completedRow);
    }

    const final_values = completedRows.map(r => r.mountain_no);
    const final_set = new Set(final_values);

    if (final_values.length !== final_set.size) {
        throw new Error('duplicate completed No / mountain_no after filling');
    }

    // Verify key set is contiguous from 1 to total rows
    const expected_final = new Set(Array.from({ length: totalDataRows }, (_, idx) => idx + 1));
    for (const val of expected_final) {
        if (!final_set.has(val)) {
            throw new Error('final key set mismatch');
        }
    }

    if (isRealData) {
        if (!final_set.has(502)) {
            throw new Error('502 missing after completion');
        }
    }

    const outputHeaders = [
        ...headers,
        'mountain_no',
        'csv_no',
        'source_row_no',
        'mountain_no_source',
        'mountain_no_status',
        'gps_raw',
        'coordinate_source',
        'coordinate_status'
    ];

    const outputCsvContent = stringifyCSV(outputHeaders, completedRows);

    return {
        outputCsvContent,
        summary: {
            input_data_rows: totalDataRows,
            output_data_rows: completedRows.length,
            source_non_empty_no_count: non_empty.length,
            source_blank_no_count: blank_rows.length,
            source_non_empty_no_range: `1..${max_existing_no}`,
            source_non_empty_no_unique: true,
            source_non_empty_no_contiguous_from_1: true,
            max_existing_no,
            blank_no_fill_rule: 'sequence_fill_after_max_csv_no',
            blank_no_fill_values: blank_rows.length > 0 ? `${max_existing_no + 1}..${max_existing_no + blank_rows.length}` : '',
            completed_mountain_no_count: completedRows.length,
            completed_mountain_no_unique: true,
            completed_key_set: `1..${completedRows.length}`,
            has_502_after_completion: final_set.has(502),
            gps_column_preserved: true,
            gps_raw_column_written: true,
            source_files_modified: false
        }
    };
}

module.exports = {
    processNoCompletion,
    stringifyCSV,
    escapeCSVField
};

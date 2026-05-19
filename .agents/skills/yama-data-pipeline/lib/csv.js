/**
 * CSV Parsing Utilities
 */

/**
 * Parses a full CSV string into an array of arrays (rows of columns).
 * Handles quoted fields, escaped quotes (""), commas within quotes,
 * embedded newlines, CRLF, LF, and optional UTF-8 BOM.
 *
 * @param {string} content - The CSV string to parse.
 * @param {object} [options]
 * @param {boolean} [options.strictColumns=false] - When true, throws if any row
 *   has a different number of columns than the header row.
 */
function parseCSV(content, options = {}) {
    const strictColumns = options.strictColumns === true;
    // Remove UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];

        if (ch === '"') {
            if (inQuotes && i + 1 < content.length && content[i + 1] === '"') {
                // Escaped quote ""
                currentField += '"';
                i++; // Skip the next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if (ch === '\n' && !inQuotes) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else if (ch === '\r' && !inQuotes) {
            // Ignore \r if it's immediately followed by \n (handled in the next iteration)
            if (i + 1 < content.length && content[i + 1] === '\n') {
                continue;
            } else {
                // Standalone \r (rare but possible old Mac style)
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            }
        } else {
            currentField += ch;
        }
    }

    // Push the last field and row if there's remaining data
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    // Filter out completely empty rows (e.g. trailing newlines)
    const validRows = rows.filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));

    // Optionally validate consistent column count
    if (strictColumns && validRows.length > 0) {
        const expectedCols = validRows[0].length;
        for (let i = 1; i < validRows.length; i++) {
            if (validRows[i].length !== expectedCols) {
                throw new Error(`CSV format error: Row ${i + 1} has ${validRows[i].length} columns, expected ${expectedCols}`);
            }
        }
    }

    return validRows;
}

module.exports = {
    parseCSV
};

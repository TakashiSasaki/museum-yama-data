/**
 * CSV Parsing Utilities
 */

/**
 * Parses a single line of CSV text into an array of strings.
 * Handles quoted fields, escaped quotes (""), and commas within quotes.
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip the next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

/**
 * Parses a full CSV string into an array of arrays (rows of columns).
 * Handles CRLF, LF, and optional UTF-8 BOM.
 */
function parseCSV(content) {
    // Remove UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    // Split by newlines, handling both \r\n and \n
    const lines = content.split(/\r?\n/);
    const rows = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            rows.push(parseCSVLine(line));
        }
    }

    return rows;
}

module.exports = {
    parseCSVLine,
    parseCSV
};

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const {
    loadMunicipalities,
    lookupPoints,
    DEFAULT_BOUNDARY_TOLERANCE_M,
    STATUS
} = require('../lib/municipality_point_lookup');

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function toDisplayPath(filePath) {
    if (!filePath) return '';
    const rel = path.relative(process.cwd(), path.resolve(filePath));
    return rel.replace(/\\/g, '/');
}

/**
 * Parse JSONL input, extract id/lat/lon using named fields.
 * Returns array of { id, lat, lon } or { id, lat: NaN/null, lon: NaN/null } for invalid records.
 */
function parseJsonlPoints(filePath, idField, latField, lonField) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const points = [];

    for (let i = 0; i < lines.length; i++) {
        let rec;
        try {
            rec = JSON.parse(lines[i]);
        } catch (e) {
            points.push({ id: `line:${i + 1}`, lat: NaN, lon: NaN, _parseError: `JSON parse error: ${e.message}` });
            continue;
        }

        const id = rec[idField] !== undefined ? String(rec[idField]) : `line:${i + 1}`;
        const latRaw = rec[latField];
        const lonRaw = rec[lonField];
        const lat = latRaw !== undefined ? Number(latRaw) : NaN;
        const lon = lonRaw !== undefined ? Number(lonRaw) : NaN;

        points.push({ id, lat, lon });
    }
    return points;
}

/**
 * Parse CSV input, extract id/lat/lon using header field names.
 * Returns array of { id, lat, lon }.
 */
function parseCsvPoints(filePath, idField, latField, lonField) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const idIdx = headers.indexOf(idField);
    const latIdx = headers.indexOf(latField);
    const lonIdx = headers.indexOf(lonField);

    if (idIdx < 0) throw new Error(`CSV missing id field "${idField}" in header`);
    if (latIdx < 0) throw new Error(`CSV missing lat field "${latField}" in header`);
    if (lonIdx < 0) throw new Error(`CSV missing lon field "${lonField}" in header`);

    const points = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const id = cells[idIdx] || `row:${i}`;
        const lat = cells[latIdx] !== undefined ? Number(cells[latIdx]) : NaN;
        const lon = cells[lonIdx] !== undefined ? Number(cells[lonIdx]) : NaN;
        points.push({ id, lat, lon });
    }
    return points;
}

function buildReport(params) {
    const { gitCommit, createdAt, displayIn, displayOut, boundaryToleranceM,
            inputFormat, idField, latField, lonField, summary, totalInput } = params;

    return `# KSJ N03 Ehime Summit Candidate Municipality Lookup Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`lookup-ehime-municipalities-for-points\`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Source GeoJSON (N03) | \`${displayIn.n03Geojson}\` |
| Points Input | \`${displayIn.pointsInput}\` |
| Input Format | \`${inputFormat}\` |

## Parameters

| Parameter | Value |
|---|---|
| Boundary tolerance | \`${boundaryToleranceM} m\` |
| ID field | \`${idField}\` |
| Lat field | \`${latField}\` |
| Lon field | \`${lonField}\` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Municipality Lookup JSONL | \`${displayOut.out}\` |
| Stage Manifest | \`${displayOut.manifest}\` |
| Stage Report | \`${displayOut.report}\` |

## Summary Metrics

| Metric | Count |
|---|---|
| Input point records | \`${totalInput}\` |
| Single municipality | \`${summary.single_municipality}\` |
| Boundary ambiguous | \`${summary.boundary_ambiguous}\` |
| Outside prefecture | \`${summary.outside_prefecture}\` |
| Invalid coordinate | \`${summary.invalid_coordinate}\` |

## Policy Statement on Reverse Geocoding

Reverse-geocoding outputs remain preserved as historical and contextual evidence.
For **municipality-level lookup**, KSJ/N03 polygon lookup is preferred because it is authoritative, offline, and fully reproducible.
Reverse geocoding remains appropriate when street address, place names, roads, facilities, island labels, or other human-readable locality context is required.

## Source Modification Status

- **Source files modified**: \`false\` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Reverse geocoding artifacts deleted or modified**: \`false\`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

## Algorithm Notes

- Point-in-polygon: ray-casting algorithm.
- Point-to-boundary distance: local planar approximation (< 0.1% error at ~33°N for single-municipality scales).
- Boundary tolerance: ${boundaryToleranceM} m. Points within this distance of a polygon boundary are classified as \`boundary_ambiguous\`.
`;
}

/**
 * lookup-ehime-municipalities-for-points command.
 *
 * Performs batch municipality point lookup from a JSONL or CSV input file.
 * Produces output JSONL, manifest.json, and report.md.
 *
 * Does not call any external API.
 * Does not overwrite existing output files.
 */
module.exports = async function lookupEhimeMunicipalitiesForPoints(options) {
    log.info('=== Lookup Ehime Municipalities For Points (Batch) ===');

    const {
        n03Geojson,
        input: inputPath,
        inputFormat = 'jsonl',
        idField = 'id',
        latField = 'lat',
        lonField = 'lon',
        boundaryToleranceM: tolRaw,
        out: outPath,
        manifest: manifestPath,
        report: reportPath
    } = options;

    if (!n03Geojson) throw new Error('Missing required argument: --n03-geojson');
    if (!inputPath) throw new Error('Missing required argument: --input');
    if (!outPath) throw new Error('Missing required argument: --out');
    if (!manifestPath) throw new Error('Missing required argument: --manifest');
    if (!reportPath) throw new Error('Missing required argument: --report');

    const boundaryToleranceM = tolRaw !== undefined ? Number(tolRaw) : DEFAULT_BOUNDARY_TOLERANCE_M;
    if (isNaN(boundaryToleranceM) || boundaryToleranceM < 0) {
        throw new Error(`--boundary-tolerance-m must be a non-negative number, got: ${tolRaw}`);
    }

    const validFormats = ['jsonl', 'csv'];
    if (!validFormats.includes(inputFormat)) {
        throw new Error(`--input-format must be one of: ${validFormats.join(', ')}`);
    }

    // Verify inputs exist
    const absN03 = path.resolve(n03Geojson);
    if (!fs.existsSync(absN03)) throw new Error(`N03 GeoJSON not found: ${n03Geojson}`);
    const absInput = path.resolve(inputPath);
    if (!fs.existsSync(absInput)) throw new Error(`Input file not found: ${inputPath}`);

    // Check output collision
    const absOut = path.resolve(outPath);
    const absManifest = path.resolve(manifestPath);
    const absReport = path.resolve(reportPath);

    for (const [name, p] of [['--out', absOut], ['--manifest', absManifest], ['--report', absReport]]) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: ${name} output already exists at ${p}`);
        }
    }

    log.info(`Loading municipalities from: ${n03Geojson}`);
    const municipalities = loadMunicipalities(n03Geojson);
    log.info(`Loaded ${municipalities.length} Ehime municipalities.`);

    log.info(`Parsing input points from: ${inputPath} (format: ${inputFormat})`);
    let points;
    if (inputFormat === 'jsonl') {
        points = parseJsonlPoints(absInput, idField, latField, lonField);
    } else {
        points = parseCsvPoints(absInput, idField, latField, lonField);
    }
    log.info(`Parsed ${points.length} input point records.`);

    log.info(`Running batch lookup (boundary_tolerance_m=${boundaryToleranceM})...`);
    const results = lookupPoints(municipalities, points, boundaryToleranceM);

    // Compute summary
    const summary = {
        single_municipality: 0,
        boundary_ambiguous: 0,
        outside_prefecture: 0,
        invalid_coordinate: 0
    };
    for (const r of results) {
        if (r.lookup_status in summary) summary[r.lookup_status]++;
    }
    log.info(`Lookup complete. Summary: ${JSON.stringify(summary)}`);

    // Stage to temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-mun-lookup-'));
    log.info(`Staging outputs in: ${tmpDir}`);

    try {
        const stagePaths = {
            out: path.join(tmpDir, 'out.jsonl'),
            manifest: path.join(tmpDir, 'manifest.json'),
            report: path.join(tmpDir, 'report.md')
        };

        // Write output JSONL
        const jsonlContent = results.map(r => JSON.stringify(r)).join('\n') + '\n';
        fs.writeFileSync(stagePaths.out, jsonlContent, 'utf-8');

        // Checksums
        const n03Sha256 = crypto.createHash('sha256').update(fs.readFileSync(absN03)).digest('hex');
        const inputSha256 = crypto.createHash('sha256').update(fs.readFileSync(absInput)).digest('hex');

        const gitCommit = getGitCommitHash();
        const createdAt = new Date().toISOString();

        const displayIn = {
            n03Geojson: toDisplayPath(absN03),
            pointsInput: toDisplayPath(absInput)
        };
        const displayOut = {
            out: toDisplayPath(absOut),
            manifest: toDisplayPath(absManifest),
            report: toDisplayPath(absReport)
        };

        // Write report
        const reportContent = buildReport({
            gitCommit, createdAt, displayIn, displayOut,
            boundaryToleranceM, inputFormat, idField, latField, lonField,
            summary, totalInput: results.length
        });
        fs.writeFileSync(stagePaths.report, reportContent, 'utf-8');

        // Compute output checksums
        const outSha256 = crypto.createHash('sha256').update(fs.readFileSync(stagePaths.out)).digest('hex');
        const reportSha256 = crypto.createHash('sha256').update(fs.readFileSync(stagePaths.report)).digest('hex');

        // Write manifest
        const manifestData = {
            stage: 'lookup_ehime_municipalities_for_points',
            stage_version: '0.1.0',
            created_at: createdAt,
            git_commit: gitCommit,
            inputs: {
                n03_geojson: displayIn.n03Geojson,
                n03_geojson_sha256: n03Sha256,
                points_input: displayIn.pointsInput,
                points_input_sha256: inputSha256
            },
            outputs: [
                {
                    path: displayOut.out,
                    sha256: outSha256,
                    role: 'municipality_point_lookup_jsonl'
                },
                {
                    path: displayOut.report,
                    sha256: reportSha256,
                    role: 'report'
                }
            ],
            parameters: {
                boundary_tolerance_m: boundaryToleranceM,
                input_format: inputFormat,
                id_field: idField,
                lat_field: latField,
                lon_field: lonField
            },
            summary: {
                input_point_records: results.length,
                single_municipality: summary.single_municipality,
                boundary_ambiguous: summary.boundary_ambiguous,
                outside_prefecture: summary.outside_prefecture,
                invalid_coordinate: summary.invalid_coordinate,
                source_files_modified: false
            },
            checksum_algorithm: 'sha256'
        };
        fs.writeFileSync(stagePaths.manifest, JSON.stringify(manifestData, null, 2), 'utf-8');

        // Verify staged files
        const verifyOut = JSON.parse(
            fs.readFileSync(stagePaths.manifest, 'utf-8')
        );
        if (verifyOut.summary.input_point_records !== results.length) {
            throw new Error('Integrity error: manifest input_point_records mismatch');
        }

        // Move files to final locations
        log.info('Writing outputs to final repository locations...');
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        fs.mkdirSync(path.dirname(absManifest), { recursive: true });
        fs.mkdirSync(path.dirname(absReport), { recursive: true });

        fs.renameSync(stagePaths.out, absOut);
        fs.renameSync(stagePaths.manifest, absManifest);
        fs.renameSync(stagePaths.report, absReport);

        log.info(`Output JSONL written to: ${outPath}`);
        log.info(`Manifest written to: ${manifestPath}`);
        log.info(`Report written to: ${reportPath}`);
        log.info('=== lookup-ehime-municipalities-for-points complete ===');

    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

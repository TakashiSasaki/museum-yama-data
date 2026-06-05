'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { loadMunicipalities } = require('../lib/municipality_point_lookup');
const { classifyStability, STABILITY_STATUS } = require('../lib/municipality_stability');

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

function buildReport(params) {
    const { gitCommit, createdAt, displayIn, displayOut, offsetM, boundaryToleranceM,
            stableInteriorThresholdM, summary, totalInput } = params;

    return `# KSJ N03 Ehime Summit Candidate Municipality Stability Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`classify-summit-candidate-municipality-stability\`

## Input Paths

| Input Type | Repository Path |
|---|---|
| Source GeoJSON (N03) | \`${displayIn.n03Geojson}\` |
| Summit Candidates | \`${displayIn.summitCandidates}\` |
| Point Lookup (Stage 15) | \`${displayIn.pointLookup}\` |

## Parameters

| Parameter | Value |
|---|---|
| Offset distance | \`${offsetM} m\` |
| Boundary tolerance | \`${boundaryToleranceM} m\` |
| Stable interior threshold | \`${stableInteriorThresholdM} m\` |

## Output Paths

| Output Type | Repository Path |
|---|---|
| Stability Classification JSONL | \`${displayOut.out}\` |
| Stage Manifest | \`${displayOut.manifest}\` |
| Stage Report | \`${displayOut.report}\` |

## Summary Metrics

| Metric | Count |
|---|---|
| Input candidate records | \`${totalInput}\` |
| Stable interior (\`stable_interior\`) | \`${summary.stable_interior}\` |
| Stable cardinal same (\`stable_cardinal_1km_same\`) | \`${summary.stable_cardinal_1km_same}\` |
| Near boundary (\`near_boundary\`) | \`${summary.near_boundary}\` |
| Offset inconsistent (\`offset_inconsistent\`) | \`${summary.offset_inconsistent}\` |
| Boundary ambiguous (\`boundary_ambiguous\`) | \`${summary.boundary_ambiguous}\` |
| Outside prefecture (\`outside_prefecture\`) | \`${summary.outside_prefecture}\` |
| Invalid coordinate (\`invalid_coordinate\`) | \`${summary.invalid_coordinate}\` |
| All cardinal 1km same | \`${summary.all_cardinal_1km_same}\` |
| Distance stable interior | \`${summary.distance_stable_interior}\` |

## Interpretation Policy

1. **stable_interior**: Center lookup is single municipality, distance to boundary is >= ${stableInteriorThresholdM}m, and all four 1km cardinal offset points map to the same municipality.
2. **stable_cardinal_1km_same**: Center lookup is single municipality, and all four 1km cardinal offset points map to the same municipality, but center distance to boundary is below ${stableInteriorThresholdM}m.
3. **near_boundary**: Center lookup is single municipality, center distance to boundary is below ${stableInteriorThresholdM}m, and at least one offset point maps to a different municipality.
4. **offset_inconsistent**: Center lookup is single municipality, distance to boundary is >= ${stableInteriorThresholdM}m, but at least one offset point maps to a different municipality due to complex boundary shape.
5. **boundary_ambiguous**: Center lookup is within boundary tolerance (${boundaryToleranceM}m) of multiple municipalities.
6. **outside_prefecture**: Center lookup is outside Ehime Prefecture boundaries.
7. **invalid_coordinate**: Coordinates fail range validation.

## Limitations & Geometry Edge Cases

- Offset points are calculated using a local planar approximation:
  - Latitude offset: \`offset_m / 111320\`
  - Longitude offset: \`offset_m / (111320 * cos(lat))\`
- This is accurate within Ehime Prefecture, introducing <0.1% distortion.
- If a summit candidate lies on a narrow peninsula or boundary ridge, it is correctly flagged as \`near_boundary\` or \`offset_inconsistent\`.

## Source Modification Status

- **Source files modified**: \`false\` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified.)
- **Reverse geocoding artifacts deleted or modified**: \`false\`
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.
`;
}

module.exports = async function classifySummitCandidateMunicipalityStability(options) {
    log.info('=== Classify Summit Candidate Municipality Stability ===');

    const {
        n03Geojson,
        summitCandidates,
        pointLookup,
        offsetM: offsetMRaw,
        boundaryToleranceM: boundaryToleranceMRaw,
        stableInteriorThresholdM: stableInteriorThresholdMRaw,
        out: outPath,
        manifest: manifestPath,
        report: reportPath
    } = options;

    if (!n03Geojson) throw new Error('Missing required argument: --n03-geojson');
    if (!summitCandidates) throw new Error('Missing required argument: --summit-candidates');
    if (!pointLookup) throw new Error('Missing required argument: --point-lookup');
    if (!outPath) throw new Error('Missing required argument: --out');
    if (!manifestPath) throw new Error('Missing required argument: --manifest');
    if (!reportPath) throw new Error('Missing required argument: --report');

    const offsetM = offsetMRaw !== undefined ? Number(offsetMRaw) : 1000;
    const boundaryToleranceM = boundaryToleranceMRaw !== undefined ? Number(boundaryToleranceMRaw) : 20;
    const stableInteriorThresholdM = stableInteriorThresholdMRaw !== undefined ? Number(stableInteriorThresholdMRaw) : 1000;

    // Check output collisions
    const absOut = path.resolve(outPath);
    const absManifest = path.resolve(manifestPath);
    const absReport = path.resolve(reportPath);

    for (const [name, p] of [['--out', absOut], ['--manifest', absManifest], ['--report', absReport]]) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: ${name} output already exists at ${p}`);
        }
    }

    // Verify inputs exist
    const absN03 = path.resolve(n03Geojson);
    const absCandidates = path.resolve(summitCandidates);
    const absPointLookup = path.resolve(pointLookup);

    if (!fs.existsSync(absN03)) throw new Error(`N03 GeoJSON not found: ${n03Geojson}`);
    if (!fs.existsSync(absCandidates)) throw new Error(`Summit candidates not found: ${summitCandidates}`);
    if (!fs.existsSync(absPointLookup)) throw new Error(`Point lookup not found: ${pointLookup}`);

    log.info(`Loading municipalities from: ${n03Geojson}`);
    const municipalities = loadMunicipalities(absN03);

    log.info(`Loading point lookup records from: ${pointLookup}`);
    const pointLookupMap = new Map();
    const lookupLines = fs.readFileSync(absPointLookup, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    for (const line of lookupLines) {
        const rec = JSON.parse(line);
        pointLookupMap.set(rec.source_record_id, rec);
    }
    log.info(`Loaded ${pointLookupMap.size} point lookup mappings.`);

    log.info(`Loading summit candidates from: ${summitCandidates}`);
    const candidates = [];
    const candidateLines = fs.readFileSync(absCandidates, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    for (const line of candidateLines) {
        candidates.push(JSON.parse(line));
    }
    log.info(`Loaded ${candidates.length} summit candidates.`);

    log.info('Running stability classification...');
    const results = [];
    const summary = {
        stable_interior: 0,
        stable_cardinal_1km_same: 0,
        near_boundary: 0,
        offset_inconsistent: 0,
        boundary_ambiguous: 0,
        outside_prefecture: 0,
        invalid_coordinate: 0,
        all_cardinal_1km_same: 0,
        distance_stable_interior: 0
    };

    for (const candidate of candidates) {
        const lookupRecord = pointLookupMap.get(candidate.summit_candidate_id);
        const result = classifyStability(municipalities, candidate, lookupRecord, {
            offsetM,
            boundaryToleranceM,
            stableInteriorThresholdM
        });

        results.push(result);

        if (result.municipality_stability in summary) {
            summary[result.municipality_stability]++;
        }
        if (result.all_cardinal_1km_same) summary.all_cardinal_1km_same++;
        if (result.distance_stable_interior) summary.distance_stable_interior++;
    }

    log.info(`Classification complete. Summary: ${JSON.stringify(summary)}`);

    // Stage in temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-mun-stability-'));
    log.info(`Staging outputs in: ${tmpDir}`);

    try {
        const stagePaths = {
            out: path.join(tmpDir, 'out.jsonl'),
            manifest: path.join(tmpDir, 'manifest.json'),
            report: path.join(tmpDir, 'report.md')
        };

        // Write outputs
        const jsonlContent = results.map(r => JSON.stringify(r)).join('\n') + '\n';
        fs.writeFileSync(stagePaths.out, jsonlContent, 'utf-8');

        const displayIn = {
            n03Geojson: toDisplayPath(absN03),
            summitCandidates: toDisplayPath(absCandidates),
            pointLookup: toDisplayPath(absPointLookup)
        };
        const displayOut = {
            out: toDisplayPath(absOut),
            manifest: toDisplayPath(absManifest),
            report: toDisplayPath(absReport)
        };

        const gitCommit = getGitCommitHash();
        const createdAt = new Date().toISOString();

        const reportContent = buildReport({
            gitCommit, createdAt, displayIn, displayOut,
            offsetM, boundaryToleranceM, stableInteriorThresholdM,
            summary, totalInput: results.length
        });
        fs.writeFileSync(stagePaths.report, reportContent, 'utf-8');

        // Checksums
        const n03Sha256 = sha256File(absN03);
        const candidatesSha256 = sha256File(absCandidates);
        const pointLookupSha256 = sha256File(absPointLookup);
        const outSha256 = sha256File(stagePaths.out);
        const reportSha256 = sha256File(stagePaths.report);

        const manifestData = {
            stage: 'classify_summit_candidate_municipality_stability',
            stage_version: '0.1.0',
            created_at: createdAt,
            git_commit: gitCommit,
            inputs: {
                n03_geojson: displayIn.n03Geojson,
                n03_geojson_sha256: n03Sha256,
                summit_candidates: displayIn.summitCandidates,
                summit_candidates_sha256: candidatesSha256,
                point_lookup: displayIn.pointLookup,
                point_lookup_sha256: pointLookupSha256
            },
            outputs: [
                {
                    path: displayOut.out,
                    sha256: outSha256,
                    role: 'municipality_point_lookup_stability_jsonl'
                },
                {
                    path: displayOut.report,
                    sha256: reportSha256,
                    role: 'report'
                }
            ],
            parameters: {
                offset_m: offsetM,
                boundary_tolerance_m: boundaryToleranceM,
                stable_interior_threshold_m: stableInteriorThresholdM
            },
            summary: {
                input_summit_candidate_records: candidates.length,
                input_point_lookup_records: pointLookupMap.size,
                output_stability_records: results.length,
                stable_interior: summary.stable_interior,
                stable_cardinal_1km_same: summary.stable_cardinal_1km_same,
                near_boundary: summary.near_boundary,
                offset_inconsistent: summary.offset_inconsistent,
                boundary_ambiguous: summary.boundary_ambiguous,
                outside_prefecture: summary.outside_prefecture,
                invalid_coordinate: summary.invalid_coordinate,
                all_cardinal_1km_same: summary.all_cardinal_1km_same,
                distance_stable_interior: summary.distance_stable_interior,
                source_files_modified: false
            },
            checksum_algorithm: 'sha256'
        };
        fs.writeFileSync(stagePaths.manifest, JSON.stringify(manifestData, null, 2), 'utf-8');

        // Move to final repository locations
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        fs.mkdirSync(path.dirname(absManifest), { recursive: true });
        fs.mkdirSync(path.dirname(absReport), { recursive: true });

        fs.renameSync(stagePaths.out, absOut);
        fs.renameSync(stagePaths.manifest, absManifest);
        fs.renameSync(stagePaths.report, absReport);

        log.info(`Stability JSONL written to: ${outPath}`);
        log.info(`Manifest written to: ${manifestPath}`);
        log.info(`Report written to: ${reportPath}`);
        log.info('=== Classify Summit Candidate Stability complete ===');

    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

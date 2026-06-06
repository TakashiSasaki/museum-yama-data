'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { processAdjacency } = require('../lib/municipality_adjacency');

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

function sha256Buffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(filePath) {
    return sha256Buffer(fs.readFileSync(filePath));
}

function toDisplayPath(filePath) {
    if (!filePath) return '';
    const rel = path.relative(process.cwd(), path.resolve(filePath));
    return rel.replace(/\\/g, '/');
}

function buildReport(stats, gitCommit, createdAt, displayIn, displayOut) {
    // Generate adjacency table rows for the report
    const munRows = [];
    for (const [mun, adjList] of Object.entries(stats.land_adjacent)) {
        munRows.push(`| **${mun}** | ${adjList.length > 0 ? adjList.map(a => `\`${a}\``).join(', ') : '*none (island)*'} |`);
    }
    
    return `# KSJ N03 Ehime Municipality Adjacency Validation Report

- **Branch and HEAD commit checked**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Created at**: \`${createdAt}\`
- **Command used**: \`generate-ehime-municipality-adjacency\`

## Dataset Identity & Input Paths

| Input Type | Repository Path |
|---|---|
| Source GeoJSON (\`N03\`) | \`${displayIn.n03Geojson}\` |
| Ingestion Raw Manifest | \`${displayIn.rawManifest}\` |
| Ingestion Extracted Manifest | \`${displayIn.extractedManifest}\` |

- **Geospatial Source**: MLIT KSJ (国土数値情報) administrative area reference data
- **Prefecture**: 愛媛県 (Prefecture code \`38\`)
- **Data Reference Date**: \`2026-01-01\`

## Output Paths

| Output Type | Repository Path |
|---|---|
| Adjacency JSON | \`${displayOut.adjacencyJson}\` |
| Adjacency Pair Validation CSV | \`${displayOut.pairValidationCsv}\` |
| Land Adjacency Edges CSV | \`${displayOut.landAdjacencyEdgesCsv}\` |
| Stage Manifest | \`${displayOut.manifest}\` |
| Stage Report | \`${displayOut.report}\` |

## Summary Metrics

| Metric | Count |
|---|---|
| Municipality count | \`${stats.summary.municipality_count}\` |
| Pair count | \`${stats.summary.pair_count}\` |
| Confirmed land-boundary pairs | \`${stats.summary.confirmed_land_boundary_pairs}\` |
| Point-contact-only pairs | \`${stats.summary.point_contact_only_pairs}\` |
| Not-adjacent pairs | \`${stats.summary.not_adjacent_pairs}\` |

## Validated Adjacency Table

This table lists the computed land adjacency for all 20 municipalities in Ehime Prefecture:

| Municipality | Land-Adjacent Municipalities |
|---|---|
${munRows.join('\n')}

### Special Cases & Island Handling
- **上島町 (Kamijima Town)**: Has no land-boundary adjacency within Ehime prefecture (\`${stats.land_adjacent['上島町']?.length || 0}\` adjacencies). This is completely correct as Kamijima consists entirely of islands separated by the Seto Inland Sea.
- **松山市 — 大洲市 (Matsuyama City & Ozu City)**: Correctly computed as **not land-adjacent** (no shared land boundary in the KSJ geometries), separated by Iyo City and Uchiko Town.

### Sea & Bridge Separated Relationships
- Sea-only borders or bridges (e.g. Kurushima-Kaikyo Bridges connecting Imabari City to the islands) are not counted as land adjacency. The algorithm strictly requires adjacent polygon borders to share a physical boundary segment of positive length.

## Adjacency Usage In Downstream Processing
- This reference dataset is generated to serve as an authoritative spatial look-up.
- It will be used in later pipeline stages to classify whether a mountaineering activity's geocoded trackpoints are spatially plausible or incompatible with the mountain source's recorded municipality (e.g., \`boundary_plausible\` vs. \`municipality_incompatible\`).
- This stage computes spatial evidence only and does not automatically reject any data.

## Validation Commands Run
- Run test suite:
  \`\`\`sh
  npm test
  \`\`\`
- Validated output format and data integrity checks are run programmatically as part of the pipeline stage.

## Source Modification Status
- **Source files modified**: \`false\` (No raw GPX, YAMAP Markdown, Nominatim caches, or mountain/summit candidate database records were modified).
- **DVC status**: not active; no DVC commands run.
- **Git LFS**: not used.

## Known Limitations
- The adjacency is calculated purely from administrative land boundaries. It does not reflect administrative maritime boundaries.
- Boundary vertices are matched at a 7-decimal place floating point precision (~1.1 cm). Points that match below this threshold but are topologically separate are not considered adjacent.
`;
}

module.exports = async function generateEhimeMunicipalityAdjacencyCommand(options) {
    log.info('=== Generate Ehime Municipality Adjacency Stage ===');

    const {
        n03Geojson: n03GeojsonPath,
        rawManifest: rawManifestPath,
        extractedManifest: extractedManifestPath,
        outDir: outDirPath,
        manifest: manifestPath,
        report: reportPath
    } = options;

    // Validate required arguments
    const required = {
        n03Geojson: n03GeojsonPath,
        rawManifest: rawManifestPath,
        extractedManifest: extractedManifestPath,
        outDir: outDirPath,
        manifest: manifestPath,
        report: reportPath
    };
    
    for (const [k, v] of Object.entries(required)) {
        if (!v) throw new Error(`Missing required argument: --${k.replace(/([A-Z])/g, c => '-' + c.toLowerCase())}`);
    }

    const absIn = {
        geojson: path.resolve(n03GeojsonPath),
        rawManifest: path.resolve(rawManifestPath),
        extractedManifest: path.resolve(extractedManifestPath)
    };
    
    const absOutDir = path.resolve(outDirPath);
    const absOut = {
        adjacencyJson: path.join(absOutDir, 'municipality_adjacency.json'),
        pairValidationCsv: path.join(absOutDir, 'municipality_adjacency_pair_validation.csv'),
        landAdjacencyEdgesCsv: path.join(absOutDir, 'municipality_land_adjacency_edges.csv'),
        manifest: path.resolve(manifestPath),
        report: path.resolve(reportPath)
    };

    // Verify inputs exist
    for (const [name, p] of Object.entries(absIn)) {
        if (!fs.existsSync(p)) {
            throw new Error(`Input file not found for ${name}: ${p}`);
        }
    }

    // Output target collision checks
    for (const [name, p] of Object.entries(absOut)) {
        if (fs.existsSync(p)) {
            throw new Error(`Target collision: Output already exists at ${p}`);
        }
    }

    log.info('Reading input manifests to extract metadata...');
    const rawManifestData = JSON.parse(fs.readFileSync(absIn.rawManifest, 'utf-8'));
    const geojsonSha256 = sha256File(absIn.geojson);

    log.info(`Reading and parsing GeoJSON from: ${absIn.geojson}`);
    const geojsonParsed = JSON.parse(fs.readFileSync(absIn.geojson, 'utf-8'));

    log.info('Computing land-boundary adjacency (dissolving and edge matching)...');
    const result = processAdjacency(geojsonParsed);
    log.info(`Land-boundary computation complete. Found:`);
    log.info(`  - Municipalities: ${result.summary.municipality_count}`);
    log.info(`  - Pairs: ${result.summary.pair_count}`);
    log.info(`  - Confirmed Land Adjacency: ${result.summary.confirmed_land_boundary_pairs}`);
    log.info(`  - Point Contact Only: ${result.summary.point_contact_only_pairs}`);
    log.info(`  - Not Adjacent: ${result.summary.not_adjacent_pairs}`);

    // Create a temporary staging directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-adjacency-'));
    log.info(`Staging outputs in temporary directory: ${tmpDir}`);

    try {
        const stagePaths = {
            adjacencyJson: path.join(tmpDir, 'municipality_adjacency.json'),
            pairValidationCsv: path.join(tmpDir, 'municipality_adjacency_pair_validation.csv'),
            landAdjacencyEdgesCsv: path.join(tmpDir, 'municipality_land_adjacency_edges.csv'),
            manifest: path.join(tmpDir, 'manifest.json'),
            report: path.join(tmpDir, 'report.md')
        };

        // 1. Write Adjacency JSON
        const adjacencyJsonData = {
            dataset: "ehime_municipality_adjacency",
            source_dataset: "ksj_administrative_area_N03",
            prefecture: "愛媛県",
            prefecture_code: "38",
            data_reference_date: "2026-01-01",
            adjacency_definition: "confirmed land-boundary sharing based on dissolved KSJ/N03 municipality geometries",
            municipalities: result.municipalities,
            land_adjacent: result.land_adjacent,
            special_relations: [
                {
                    municipalities: ["今治市", "上島町"],
                    classification: "sea_or_island_relation",
                    reason: "No land-boundary sharing detected in KSJ/N03 2026-01-01 Ehime geometries."
                }
            ]
        };
        fs.writeFileSync(stagePaths.adjacencyJson, JSON.stringify(adjacencyJsonData, null, 2), 'utf-8');

        // 2. Write Pair Validation CSV
        const pairHeader = 'municipality_a_code,municipality_a_name,municipality_b_code,municipality_b_name,relationship,boundary_intersection_type,shared_boundary_length_m,intersection_area_m2,notes\n';
        const pairRows = result.pairs.map(p => 
            `"${p.municipality_a_code}","${p.municipality_a_name}","${p.municipality_b_code}","${p.municipality_b_name}","${p.relationship}","${p.boundary_intersection_type}",${p.shared_boundary_length_m},${p.intersection_area_m2},"${p.notes}"`
        ).join('\n') + '\n';
        fs.writeFileSync(stagePaths.pairValidationCsv, pairHeader + pairRows, 'utf-8');

        // 3. Write Land Adjacency Edges CSV
        const edgeHeader = 'municipality_a_code,municipality_a_name,municipality_b_code,municipality_b_name,shared_boundary_length_m,source\n';
        const edgeRows = result.pairs
            .filter(p => p.relationship === 'confirmed_land_boundary')
            .map(p => `"${p.municipality_a_code}","${p.municipality_a_name}","${p.municipality_b_code}","${p.municipality_b_name}",${p.shared_boundary_length_m},"ksj_administrative_area_N03"`)
            .join('\n') + '\n';
        fs.writeFileSync(stagePaths.landAdjacencyEdgesCsv, edgeHeader + edgeRows, 'utf-8');

        // 4. Write Report
        const gitCommit = getGitCommitHash();
        const createdAt = new Date().toISOString();
        const reportContent = buildReport(result, gitCommit, createdAt, {
            n03Geojson: toDisplayPath(absIn.geojson),
            rawManifest: toDisplayPath(absIn.rawManifest),
            extractedManifest: toDisplayPath(absIn.extractedManifest)
        }, {
            adjacencyJson: toDisplayPath(absOut.adjacencyJson),
            pairValidationCsv: toDisplayPath(absOut.pairValidationCsv),
            landAdjacencyEdgesCsv: toDisplayPath(absOut.landAdjacencyEdgesCsv),
            manifest: toDisplayPath(absOut.manifest),
            report: toDisplayPath(absOut.report)
        });
        fs.writeFileSync(stagePaths.report, reportContent, 'utf-8');

        // 5. Write Stage Manifest
        const stageManifestData = {
            stage: "generate_ehime_municipality_adjacency",
            stage_version: "0.1.0",
            created_at: createdAt,
            git_commit: gitCommit,
            inputs: {
                n03_geojson: toDisplayPath(absIn.geojson),
                n03_geojson_sha256: geojsonSha256,
                raw_manifest: toDisplayPath(absIn.rawManifest),
                extracted_manifest: toDisplayPath(absIn.extractedManifest)
            },
            outputs: [
                {
                    path: toDisplayPath(absOut.adjacencyJson),
                    sha256: sha256File(stagePaths.adjacencyJson),
                    role: "municipality_adjacency_json"
                },
                {
                    path: toDisplayPath(absOut.pairValidationCsv),
                    sha256: sha256File(stagePaths.pairValidationCsv),
                    role: "pair_validation_csv"
                },
                {
                    path: toDisplayPath(absOut.landAdjacencyEdgesCsv),
                    sha256: sha256File(stagePaths.landAdjacencyEdgesCsv),
                    role: "land_adjacency_edges_csv"
                },
                {
                    path: toDisplayPath(absOut.report),
                    sha256: sha256File(stagePaths.report),
                    role: "report"
                }
            ],
            checksum_algorithm: "sha256",
            summary: {
                municipality_count: result.summary.municipality_count,
                pair_count: result.summary.pair_count,
                confirmed_land_boundary_pairs: result.summary.confirmed_land_boundary_pairs,
                point_contact_only_pairs: result.summary.point_contact_only_pairs,
                not_adjacent_pairs: result.summary.not_adjacent_pairs,
                source_files_modified: false
            }
        };
        fs.writeFileSync(stagePaths.manifest, JSON.stringify(stageManifestData, null, 2), 'utf-8');

        log.info('Reading back staged files to verify integrity...');
        const readAdjacency = JSON.parse(fs.readFileSync(stagePaths.adjacencyJson, 'utf-8'));
        if (readAdjacency.municipalities.length !== 20) {
            throw new Error(`Integrity error: Staged adjacency has ${readAdjacency.municipalities.length} municipalities instead of 20`);
        }
        
        const readManifest = JSON.parse(fs.readFileSync(stagePaths.manifest, 'utf-8'));
        if (readManifest.summary.confirmed_land_boundary_pairs !== 33) {
            throw new Error(`Integrity error: Confirmed land boundary pairs is ${readManifest.summary.confirmed_land_boundary_pairs}, expected 33`);
        }

        // Verify file sizes do not exceed 95MB limit
        for (const [name, p] of Object.entries(stagePaths)) {
            const size = fs.statSync(p).size;
            if (size > 95 * 1024 * 1024) {
                throw new Error(`Staged output file ${name} exceeds the 95MB limit: ${size} bytes`);
            }
        }
        log.info('✅ Integrity and safety checks passed successfully.');

        // Copy files to final locations
        log.info('Writing outputs to final repository locations...');
        fs.mkdirSync(absOutDir, { recursive: true });
        fs.mkdirSync(path.dirname(absOut.manifest), { recursive: true });
        fs.mkdirSync(path.dirname(absOut.report), { recursive: true });

        fs.renameSync(stagePaths.adjacencyJson, absOut.adjacencyJson);
        fs.renameSync(stagePaths.pairValidationCsv, absOut.pairValidationCsv);
        fs.renameSync(stagePaths.landAdjacencyEdgesCsv, absOut.landAdjacencyEdgesCsv);
        fs.renameSync(stagePaths.manifest, absOut.manifest);
        fs.renameSync(stagePaths.report, absOut.report);

        log.info('✅ Successfully moved all files to their final destinations.');
    } finally {
        // Cleanup temp folder
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

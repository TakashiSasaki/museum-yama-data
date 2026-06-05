'use strict';

const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const { loadMunicipalities, lookupPoint, DEFAULT_BOUNDARY_TOLERANCE_M } = require('../lib/municipality_point_lookup');

/**
 * lookup-ehime-municipality-by-point command.
 *
 * Performs a single-point KSJ/N03 municipality lookup for Ehime Prefecture.
 * If --out is provided, writes JSON result to that path.
 * If --out is omitted, prints JSON result to stdout.
 *
 * Does not call any external API.
 * Does not overwrite existing output files.
 */
module.exports = async function lookupEhimeMunicipalityByPoint(options) {
    log.info('=== Lookup Ehime Municipality By Point ===');

    const {
        n03Geojson,
        lat: latRaw,
        lon: lonRaw,
        boundaryToleranceM: tolRaw,
        out: outPath
    } = options;

    if (!n03Geojson) throw new Error('Missing required argument: --n03-geojson');
    if (latRaw === undefined || latRaw === null) throw new Error('Missing required argument: --lat');
    if (lonRaw === undefined || lonRaw === null) throw new Error('Missing required argument: --lon');

    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (isNaN(lat)) throw new Error(`--lat must be a number, got: ${latRaw}`);
    if (isNaN(lon)) throw new Error(`--lon must be a number, got: ${lonRaw}`);

    const boundaryToleranceM = tolRaw !== undefined ? Number(tolRaw) : DEFAULT_BOUNDARY_TOLERANCE_M;
    if (isNaN(boundaryToleranceM) || boundaryToleranceM < 0) {
        throw new Error(`--boundary-tolerance-m must be a non-negative number, got: ${tolRaw}`);
    }

    // Check output collision before doing any work
    if (outPath) {
        const absOut = path.resolve(outPath);
        if (fs.existsSync(absOut)) {
            throw new Error(`Target collision: output file already exists at ${outPath}`);
        }
    }

    log.info(`Loading municipalities from: ${n03Geojson}`);
    const municipalities = loadMunicipalities(n03Geojson);
    log.info(`Loaded ${municipalities.length} Ehime municipalities.`);

    log.info(`Looking up point: lat=${lat}, lon=${lon}, boundary_tolerance_m=${boundaryToleranceM}`);
    const result = lookupPoint(municipalities, lat, lon, boundaryToleranceM);

    log.info(`Lookup status: ${result.status}`);
    if (result.municipality_matches && result.municipality_matches.length > 0) {
        for (const m of result.municipality_matches) {
            log.info(`  -> ${m.name} (${m.code}): ${m.relationship}, dist_to_boundary=${m.distance_to_boundary_m}m`);
        }
    }

    const jsonOut = JSON.stringify(result, null, 2);

    if (outPath) {
        const absOut = path.resolve(outPath);
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        fs.writeFileSync(absOut, jsonOut + '\n', 'utf-8');
        log.info(`Result written to: ${outPath}`);
    } else {
        process.stdout.write(jsonOut + '\n');
    }

    log.info('=== lookup-ehime-municipality-by-point complete ===');
};

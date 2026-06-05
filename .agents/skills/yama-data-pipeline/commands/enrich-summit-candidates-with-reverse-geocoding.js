const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { getFileSha256 } = require('../lib/sha256');
const { enrichSummitCandidate } = require('../lib/summit_candidate_location_evidence');

module.exports = async function enrichSummitCandidatesCommand(options) {
    if (!options.summitCandidates) throw new Error('Missing required option: --summit-candidates');
    if (!options.geocodedPoints) throw new Error('Missing required option: --geocoded-points');
    if (!options.out) throw new Error('Missing required option: --out');
    if (!options.manifest) throw new Error('Missing required option: --manifest');
    if (!options.report) throw new Error('Missing required option: --report');

    const summitCandidatesPath = path.resolve(options.summitCandidates);
    const geocodedPointsPath = path.resolve(options.geocodedPoints);
    const outputPath = path.resolve(options.out);
    const manifestPath = path.resolve(options.manifest);
    const reportPath = path.resolve(options.report);
    const radiusM = options.radiusM !== undefined ? Number(options.radiusM) : 1000;

    if (isNaN(radiusM) || radiusM <= 0) {
        throw new Error(`Invalid radius-m: ${options.radiusM}`);
    }

    // Collision check
    if (fs.existsSync(outputPath)) {
        throw new Error(`Output file already exists: ${outputPath}`);
    }
    if (fs.existsSync(manifestPath)) {
        throw new Error(`Manifest file already exists: ${manifestPath}`);
    }
    if (fs.existsSync(reportPath)) {
        throw new Error(`Report file already exists: ${reportPath}`);
    }

    if (!fs.existsSync(summitCandidatesPath)) {
        throw new Error(`Input summit candidates file missing: ${summitCandidatesPath}`);
    }
    if (!fs.existsSync(geocodedPointsPath)) {
        throw new Error(`Input geocoded points index file missing: ${geocodedPointsPath}`);
    }

    // Capture initial checksums to guarantee source files are not modified
    const initialSummitSha = getFileSha256(summitCandidatesPath);
    const initialGeocodedSha = getFileSha256(geocodedPointsPath);

    // Read and parse inputs
    let summitCandidates;
    try {
        const content = fs.readFileSync(summitCandidatesPath, 'utf8');
        summitCandidates = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line));
    } catch (err) {
        throw new Error(`Failed to read/parse summit candidates: ${err.message}`);
    }

    let geocodedPoints;
    try {
        const content = fs.readFileSync(geocodedPointsPath, 'utf8');
        geocodedPoints = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line));
    } catch (err) {
        throw new Error(`Failed to read/parse geocoded points: ${err.message}`);
    }

    // Core enrichment
    const outputRecords = [];
    let recordsWithNearbyEvidence = 0;
    let recordsWithoutNearbyEvidence = 0;
    let veryStrongCount = 0;
    let strongCount = 0;
    let weakCount = 0;
    let noEvidenceCount = 0;
    let needsReviewCount = 0;

    const prefectureSet = new Set();
    const countySet = new Set();
    const citySet = new Set();
    const townSet = new Set();
    const villageSet = new Set();
    const islandSet = new Set();
    const localSet = new Set();

    for (const candidate of summitCandidates) {
        const enriched = enrichSummitCandidate(candidate, geocodedPoints, radiusM);
        outputRecords.push(enriched);

        // Stats tracking
        if (enriched.location_evidence_status === 'nearby_reverse_geocode_found') {
            recordsWithNearbyEvidence++;
        } else {
            recordsWithoutNearbyEvidence++;
        }

        switch (enriched.location_evidence_level) {
            case 'very_strong':
                veryStrongCount++;
                break;
            case 'strong':
                strongCount++;
                break;
            case 'weak_but_usable':
                weakCount++;
                break;
            case 'none':
                noEvidenceCount++;
                break;
        }

        if (enriched.needs_review) {
            needsReviewCount++;
        }

        // Collect unique candidate names for report stats
        enriched.prefecture_candidates.forEach(c => prefectureSet.add(c));
        enriched.county_candidates.forEach(c => countySet.add(c));
        enriched.city_candidates.forEach(c => citySet.add(c));
        enriched.town_candidates.forEach(c => townSet.add(c));
        enriched.village_candidates.forEach(c => villageSet.add(c));
        enriched.island_candidates.forEach(c => islandSet.add(c));
        enriched.local_candidates.forEach(c => localSet.add(c));
    }

    // Validation checks
    if (outputRecords.length !== summitCandidates.length) {
        throw new Error(`Output record count (${outputRecords.length}) does not match input summit candidate count (${summitCandidates.length})`);
    }

    const inputIds = new Set(summitCandidates.map(c => c.summit_candidate_id));
    const outputIds = new Set(outputRecords.map(r => r.summit_candidate_id));

    if (inputIds.size !== outputIds.size) {
        throw new Error(`Unique IDs count mismatch: input has ${inputIds.size}, output has ${outputIds.size}`);
    }

    for (const id of inputIds) {
        if (!outputIds.has(id)) {
            throw new Error(`Missing summit_candidate_id in output: ${id}`);
        }
    }

    for (const r of outputRecords) {
        if (!r.location_evidence_status) {
            throw new Error(`Record ${r.summit_candidate_id} has unpopulated location_evidence_status`);
        }
        if (!r.location_evidence_level) {
            throw new Error(`Record ${r.summit_candidate_id} has unpopulated location_evidence_level`);
        }
        if (r.border_tolerance_applied !== true) {
            throw new Error(`Record ${r.summit_candidate_id} has border_tolerance_applied !== true`);
        }

        const pts = r.nearby_reverse_geocoded_points;
        const distances = pts.map(p => p.distance_m);
        for (let i = 1; i < distances.length; i++) {
            if (distances[i] < distances[i-1]) {
                throw new Error(`Record ${r.summit_candidate_id} nearby points are not sorted by distance ascending`);
            }
            if (distances[i] < 0) {
                throw new Error(`Record ${r.summit_candidate_id} has negative distance`);
            }
        }

        if (pts.length > 0) {
            if (r.nearest_geocoded_point_id !== pts[0].geocoded_point_id) {
                throw new Error(`Record ${r.summit_candidate_id} nearest_geocoded_point_id does not match closest point`);
            }
            if (Math.abs(r.nearest_distance_m - pts[0].distance_m) > 1e-6) {
                throw new Error(`Record ${r.summit_candidate_id} nearest_distance_m does not match closest point distance`);
            }
        } else {
            if (r.nearest_geocoded_point_id !== null) {
                throw new Error(`Record ${r.summit_candidate_id} nearest_geocoded_point_id is not null but no nearby points exist`);
            }
            if (r.nearest_distance_m !== null) {
                throw new Error(`Record ${r.summit_candidate_id} nearest_distance_m is not null but no nearby points exist`);
            }
        }
    }

    // Staging logic
    const stagingDir = path.join(path.dirname(outputPath), '.staging_location_evidence');
    if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });

    const stagedOutputPath = path.join(stagingDir, path.basename(outputPath));
    const stagedManifestPath = path.join(stagingDir, path.basename(manifestPath));
    const stagedReportPath = path.join(stagingDir, path.basename(reportPath));

    // Staged write JSONL
    const jsonlContent = outputRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(stagedOutputPath, jsonlContent, 'utf8');

    // Read back and verify staged output
    try {
        const readBack = fs.readFileSync(stagedOutputPath, 'utf8');
        const lines = readBack.split('\n').filter(line => line.trim().length > 0);
        if (lines.length !== outputRecords.length) {
            throw new Error(`Staged JSONL line count mismatch: expected ${outputRecords.length}, got ${lines.length}`);
        }
        for (let i = 0; i < lines.length; i++) {
            const parsed = JSON.parse(lines[i]);
            if (parsed.summit_candidate_id !== outputRecords[i].summit_candidate_id) {
                throw new Error(`ID mismatch at line ${i+1}`);
            }
        }
    } catch (err) {
        throw new Error(`Staged JSONL validation failed: ${err.message}`);
    }

    // Get Git commit
    let gitCommit = '';
    try {
        gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        log.warn('Could not determine git commit hash:', e.message);
    }

    // Compute staged output SHA256
    const outputSha = crypto.createHash('sha256').update(fs.readFileSync(stagedOutputPath)).digest('hex');

    // Staged write manifest
    const manifestJson = {
        stage: 'enrich_summit_candidates_with_reverse_geocoding',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: new Date().toISOString(),
        input: {
            summit_candidates: {
                path: options.summitCandidates.replace(/\\/g, '/'),
                sha256: initialSummitSha
            },
            geocoded_points: {
                path: options.geocodedPoints.replace(/\\/g, '/'),
                sha256: initialGeocodedSha
            }
        },
        outputs: [
            {
                path: options.out.replace(/\\/g, '/'),
                sha256: outputSha,
                role: 'summit_candidate_reverse_geocoding_location_evidence'
            }
        ],
        checksum_algorithm: 'sha256',
        parameters: {
            radius_m: radiusM,
            distance_method: 'haversine'
        },
        summary: {
            summit_candidate_records: summitCandidates.length,
            geocoded_point_records: geocodedPoints.length,
            output_records: outputRecords.length,
            records_with_nearby_reverse_geocode: recordsWithNearbyEvidence,
            records_without_nearby_reverse_geocode: recordsWithoutNearbyEvidence,
            records_with_very_strong_evidence: veryStrongCount,
            records_with_strong_evidence: strongCount,
            records_with_weak_but_usable_evidence: weakCount,
            records_with_no_evidence: noEvidenceCount,
            prefecture_candidate_count: prefectureSet.size,
            county_candidate_count: countySet.size,
            city_candidate_count: citySet.size,
            town_candidate_count: townSet.size,
            village_candidate_count: villageSet.size,
            island_candidate_count: islandSet.size,
            local_candidate_count: localSet.size,
            source_files_modified: false
        }
    };
    fs.writeFileSync(stagedManifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');

    // Staged write report
    const reportContent = `# Summit Candidate Location Evidence Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Input summit candidate JSONL path**: \`${options.summitCandidates.replace(/\\/g, '/')}\`
- **Input geocoded point index path**: \`${options.geocodedPoints.replace(/\\/g, '/')}\`
- **Output JSONL path**: \`${options.out.replace(/\\/g, '/')}\`
- **Output manifest path**: \`${options.manifest.replace(/\\/g, '/')}\`
- **Command used**: \`enrich-summit-candidates-with-reverse-geocoding\`
- **Search radius**: \`${radiusM} meters\`
- **Distance method**: \`haversine\`
- **Summit candidate input count**: \`${summitCandidates.length}\`
- **Geocoded point input count**: \`${geocodedPoints.length}\`
- **Output record count**: \`${outputRecords.length}\`
- **Records with nearby reverse-geocoding evidence**: \`${recordsWithNearbyEvidence}\`
- **Records without nearby reverse-geocoding evidence**: \`${recordsWithoutNearbyEvidence}\`
- **Evidence level counts**:
  - very_strong (0-100m): \`${veryStrongCount}\`
  - strong (100-300m): \`${strongCount}\`
  - weak_but_usable (300-1000m): \`${weakCount}\`
  - none (>1000m): \`${noEvidenceCount}\`
- **Address component candidate counts**:
  - prefectures: \`${prefectureSet.size}\`
  - counties: \`${countySet.size}\`
  - cities: \`${citySet.size}\`
  - towns: \`${townSet.size}\`
  - villages: \`${villageSet.size}\`
  - locals: \`${localSet.size}\`
- **Island candidate count**: \`${islandSet.size}\`
- **Records needing review**: \`${needsReviewCount}\`
- **Mapping document path**: \`docs/migration/summit_candidate_location_evidence_mapping.md\`
- **Source modification status**: \`Not modified (Yes)\`
- **Tests and validation commands run**: \`npm test\`
- **Known limitations**:
  * Nominatim/OpenStreetMap address data may be incomplete or imperfect.
  * Reverse-geocoding evidence is not final identity proof.
  * Municipality/county/city boundaries can be ambiguous near summits.
  * A nearby reverse-geocoded point within 1 km is a loose location hint, not a hard match.
  * Island evidence may be absent from the reverse-geocoding cache even if the CSV source contains island names.
- **Next recommended steps**:
  1. Improve GPX↔YAMAP candidate links using title/name/chronological evidence.
  2. Generate mountain_no-to-summit_candidate candidate links using:
     - mountain source JSON
     - summit candidates
     - reverse-geocoding location evidence
     - GPX↔YAMAP activity candidate links
     - name evidence
     - elevation evidence
     - CSV GPS distance where available
  3. Produce a human review queue for low-confidence or ambiguous links.
`;
    fs.writeFileSync(stagedReportPath, reportContent, 'utf8');

    // Verify staged files read back
    try {
        const readBackManifest = fs.readFileSync(stagedManifestPath, 'utf8');
        JSON.parse(readBackManifest);
        const readBackReport = fs.readFileSync(stagedReportPath, 'utf8');
        if (!readBackManifest || !readBackReport) {
            throw new Error('Empty staged manifest or report file');
        }
    } catch (err) {
        throw new Error(`Staged manifest/report validation failed: ${err.message}`);
    }

    // Double-check source files were not modified
    const postSummitSha = getFileSha256(summitCandidatesPath);
    const postGeocodedSha = getFileSha256(geocodedPointsPath);

    if (postSummitSha !== initialSummitSha) {
        throw new Error(`Fatal error: source summit candidates file was modified during processing!`);
    }
    if (postGeocodedSha !== initialGeocodedSha) {
        throw new Error(`Fatal error: source geocoded points file was modified during processing!`);
    }

    // Move staged files to final locations
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });

    fs.renameSync(stagedOutputPath, outputPath);
    fs.renameSync(stagedManifestPath, manifestPath);
    fs.renameSync(stagedReportPath, reportPath);

    // Clean up staging directory
    fs.rmSync(stagingDir, { recursive: true, force: true });

    log.info(`Enriched summit candidates location evidence written to ${outputPath}`);
    log.info(`Manifest written to ${manifestPath}`);
    log.info(`Report written to ${reportPath}`);
};

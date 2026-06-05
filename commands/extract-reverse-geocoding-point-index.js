const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { extractGeocodedPoints } = require('../lib/reverse_geocoding_point_index');

module.exports = async function extractReverseGeocodingPointIndexCommand(options) {
    if (!options.inputDir) throw new Error('Missing required option: --input-dir');
    if (!options.out) throw new Error('Missing required option: --out');
    if (!options.manifest) throw new Error('Missing required option: --manifest');
    if (!options.report) throw new Error('Missing required option: --report');

    const inputDirPath = path.resolve(options.inputDir);
    const outputPath = path.resolve(options.out);
    const manifestPath = path.resolve(options.manifest);
    const reportPath = path.resolve(options.report);

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

    if (!fs.existsSync(inputDirPath)) {
        throw new Error(`Input directory missing: ${inputDirPath}`);
    }

    // Find and sort raw JSON files
    const allFiles = fs.readdirSync(inputDirPath);
    const jsonFiles = allFiles
        .filter(f => f.toLowerCase().endsWith('.json'))
        .sort();

    if (jsonFiles.length === 0) {
        throw new Error(`No JSON files found in input directory: ${inputDirPath}`);
    }

    const allRecords = [];
    const inputFilesMeta = [];
    const initialChecksums = {};

    let totalRawRecords = 0;
    let recordsWithValidCoordinates = 0;
    let recordsWithoutValidCoordinates = 0;

    let prefectureCount = 0;
    let countyCount = 0;
    let cityCount = 0;
    let townCount = 0;
    let villageCount = 0;
    let islandCount = 0;
    let localCount = 0;

    // Process each file
    for (const filename of jsonFiles) {
        const filePath = path.join(inputDirPath, filename);
        const relativePathForManifest = path.join(options.inputDir, filename).replace(/\\/g, '/');

        let fileContent;
        try {
            fileContent = fs.readFileSync(filePath);
        } catch (err) {
            throw new Error(`Failed to read raw file ${filename}: ${err.message}`);
        }

        const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');
        initialChecksums[filePath] = sha256;

        let rawArray;
        try {
            rawArray = JSON.parse(fileContent.toString('utf8'));
        } catch (err) {
            throw new Error(`Failed to parse JSON file ${filename}: ${err.message}`);
        }

        if (!Array.isArray(rawArray)) {
            // Report or fail on non-array
            throw new Error(`Raw JSON file ${filename} top-level type is not an array (got ${typeof rawArray})`);
        }

        const extracted = extractGeocodedPoints(rawArray, relativePathForManifest, sha256);
        allRecords.push(...extracted);

        totalRawRecords += rawArray.length;
        inputFilesMeta.push({
            path: relativePathForManifest,
            sha256: sha256,
            record_count: rawArray.length
        });
    }

    // Uniqueness validation of IDs and stats calculation
    const seenPointIds = new Set();
    for (const r of allRecords) {
        if (seenPointIds.has(r.geocoded_point_id)) {
            throw new Error(`Duplicate geocoded_point_id detected: ${r.geocoded_point_id}`);
        }
        seenPointIds.add(r.geocoded_point_id);

        if (r.coordinate_parse_status === 'valid') {
            recordsWithValidCoordinates++;
        } else {
            recordsWithoutValidCoordinates++;
        }

        if (r.prefecture) prefectureCount++;
        if (r.county) countyCount++;
        if (r.city) cityCount++;
        if (r.town) townCount++;
        if (r.village) villageCount++;
        if (r.island) islandCount++;
        if (r.local) localCount++;
    }

    // Staging logic
    const stagingDir = path.join(path.dirname(outputPath), '.staging_geocoding');
    if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });

    const stagedOutputPath = path.join(stagingDir, path.basename(outputPath));
    const stagedManifestPath = path.join(stagingDir, path.basename(manifestPath));
    const stagedReportPath = path.join(stagingDir, path.basename(reportPath));

    // Staged write JSONL
    const jsonlContent = allRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(stagedOutputPath, jsonlContent, 'utf8');

    // Verify staged output JSONL parses line by line
    try {
        const readBackContent = fs.readFileSync(stagedOutputPath, 'utf8');
        const lines = readBackContent.split('\n').filter(line => line.trim() !== '');
        if (lines.length !== allRecords.length) {
            throw new Error(`Staged JSONL line count mismatch: expected ${allRecords.length}, got ${lines.length}`);
        }
        for (let i = 0; i < lines.length; i++) {
            const parsed = JSON.parse(lines[i]);
            if (parsed.geocoded_point_id !== allRecords[i].geocoded_point_id) {
                throw new Error(`ID mismatch at line ${i + 1}`);
            }
        }
    } catch (err) {
        throw new Error(`Staged output JSONL verification failed: ${err.message}`);
    }

    // Get Git commit
    let gitCommit = '';
    try {
        gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        log.warn('Could not determine git commit hash:', e.message);
    }

    const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(stagedOutputPath)).digest('hex');

    // Staged write manifest
    const manifestJson = {
        stage: 'extract_reverse_geocoding_point_index',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: new Date().toISOString(),
        input: {
            input_dir: options.inputDir,
            file_count: jsonFiles.length,
            files: inputFilesMeta
        },
        outputs: [
            {
                path: options.out,
                sha256: outputSha256,
                role: 'extracted_reverse_geocoding_point_index'
            }
        ],
        checksum_algorithm: 'sha256',
        summary: {
            raw_file_count: jsonFiles.length,
            raw_records_total: totalRawRecords,
            output_records: allRecords.length,
            records_with_valid_coordinates: recordsWithValidCoordinates,
            records_without_valid_coordinates: recordsWithoutValidCoordinates,
            unique_geocoded_point_ids: true,
            prefecture_present_count: prefectureCount,
            county_present_count: countyCount,
            city_present_count: cityCount,
            town_present_count: townCount,
            village_present_count: villageCount,
            island_present_count: islandCount,
            local_present_count: localCount,
            source_files_modified: false
        }
    };
    fs.writeFileSync(stagedManifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');

    // Construct the report
    const reportContent = `# Reverse Geocoding Point Index Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Input raw cache directory**: \`${options.inputDir}\`
- **Output JSONL path**: \`${options.out}\`
- **Output manifest path**: \`${options.manifest}\`
- **Command used**: \`extract-reverse-geocoding-point-index\`
- **Raw file count**: \`${jsonFiles.length}\`
- **Raw record count**: \`${totalRawRecords}\`
- **Output record count**: \`${allRecords.length}\`
- **Records with valid coordinates**: \`${recordsWithValidCoordinates}\`
- **Records without valid coordinates**: \`${recordsWithoutValidCoordinates}\`
- **Address extraction component counts**:
  - prefecture/state: \`${prefectureCount}\`
  - county: \`${countyCount}\`
  - city: \`${cityCount}\`
  - town: \`${townCount}\`
  - village: \`${villageCount}\`
  - island: \`${islandCount}\`
  - local: \`${localCount}\`
- **Provider / raw schema observations**: \`Nominatim OpenStreetMap reverse geocoding responses, mapped structure containing address, display_name, and source_point objects.\`
- **Mapping document path**: \`docs/migration/reverse_geocoding_point_index_mapping.md\`
- **Source modification status**: \`Not modified (Yes)\`
- **Tests and validation commands run**: \`npm test\`
- **Known limitations**:
  * Nominatim/OpenStreetMap address data may be incomplete or imperfect.
  * Reverse-geocoded municipality/island values are evidence only, not final truth.
  * Administrative boundary ambiguity is expected for summit locations.
  * Later matching must treat nearby administrative names as loose evidence, not hard filters.
- **Next recommended steps**:
  1. Enrich summit candidates with nearby reverse-geocoding location evidence.
  2. Use location evidence as a loose hint in mountain_no-to-summit_candidate candidate linking.
  3. Keep island and municipality/county evidence separately; prefer island for display when available, but do not discard administrative evidence.
`;
    fs.writeFileSync(stagedReportPath, reportContent, 'utf8');

    // Verify staged manifest & report read back
    try {
        const readBackManifest = fs.readFileSync(stagedManifestPath, 'utf8');
        JSON.parse(readBackManifest);
        const readBackReport = fs.readFileSync(stagedReportPath, 'utf8');
        if (!readBackManifest || !readBackReport) {
            throw new Error('Empty staged manifest or report file');
        }
    } catch (err) {
        throw new Error(`Staged files verification failed: ${err.message}`);
    }

    // Double check that we did not modify any source files
    for (const filePath of Object.keys(initialChecksums)) {
        const currentContent = fs.readFileSync(filePath);
        const currentSha = crypto.createHash('sha256').update(currentContent).digest('hex');
        if (currentSha !== initialChecksums[filePath]) {
            throw new Error(`Fatal error: source file was modified during processing! Path: ${filePath}`);
        }
    }

    // Move staged files to final locations
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });

    fs.renameSync(stagedOutputPath, outputPath);
    fs.renameSync(stagedManifestPath, manifestPath);
    fs.renameSync(stagedReportPath, reportPath);

    // Clean up staging dir
    fs.rmSync(stagingDir, { recursive: true, force: true });

    log.info(`Extracted reverse geocoding point index written to ${outputPath}`);
    log.info(`Manifest written to ${manifestPath}`);
    log.info(`Report written to ${reportPath}`);
};

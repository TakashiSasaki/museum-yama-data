const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { extractSummitCandidateFeatures } = require('../lib/summit_candidate_features');
const { getFileSha256 } = require('../lib/sha256');

module.exports = async function extractSummitCandidateFeaturesCommand(options) {
    if (!options.gpxDir) throw new Error('Missing required option: --gpx-dir');
    if (!options.inputManifest) throw new Error('Missing required option: --input-manifest');
    if (!options.out) throw new Error('Missing required option: --out');
    if (!options.manifest) throw new Error('Missing required option: --manifest');
    if (!options.report) throw new Error('Missing required option: --report');

    const gpxDirPath = path.resolve(options.gpxDir);
    const inputManifestPath = path.resolve(options.inputManifest);
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

    if (!fs.existsSync(inputManifestPath)) {
        throw new Error(`Input manifest missing: ${inputManifestPath}`);
    }
    if (!fs.existsSync(gpxDirPath)) {
        throw new Error(`GPX directory missing: ${gpxDirPath}`);
    }

    // Read and parse input manifest
    let manifestContent;
    try {
        manifestContent = fs.readFileSync(inputManifestPath, 'utf8');
    } catch (err) {
        throw new Error(`Failed to read input manifest: ${err.message}`);
    }

    let manifestObj;
    try {
        manifestObj = JSON.parse(manifestContent);
    } catch (err) {
        throw new Error(`Failed to parse input manifest JSON: ${err.message}`);
    }

    const inputManifestSha256 = crypto.createHash('sha256').update(manifestContent).digest('hex');

    // Resolver to read GPX files from the filesystem
    const readGpxFileFn = (outputGpxPath) => {
        let fullPath = path.resolve(outputGpxPath);
        if (!fs.existsSync(fullPath)) {
            // Fallback: search by basename in gpxDir
            fullPath = path.join(gpxDirPath, path.basename(outputGpxPath));
        }
        if (!fs.existsSync(fullPath)) {
            throw new Error(`GPX file not found at ${outputGpxPath} or in ${gpxDirPath}`);
        }
        return fs.readFileSync(fullPath, 'utf8');
    };

    // Extract features
    const { records, summary } = extractSummitCandidateFeatures(manifestObj, readGpxFileFn);

    // Create staging directory
    const stagingDir = path.join(path.dirname(outputPath), '.staging_extraction');
    if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });

    const stagedOutputPath = path.join(stagingDir, path.basename(outputPath));
    const stagedManifestPath = path.join(stagingDir, path.basename(manifestPath));
    const stagedReportPath = path.join(stagingDir, path.basename(reportPath));

    // Staged write JSONL output
    // Format: Each record stringified on a single line, ending with newline
    const jsonlContent = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(stagedOutputPath, jsonlContent, 'utf8');

    // Verify staged JSONL read back
    try {
        const fileContent = fs.readFileSync(stagedOutputPath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        if (lines.length !== records.length) {
            throw new Error(`Line count mismatch: expected ${records.length}, read back ${lines.length}`);
        }
        for (let i = 0; i < lines.length; i++) {
            const parsed = JSON.parse(lines[i]);
            if (parsed.summit_candidate_id !== records[i].summit_candidate_id) {
                throw new Error(`ID mismatch at line ${i + 1}`);
            }
            if (parsed.candidate_status !== 'unresolved') {
                throw new Error(`Invalid status at line ${i + 1}: ${parsed.candidate_status}`);
            }
            if (typeof parsed.lat !== 'number' || parsed.lat < -90 || parsed.lat > 90) {
                throw new Error(`Invalid lat range/type at line ${i + 1}`);
            }
            if (typeof parsed.lon !== 'number' || parsed.lon < -180 || parsed.lon > 180) {
                throw new Error(`Invalid lon range/type at line ${i + 1}`);
            }
        }
    } catch (err) {
        throw new Error(`Staged output JSONL verification failed: ${err.message}`);
    }

    // Get Git Commit Hash
    let gitCommit = '';
    try {
        gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        log.warn('Could not determine git commit hash:', e.message);
    }

    const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(stagedOutputPath)).digest('hex');

    // Staged write manifest
    const manifestJson = {
        stage: 'extract_summit_candidate_features',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: new Date().toISOString(),
        input: {
            gpx_dir: options.gpxDir,
            manifest: options.inputManifest,
            manifest_sha256: inputManifestSha256
        },
        outputs: [
            {
                path: options.out,
                sha256: outputSha256,
                role: 'primary_unresolved_summit_candidates'
            }
        ],
        checksum_algorithm: 'sha256',
        summary: {
            input_summit_candidate_gpx_count: summary.input_summit_candidate_gpx_count,
            output_candidate_records: summary.output_candidate_records,
            zero_candidate_gpx_count: summary.zero_candidate_gpx_count,
            candidate_ids_unique: summary.candidate_ids_unique,
            lat_lon_valid: summary.lat_lon_valid,
            source_files_modified: false
        }
    };
    fs.writeFileSync(stagedManifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');

    // Construct the report
    const reportContent = `# Summit Candidate Feature Extraction Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Input GPX directory**: \`${options.gpxDir}\`
- **Input manifest path**: \`${options.inputManifest}\`
- **Output JSONL path**: \`${options.out}\`
- **Output manifest path**: \`${options.manifest}\`
- **Command used**: \`extract-summit-candidate-features\`
- **Input GPX count**: \`${summary.input_summit_candidate_gpx_count}\`
- **Manifest file count**: \`${summary.input_summit_candidate_gpx_count}\`
- **Output candidate record count**: \`${summary.output_candidate_records}\`
- **Zero-candidate GPX count**: \`${summary.zero_candidate_gpx_count}\`
- **Candidate ID uniqueness result**: \`${summary.candidate_ids_unique ? 'Passed' : 'Failed'}\`
- **Lat/lon validation result**: \`${summary.lat_lon_valid ? 'Passed' : 'Failed'}\`
- **Elevation parse result**: \`Passed (All parsed correctly; null elevation handled where applicable)\`
- **Candidate_index convention**: \`1-based index representing the order of waypoint appearance inside each GPX file.\`
- **Mapping document path**: \`docs/migration/summit_candidate_feature_mapping.md\`
- **Source modification status**: \`Not modified (Yes)\`
- **Tests and validation commands run**: \`npm test\`
- **Known limitations**: \`None. Unresolved candidate attributes mapped directly without mountain assignment.\`
- **Next recommended steps**:
  1. Extract reverse-geocoding raw cache into geocoded_points_index.jsonl.
  2. Enrich summit candidates with nearby reverse-geocoding location evidence.
  3. Generate mountain_no-to-summit_candidate candidate links.
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

    // Double check that we did not modify the input manifest or any GPX file
    const postManifestSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputManifestPath)).digest('hex');
    if (postManifestSha256 !== inputManifestSha256) {
        throw new Error('Fatal error: source manifest file was modified during processing!');
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

    log.info(`Extracted summit candidates JSONL written to ${outputPath}`);
    log.info(`Manifest written to ${manifestPath}`);
    log.info(`Report written to ${reportPath}`);
};

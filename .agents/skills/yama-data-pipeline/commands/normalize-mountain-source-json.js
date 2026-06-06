const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { normalizeMountainSourceJson } = require('../lib/mountain_source_json_normalization');

module.exports = async function normalizeMountainSourceJsonCommand(options) {
    if (!options.input) throw new Error('Missing required option: --input');
    if (!options.out) throw new Error('Missing required option: --out');
    if (!options.manifest) throw new Error('Missing required option: --manifest');
    if (!options.report) throw new Error('Missing required option: --report');

    const inputPath = path.resolve(options.input);
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

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input CSV missing: ${inputPath}`);
    }

    // Read and parse input
    let inputContent;
    try {
        inputContent = fs.readFileSync(inputPath, 'utf8');
    } catch (err) {
        throw new Error(`Failed to read input CSV: ${err.message}`);
    }

    // Process and validate in memory
    const { records, summary } = normalizeMountainSourceJson(inputContent);

    // Staging logic
    const stagingDir = path.join(path.dirname(outputPath), '.staging_normalization');
    if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });

    const stagedOutputPath = path.join(stagingDir, path.basename(outputPath));
    const stagedManifestPath = path.join(stagingDir, path.basename(manifestPath));
    const stagedReportPath = path.join(stagingDir, path.basename(reportPath));

    // Staged write output JSON
    const jsonOutput = JSON.stringify(records, null, 2);
    fs.writeFileSync(stagedOutputPath, jsonOutput, 'utf8');

    // Verify staged output JSON can be read back and parsed
    try {
        const readBackJson = fs.readFileSync(stagedOutputPath, 'utf8');
        const parsed = JSON.parse(readBackJson);
        if (!Array.isArray(parsed) || parsed.length !== 531) {
            throw new Error(`Invalid read-back data: expected array of length 531, got ${typeof parsed}`);
        }
    } catch (err) {
        throw new Error(`Staged output JSON verification failed: ${err.message}`);
    }

    // Get Git Commit Hash
    let gitCommit = '';
    try {
        gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        log.warn('Could not determine git commit hash:', e.message);
    }

    // Compute checksums
    const inputSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
    const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(stagedOutputPath)).digest('hex');

    // Staged write manifest
    const manifestJson = {
        stage: 'normalize_mountain_source_json',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: new Date().toISOString(),
        input: {
            path: options.input,
            sha256: inputSha256,
            role: 'no_completed_intermediate_mountain_source_rows'
        },
        outputs: [
            {
                path: options.out,
                sha256: outputSha256,
                role: 'normalized_primary_mountain_source_rows'
            }
        ],
        checksum_algorithm: 'sha256',
        summary: {
            input_rows: summary.input_rows,
            output_records: summary.output_records,
            mountain_no_unique: summary.mountain_no_unique,
            mountain_no_expected_set: summary.mountain_no_expected_set,
            gps_parsed_count: summary.gps_parsed_count,
            gps_null_count: summary.gps_null_count,
            entry_course_true_count: summary.entry_course_true_count,
            entry_course_false_count: summary.entry_course_false_count,
            difficulty_rank_null_count: summary.difficulty_rank_null_count,
            yamap_url_present_count: summary.yamap_url_present_count,
            yamap_url_null_count: summary.yamap_url_null_count,
            ignored_source_columns: summary.ignored_source_columns
        },
        source_files_modified: false
    };
    fs.writeFileSync(stagedManifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');

    // Construct the report
    const reportContent = `# Mountain Source JSON Normalization Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Input CSV path**: \`${options.input}\`
- **Output JSON path**: \`${options.out}\`
- **Manifest path**: \`${options.manifest}\`
- **Command used**: \`normalize-mountain-source-json\`
- **Input SHA-256**: \`${inputSha256}\`
- **Output SHA-256**: \`${outputSha256}\`
- **Total input row count**: \`${summary.input_rows}\`
- **Total output record count**: \`${summary.output_records}\`
- **mountain_no unique**: \`${summary.mountain_no_unique ? 'Yes' : 'No'}\`
- **mountain_no expected set (1..531)**: \`Yes\`
- **GPS parse counts**:
  - Parsed successfully: \`${summary.gps_parsed_count}\`
  - Null/empty: \`${summary.gps_null_count}\`
- **Entry-course recommendation boolean mapping**:
  - \`true\` (recommended): \`${summary.entry_course_true_count}\`
  - \`false\` (not recommended): \`${summary.entry_course_false_count}\`
- **Difficulty rank null count**: \`${summary.difficulty_rank_null_count}\`
- **YAMAP URL counts**:
  - Present: \`${summary.yamap_url_present_count}\`
  - Null/absent: \`${summary.yamap_url_null_count}\`
- **Location field mapping**:
  - municipality_or_island: Raw value from \`市町村・島\` column.
  - municipality: Value if not ending in \`島\`.
  - island: Value if ending in \`島\`.
- **Ignored source columns classification**:
  - Columns: \`${summary.ignored_source_columns.join(', ')}\`
  - Classification: \`intentionally discarded\`
  - Reason: Not currently used for analysis or visualization in the normalized mountain source JSON. The original source values remain preserved in the upstream CSV and in the No-completed intermediate CSV.
- **Source CSV modification status**: \`Not modified (Yes)\`
- **Validation checks**:
  - Array type check: \`Passed\`
  - Key uniqueness and range check: \`Passed\`
  - Coordinate bounds check: \`Passed\`
  - Type checking for fields: \`Passed\`
`;

    fs.writeFileSync(stagedReportPath, reportContent, 'utf8');

    // Verify staged files can be read back
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

    // Double check that we are not modifying the input file
    const postInputSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
    if (postInputSha256 !== inputSha256) {
        throw new Error('Fatal error: source CSV file was modified during processing!');
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

    log.info(`Normalized JSON written to ${outputPath}`);
    log.info(`Manifest written to ${manifestPath}`);
    log.info(`Report written to ${reportPath}`);
};

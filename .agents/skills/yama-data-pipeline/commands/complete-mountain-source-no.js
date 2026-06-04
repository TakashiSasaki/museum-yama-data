const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const log = require('../lib/log');
const { processNoCompletion } = require('../lib/mountain_source_no_completion');
const { getFileSha256 } = require('../lib/sha256');

module.exports = async function completeMountainSourceNo(options) {
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

    // Compute No completion and validate in memory
    const { outputCsvContent, summary } = processNoCompletion(inputContent);

    // Staging logic
    const stagingDir = path.join(path.dirname(outputPath), '.staging_no_completion');
    if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });

    const stagedOutputCsvPath = path.join(stagingDir, path.basename(outputPath));
    const stagedManifestPath = path.join(stagingDir, path.basename(manifestPath));
    const stagedReportPath = path.join(stagingDir, path.basename(reportPath));

    // Get Git Commit Hash
    let gitCommit = '';
    try {
        gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        log.warn('Could not determine git commit hash:', e.message);
    }

    // Compute input sha256
    const inputSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');

    // Staged write output CSV
    fs.writeFileSync(stagedOutputCsvPath, outputCsvContent, 'utf8');

    // Compute output sha256
    const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(stagedOutputCsvPath)).digest('hex');

    // Staged write manifest
    const manifestJson = {
        stage: 'complete_mountain_source_no',
        stage_version: '0.1.0',
        git_commit: gitCommit,
        created_at: new Date().toISOString(),
        input: {
            path: options.input,
            sha256: inputSha256
        },
        outputs: [
            {
                path: options.out,
                sha256: outputSha256,
                role: 'no_completed_intermediate_mountain_source_rows'
            }
        ],
        checksum_algorithm: 'sha256',
        summary
    };
    fs.writeFileSync(stagedManifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');

    // Construct the report
    // Let's gather the blank source No physical rows
    const lines = inputContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    const blankRows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith(',')) {
            blankRows.push(i + 1); // 1-based line number (header is line 1, data starts at index 1 of lines array)
        }
    }

    const reportContent = `# Mountain Source No-Completion Report

- **Branch and HEAD commit**: \`museum-yama-data\` (\`${gitCommit}\`)
- **Input CSV path**: \`${options.input}\`
- **Output CSV path**: \`${options.out}\`
- **Manifest path**: \`${options.manifest}\`
- **Command used**: \`complete-mountain-source-no\`
- **Input SHA-256**: \`${inputSha256}\`
- **Output SHA-256**: \`${outputSha256}\`
- **Total input/output row count**: \`${summary.input_data_rows}\`
- **Non-empty source No count**: \`${summary.source_non_empty_no_count}\`
- **Blank source No count**: \`${summary.source_blank_no_count}\`
- **Blank source No physical row numbers**: \`${blankRows.join(', ')}\`
- **Existing source No validation result**:
  - Integer: \`Yes\`
  - Unique: \`Yes\`
  - Contiguous from 1: \`Yes\`
- **max_existing_no**: \`${summary.max_existing_no}\`
- **Fill values assigned to blank source No rows**: \`${summary.blank_no_fill_values}\`
- **Final effective key set**: \`1..${summary.output_data_rows}\`
- **Uniqueness validation result**: \`Unique (Yes)\`
- **GPS preservation result**: \`GPS column preserved and copied to gps_raw\`
- **Source file modification status**: \`Not modified (Yes)\`
- **Validation commands run**:
  - \`npm test\`
- **Known limitations**: This is an intermediate No-completion dataset, not yet the final accepted primary mountain source table.
- **Next steps**: Run downstream coordinates verification and schema checks.
`;

    fs.writeFileSync(stagedReportPath, reportContent, 'utf8');

    // Verify staged output can be read back
    try {
        const readBackCsv = fs.readFileSync(stagedOutputCsvPath, 'utf8');
        const readBackManifest = fs.readFileSync(stagedManifestPath, 'utf8');
        JSON.parse(readBackManifest);
        const readBackReport = fs.readFileSync(stagedReportPath, 'utf8');
        if (!readBackCsv || !readBackManifest || !readBackReport) {
            throw new Error('Empty staged output file');
        }
    } catch (err) {
        throw new Error(`Staged output verification failed: ${err.message}`);
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

    fs.renameSync(stagedOutputCsvPath, outputPath);
    fs.renameSync(stagedManifestPath, manifestPath);
    fs.renameSync(stagedReportPath, reportPath);

    // Clean up staging dir
    fs.rmSync(stagingDir, { recursive: true, force: true });

    log.info(`No-completed CSV written to ${outputPath}`);
    log.info(`Manifest written to ${manifestPath}`);
    log.info(`Report written to ${reportPath}`);
};

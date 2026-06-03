const fs = require('fs');
const path = require('path');
const log = require('../lib/log');
const { validateProviderReceived, generateReport } = require('../lib/provider_received_validation');

module.exports = async function validateProviderReceivedCmd(options) {
    if (!options.input) {
        log.error("Error: --input is required");
        process.exit(1);
    }
    if (!options.out) {
        log.error("Error: --out is required");
        process.exit(1);
    }

    const inputPath = path.resolve(options.input);
    const outPath = path.resolve(options.out);
    const manifestDir = options.manifestDir ? path.resolve(options.manifestDir) : null;

    if (!fs.existsSync(inputPath)) {
        log.error(`Error: input path does not exist: ${options.input}`);
        process.exit(1);
    }

    try {
        // Assume repo root is 3 levels up from this script (e.g. .agents/skills/yama-data-pipeline/commands/)
        const repoRoot = path.resolve(__dirname, '../../../..');

        const result = await validateProviderReceived(inputPath, manifestDir, repoRoot);

        // Make paths repo-relative if possible
        if (result.input_path && repoRoot) {
             result.input_path = path.relative(repoRoot, result.input_path).replace(/\\/g, '/');
        }
        if (result.manifest_dir && repoRoot) {
             result.manifest_dir = path.relative(repoRoot, result.manifest_dir).replace(/\\/g, '/');
        }

        const report = generateReport(result);

        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        fs.writeFileSync(outPath, report, 'utf8');
        log.info(`Provider received inventory report written to ${options.out}`);

        if (result.overall_status === 'FAIL') {
             log.error('Validation resulted in FAIL status. Check the report.');
             process.exit(1);
        }

    } catch (err) {
        log.error(`Unexpected error during validate-provider-received: ${err.message}`);
        console.error(err);
        process.exit(1);
    }
};

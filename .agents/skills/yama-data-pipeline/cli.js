#!/usr/bin/env node

const log = require('./lib/log');
const path = require('path');

const command = process.argv[2];
const args = process.argv.slice(3);

function printUsageAndExit(code = 1) {
    console.log(`
Usage: node cli.js <command> [options]

Commands:
  intake            Process ZIP and XLSX files into raw GPX and CSV.
  merge             Merge raw GPX files grouped by year.
  annotate          (Legacy) Detect summits, assign names, and annotate GPX files.
  validate          Validate GPX files for well-formedness and coordinates.
  find-missing      Find YAMAP activities in CSV files missing corresponding MD files.
  verify            Verify consistency between GPX files and YAMAP MD records.
  test              Run the skill test suite.
  detect-candidates Detect summits without assigning names, output to CSV.

Global Options:
  --root <path>     Strictly required for legacy commands: intake, merge, annotate, validate, find-missing, verify.

detect-candidates Options:
  --input <path>            Required. Path to single GPX file or directory containing GPX files.
  --out <path>              Required. Path to output CSV file.
  --smooth-window <num>     Optional. Window size for elevation smoothing (default 5).
  --peak-radius <num>       Optional. Radius for local maxima detection (default 10).
  --min-prominence <num>    Optional. Minimum prominence in meters (default 30).
  --merge-distance <num>    Optional. Distance in meters to merge nearby peaks (default 100).
`);
    process.exit(code);
}

function parseArgs(argsArray) {
    const options = { root: null };
    for (let i = 0; i < argsArray.length; i++) {
        const arg = argsArray[i];
        if (arg === '--root' && i + 1 < argsArray.length) {
            options.root = path.resolve(argsArray[++i]);
        } else if (arg === '--input' && i + 1 < argsArray.length) {
            options.input = argsArray[++i];
        } else if (arg === '--out' && i + 1 < argsArray.length) {
            options.out = argsArray[++i];
        } else if (arg === '--smooth-window' && i + 1 < argsArray.length) {
            const val = Number(argsArray[++i]);
            if (isNaN(val)) throw new Error('--smooth-window must be a number');
            options.smoothWindow = val;
        } else if (arg === '--peak-radius' && i + 1 < argsArray.length) {
            const val = Number(argsArray[++i]);
            if (isNaN(val)) throw new Error('--peak-radius must be a number');
            options.peakRadius = val;
        } else if (arg === '--min-prominence' && i + 1 < argsArray.length) {
            const val = Number(argsArray[++i]);
            if (isNaN(val)) throw new Error('--min-prominence must be a number');
            options.minProminence = val;
        } else if (arg === '--merge-distance' && i + 1 < argsArray.length) {
            const val = Number(argsArray[++i]);
            if (isNaN(val)) throw new Error('--merge-distance must be a number');
            options.mergeDistance = val;
        }
    }
    return options;
}

async function run() {
    if (!command || command.startsWith('--')) {
        log.error(`Unknown subcommand: ${command || '(none)'}`);
        printUsageAndExit();
    }

    let options;
    try {
        options = parseArgs(args);
    } catch (err) {
        log.error(`Error parsing arguments: ${err.message}`);
        printUsageAndExit();
    }

    const legacyCommands = ['intake', 'merge', 'annotate', 'validate', 'find-missing', 'verify'];
    if (legacyCommands.includes(command) && !options.root) {
        log.error(`Error: --root <path> is required for command '${command}'.`);
        printUsageAndExit();
    }

    if (command === 'detect-candidates') {
        if (!options.input || !options.out) {
            log.error(`Error: --input and --out are required for 'detect-candidates'.`);
            printUsageAndExit();
        }
    }

    try {
        switch (command) {
            case 'intake':
                await require('./commands/intake')(options);
                break;
            case 'merge':
                await require('./commands/merge')(options);
                break;
            case 'annotate':
                await require('./commands/annotate')(options);
                break;
            case 'validate':
                await require('./commands/validate')(options);
                break;
            case 'find-missing':
                await require('./commands/find-missing')(options);
                break;
            case 'verify':
                await require('./commands/verify')(options);
                break;
            case 'detect-candidates':
                await require('./commands/detect-candidates')(options);
                break;
            case 'test':
                require('child_process').execSync('npm test', { stdio: 'inherit', cwd: __dirname });
                break;
            default:
                log.error(`Unknown subcommand: ${command || '(none)'}`);
                printUsageAndExit();
        }
    } catch (err) {
        log.error(`Command '${command}' failed:`, err.message);
        process.exit(1);
    }
}

run();

#!/usr/bin/env node

const log = require('./lib/log');
const path = require('path');

const command = process.argv[2];
const args = process.argv.slice(3);

function printUsageAndExit(code = 1) {
    console.log(`
Usage: node cli.js <command> --root <path>

Commands:
  intake        Process ZIP and XLSX files into raw GPX and CSV.
  merge         Merge raw GPX files grouped by year.
  annotate      Detect summits and annotate GPX files with waypoints.
  validate      Validate GPX files for well-formedness and coordinates.
  find-missing  Find YAMAP activities in CSV files missing corresponding MD files.
  verify        Verify consistency between GPX files and YAMAP MD records.
  test          Run the skill test suite.

Note: --root <path> is strictly required for intake, merge, annotate, validate, find-missing, and verify.
`);
    process.exit(code);
}

function parseArgs(argsArray) {
    const options = { root: null };
    for (let i = 0; i < argsArray.length; i++) {
        if (argsArray[i] === '--root' && i + 1 < argsArray.length) {
            options.root = path.resolve(argsArray[i + 1]);
            i++;
        }
    }
    return options;
}

async function run() {
    if (!command || command.startsWith('--')) {
        log.error(`Unknown subcommand: ${command || '(none)'}`);
        printUsageAndExit();
    }

    const options = parseArgs(args);

    if (command !== 'test' && !options.root) {
        log.error('Error: --root <path> is required.');
        printUsageAndExit();
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

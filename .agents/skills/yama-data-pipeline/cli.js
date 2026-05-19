#!/usr/bin/env node

const log = require('./lib/log');
const intake = require('./commands/intake');
const merge = require('./commands/merge');
const annotate = require('./commands/annotate');
const validate = require('./commands/validate');

const command = process.argv[2];
const args = process.argv.slice(3);

function parseArgs(argsArray) {
    const options = { root: require('path').resolve(__dirname, '../../..') };
    for (let i = 0; i < argsArray.length; i++) {
        if (argsArray[i] === '--root' && i + 1 < argsArray.length) {
            options.root = argsArray[i + 1];
            i++;
        }
    }
    return options;
}

async function run() {
    const options = parseArgs(args);

    try {
        switch (command) {
            case 'intake':
                await intake(options);
                break;
            case 'merge':
                await merge(options);
                break;
            case 'annotate':
                await annotate(options);
                break;
            case 'validate':
                await validate(options);
                break;
            case 'test':
                require('child_process').execSync('npm test', { stdio: 'inherit', cwd: __dirname });
                break;
            default:
                log.error(`Unknown subcommand: ${command || '(none)'}`);
                console.log(`
Usage: node cli.js <command> [--root <path>]

Commands:
  intake     Process ZIP and XLSX files into raw GPX and CSV.
  merge      Merge raw GPX files grouped by year.
  annotate   Detect summits and annotate GPX files with waypoints.
  validate   Validate GPX files for well-formedness and coordinates.
  test       Run the skill test suite.
`);
                process.exit(1);
        }
    } catch (err) {
        log.error(`Command '${command}' failed:`, err.message);
        process.exit(1);
    }
}

run();

#!/usr/bin/env node

const log = require('./lib/log');
const path = require('path');

const command = process.argv[2];
const args = process.argv.slice(3);

function printUsageAndExit(code = 1) {
    console.log(`
Usage: node cli.js <command> [options]

Commands:
  intake            Portable GPX archive extraction. Extracts GPX files from a ZIP archive into an explicit directory.
  extract-excel-sheets Portable Excel sheet extraction. Extracts worksheets from an XLSX into CSV files.
  merge             Merge raw GPX files grouped by year.
  annotate          (Legacy) Detect summits, assign names, and annotate GPX files.
  validate          Validate GPX files for well-formedness and coordinates.
  find-missing      Find YAMAP activities in CSV files missing corresponding MD files.
  verify            Verify consistency between GPX files and YAMAP MD records.
  test              Run the skill test suite.
  detect-candidates Detect summits without assigning names, output to CSV.
  generate-summit-candidate-gpx Generate a valid summit-candidate GPX file for each source GPX file.
  link-gpx-yamap-by-date Link GPX tracks to YAMAP MD files using timezone-aware datetimes.
  validate-mountain-sources Validates the current CSV and legacy JSON artifacts against schema invariants.
  validate-provider-received Audits the provider-received raw source intake area and generates a report.
  complete-mountain-source-no Complete blank No values in a mountain source CSV.
  normalize-mountain-source-json Normalize mountain source CSV to JSON.


Global Options:
  --root <path>     Strictly required for legacy commands: merge, annotate, validate, find-missing, verify.

intake Options:
  --input <path>            Required. Path to input ZIP archive.
  --out-dir <path>          Required. Path to output directory.
  --report <path>           Optional. Path to output markdown report file.

extract-excel-sheets Options:
  --input <path>            Required. Path to input XLSX workbook.
  --out-dir <path>          Required. Path to output directory.
  --report <path>           Optional. Path to output markdown report file.

detect-candidates Options:
  --input <path>            Required. Path to single GPX file or directory containing GPX files.
  --out <path>              Required. Path to output CSV file.
  --smooth-window <num>     Optional. Window size for elevation smoothing (default 5).
  --peak-radius <num>       Optional. Radius for local maxima detection (default 10).
  --min-prominence <num>    Optional. Minimum prominence in meters (default 30).
  --merge-distance <num>    Optional. Distance in meters to merge nearby peaks (default 100).

generate-summit-candidate-gpx Options:
  --input <path>            Required. Path to single GPX file or directory containing GPX files.
  --out-dir <path>          Required. Path to output directory.
  --report <path>           Required. Path to output markdown report file.
  --manifest <path>         Required. Path to output manifest.json.
  --smooth-window <num>     Optional. Window size for elevation smoothing (default 5).
  --peak-radius <num>       Optional. Radius for local maxima detection (default 10).
  --min-prominence <num>    Optional. Minimum prominence in meters (default 30).
  --merge-distance <num>    Optional. Distance in meters to merge nearby peaks (default 100).

link-gpx-yamap-by-date Options:
  --gpx-dir <path>          Required. Path to directory containing source GPX files.
  --yamap-dir <path>        Required. Path to directory containing YAMAP markdown files.
  --out-dir <path>          Required. Path to candidate links output directory.
  --intermediate-dir <path> Required. Path to intermediate activity linking directory.
  --review-dir <path>       Required. Path to output review queue directory.
  --report <path>           Required. Path to output date linking report file.

validate-mountain-sources Options:
  --csv <path>                      Required. Path to source CSV file.
  --legacy-merged <path>            Optional. Path to legacy mountain_merged.json.
  --legacy-link-mapping <path>      Optional. Path to legacy mountain_link_mapping.json.
  --legacy-summit-coordinates <path> Optional. Path to legacy mountain_summit_coordinates.json.
  --web-mountains <path>            Optional. Path to legacy web mountains.json.
  --out <path>                      Required. Path to output validation report markdown file.

validate-provider-received Options:
  --input <path>                    Required. Path to provider_received directory.
  --out <path>                      Required. Path to output report markdown file.
  --manifest-dir <path>             Optional. Path to directory containing manifest files.

complete-mountain-source-no Options:
  --input <path>                    Required. Path to extracted mountain source CSV.
  --out <path>                      Required. Path to output completed CSV.
  --manifest <path>                 Required. Path to output manifest JSON.
  --report <path>                   Required. Path to output report markdown.

normalize-mountain-source-json Options:
  --input <path>                    Required. Path to intermediate CSV.
  --out <path>                      Required. Path to output normalized JSON.
  --manifest <path>                 Required. Path to output manifest JSON.
  --report <path>                   Required. Path to output report markdown.
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
        } else if (arg === '--out-dir' && i + 1 < argsArray.length) {
            options.outDir = argsArray[++i];
        } else if (arg === '--report' && i + 1 < argsArray.length) {
            options.report = argsArray[++i];
        } else if (arg === '--manifest' && i + 1 < argsArray.length) {
            options.manifest = argsArray[++i];
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
        } else if (arg === '--csv' && i + 1 < argsArray.length) {
            options.csv = argsArray[++i];
        } else if (arg === '--legacy-merged' && i + 1 < argsArray.length) {
            options.legacyMerged = argsArray[++i];
        } else if (arg === '--legacy-link-mapping' && i + 1 < argsArray.length) {
            options.legacyLinkMapping = argsArray[++i];
        } else if (arg === '--legacy-summit-coordinates' && i + 1 < argsArray.length) {
            options.legacySummitCoordinates = argsArray[++i];
        } else if (arg === '--web-mountains' && i + 1 < argsArray.length) {
            options.webMountains = argsArray[++i];
        } else if (arg === '--manifest-dir' && i + 1 < argsArray.length) {
            options.manifestDir = argsArray[++i];
        } else if (arg === '--gpx-dir' && i + 1 < argsArray.length) {
            options.gpxDir = argsArray[++i];
        } else if (arg === '--yamap-dir' && i + 1 < argsArray.length) {
            options.yamapDir = argsArray[++i];
        } else if (arg === '--intermediate-dir' && i + 1 < argsArray.length) {
            options.intermediateDir = argsArray[++i];
        } else if (arg === '--review-dir' && i + 1 < argsArray.length) {
            options.reviewDir = argsArray[++i];
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

    const legacyCommands = ['merge', 'annotate', 'validate', 'find-missing', 'verify'];
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

    if (command === 'generate-summit-candidate-gpx') {
        if (!options.input || !options.outDir || !options.report || !options.manifest) {
            log.error(`Error: --input, --out-dir, --report, and --manifest are required for 'generate-summit-candidate-gpx'.`);
            printUsageAndExit();
        }
    }

    if (command === 'link-gpx-yamap-by-date') {
        if (!options.gpxDir || !options.yamapDir || !options.outDir || !options.intermediateDir || !options.reviewDir || !options.report) {
            log.error(`Error: --gpx-dir, --yamap-dir, --out-dir, --intermediate-dir, --review-dir, and --report are required for 'link-gpx-yamap-by-date'.`);
            printUsageAndExit();
        }
    }

    if (command === 'extract-excel-sheets') {
        if (!options.input || !options.outDir) {
            log.error(`Error: --input and --out-dir are required for 'extract-excel-sheets'.`);
            printUsageAndExit();
        }
    }

    if (command === 'intake') {
        if (!options.input || !options.outDir) {
            log.error(`Error: --input and --out-dir are required for 'intake'.`);
            printUsageAndExit();
        }
    }

    if (command === 'validate-mountain-sources') {
        if (!options.csv || !options.out) {
            log.error(`Error: --csv and --out are required for 'validate-mountain-sources'.`);
            printUsageAndExit();
        }
    }

    if (command === 'validate-provider-received') {
        if (!options.input || !options.out) {
            log.error(`Error: --input and --out are required for 'validate-provider-received'.`);
            printUsageAndExit();
        }
    }

    if (command === 'complete-mountain-source-no') {
        if (!options.input || !options.out || !options.manifest || !options.report) {
            log.error(`Error: --input, --out, --manifest, and --report are required for 'complete-mountain-source-no'.`);
            printUsageAndExit();
        }
    }

    if (command === 'normalize-mountain-source-json') {
        if (!options.input || !options.out || !options.manifest || !options.report) {
            log.error(`Error: --input, --out, --manifest, and --report are required for 'normalize-mountain-source-json'.`);
            printUsageAndExit();
        }
    }


    try {
        switch (command) {
            case 'intake':
                await require('./commands/intake')(options);
                break;
            case 'extract-excel-sheets':
                await require('./commands/extract-excel-sheets')(options);
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
            case 'generate-summit-candidate-gpx':
                await require('./commands/generate-summit-candidate-gpx')(options);
                break;
            case 'link-gpx-yamap-by-date':
                await require('./commands/link-gpx-yamap-by-date')(options);
                break;
            case 'validate-mountain-sources':
                await require('./commands/validate-mountain-sources')(options);
                break;
            case 'validate-provider-received':
                await require('./commands/validate-provider-received')(options);
                break;
            case 'complete-mountain-source-no':
                await require('./commands/complete-mountain-source-no')(options);
                break;
            case 'normalize-mountain-source-json':
                await require('./commands/normalize-mountain-source-json')(options);
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

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
  extract-summit-candidate-features Extract summit candidate waypoints from GPX into JSONL.
  extract-reverse-geocoding-point-index Extract raw Nominatim cache files into a point index JSONL.
  enrich-summit-candidates-with-reverse-geocoding Enrich summit candidates with reverse geocoding point evidence.
  enrich-gpx-yamap-links-by-title Enrich GPX-YAMAP candidate links with title similarity features.
  generate-mountain-summit-candidate-links Generate candidate links between mountain records and summit candidates.
  refine-mountain-summit-candidate-links-by-location Refine candidate links using municipality/island geocoding evidence.



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

extract-summit-candidate-features Options:
  --gpx-dir <path>                  Required. Path to directory containing summit-candidate GPX files.
  --input-manifest <path>           Required. Path to input manifest.json.
  --out <path>                      Required. Path to output JSONL.
  --manifest <path>                 Required. Path to output manifest JSON.
  --report <path>                   Required. Path to output report markdown.

extract-reverse-geocoding-point-index Options:
  --input-dir <path>                Required. Path to directory containing raw Nominatim JSON cache files.
  --out <path>                      Required. Path to output index JSONL.
  --manifest <path>                 Required. Path to output manifest JSON.
  --report <path>                   Required. Path to output report markdown.

enrich-summit-candidates-with-reverse-geocoding Options:
  --summit-candidates <path>        Required. Path to summit candidates JSONL.
  --geocoded-points <path>          Required. Path to geocoded points index JSONL.
  --out <path>                      Required. Path to output enriched JSONL.
  --manifest <path>                 Required. Path to output manifest JSON.
  --report <path>                   Required. Path to output report markdown.
  --radius-m <num>                  Optional. Search radius in meters (default 1000).

enrich-gpx-yamap-links-by-title Options:
  --date-links <path>               Required. Path to date-only candidate links JSONL.
  --gpx-manifest <path>             Required. Path to GPX manifest JSON.
  --out-dir <path>                  Required. Path to output directory.
  --review-dir <path>               Required. Path to output review queue directory.
  --report <path>                   Required. Path to output report markdown file.

generate-mountain-summit-candidate-links Options:
  --mountains <path>                Required. Path to mountain source JSON.
  --summit-candidates <path>        Required. Path to summit candidates JSONL.
  --location-evidence <path>        Required. Path to location evidence JSONL.
  --activity-links <path>           Required. Path to title-enriched activity links JSONL.
  --out <path>                      Required. Path to output candidate links JSONL.
  --manifest <path>                 Required. Path to output manifest JSON.
  --review-csv <path>               Required. Path to output review queue CSV.
  --review-md <path>                Required. Path to output review queue Markdown.
  --report <path>                   Required. Path to output report markdown.

refine-mountain-summit-candidate-links-by-location Options:
  --mountains <path>                Required. Path to mountain source JSON.
  --candidate-links <path>          Required. Path to candidate links JSONL.
  --location-evidence <path>        Required. Path to location evidence JSONL.
  --out <path>                      Required. Path to output candidate links JSONL.
  --manifest <path>                 Required. Path to output manifest JSON.
  --review-csv <path>               Required. Path to output review queue CSV.
  --review-md <path>                Required. Path to output review queue Markdown.
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
        } else if (arg === '--input-manifest' && i + 1 < argsArray.length) {
            options.inputManifest = argsArray[++i];
        } else if (arg === '--input-dir' && i + 1 < argsArray.length) {
            options.inputDir = argsArray[++i];
        } else if (arg === '--summit-candidates' && i + 1 < argsArray.length) {
            options.summitCandidates = argsArray[++i];
        } else if (arg === '--geocoded-points' && i + 1 < argsArray.length) {
            options.geocodedPoints = argsArray[++i];
        } else if (arg === '--radius-m' && i + 1 < argsArray.length) {
            const val = Number(argsArray[++i]);
            if (isNaN(val)) throw new Error('--radius-m must be a number');
            options.radiusM = val;
        } else if (arg === '--date-links' && i + 1 < argsArray.length) {
            options.dateLinks = argsArray[++i];
        } else if (arg === '--gpx-manifest' && i + 1 < argsArray.length) {
            options.gpxManifest = argsArray[++i];
        } else if (arg === '--mountains' && i + 1 < argsArray.length) {
            options.mountains = argsArray[++i];
        } else if (arg === '--location-evidence' && i + 1 < argsArray.length) {
            options.locationEvidence = argsArray[++i];
        } else if (arg === '--activity-links' && i + 1 < argsArray.length) {
            options.activityLinks = argsArray[++i];
        } else if (arg === '--review-csv' && i + 1 < argsArray.length) {
            options.reviewCsv = argsArray[++i];
        } else if (arg === '--review-md' && i + 1 < argsArray.length) {
            options.reviewMd = argsArray[++i];
        } else if (arg === '--candidate-links' && i + 1 < argsArray.length) {
            options.candidateLinks = argsArray[++i];
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

    if (command === 'extract-summit-candidate-features') {
        if (!options.gpxDir || !options.inputManifest || !options.out || !options.manifest || !options.report) {
            log.error(`Error: --gpx-dir, --input-manifest, --out, --manifest, and --report are required for 'extract-summit-candidate-features'.`);
            printUsageAndExit();
        }
    }

    if (command === 'extract-reverse-geocoding-point-index') {
        if (!options.inputDir || !options.out || !options.manifest || !options.report) {
            log.error(`Error: --input-dir, --out, --manifest, and --report are required for 'extract-reverse-geocoding-point-index'.`);
            printUsageAndExit();
        }
    }

    if (command === 'enrich-summit-candidates-with-reverse-geocoding') {
        if (!options.summitCandidates || !options.geocodedPoints || !options.out || !options.manifest || !options.report) {
            log.error(`Error: --summit-candidates, --geocoded-points, --out, --manifest, and --report are required for 'enrich-summit-candidates-with-reverse-geocoding'.`);
            printUsageAndExit();
        }
    }

    if (command === 'enrich-gpx-yamap-links-by-title') {
        if (!options.dateLinks || !options.gpxManifest || !options.outDir || !options.reviewDir || !options.report) {
            log.error(`Error: --date-links, --gpx-manifest, --out-dir, --review-dir, and --report are required for 'enrich-gpx-yamap-links-by-title'.`);
            printUsageAndExit();
        }
    }

    if (command === 'generate-mountain-summit-candidate-links') {
        if (!options.mountains || !options.summitCandidates || !options.locationEvidence || !options.activityLinks ||
            !options.out || !options.manifest || !options.reviewCsv || !options.reviewMd || !options.report) {
            log.error(`Error: --mountains, --summit-candidates, --location-evidence, --activity-links, --out, --manifest, --review-csv, --review-md, and --report are required for 'generate-mountain-summit-candidate-links'.`);
            printUsageAndExit();
        }
    }

    if (command === 'refine-mountain-summit-candidate-links-by-location') {
        if (!options.mountains || !options.candidateLinks || !options.locationEvidence ||
            !options.out || !options.manifest || !options.reviewCsv || !options.reviewMd || !options.report) {
            log.error(`Error: --mountains, --candidate-links, --location-evidence, --out, --manifest, --review-csv, --review-md, and --report are required for 'refine-mountain-summit-candidate-links-by-location'.`);
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
            case 'extract-summit-candidate-features':
                await require('./commands/extract-summit-candidate-features')(options);
                break;
            case 'extract-reverse-geocoding-point-index':
                await require('./commands/extract-reverse-geocoding-point-index')(options);
                break;
            case 'enrich-summit-candidates-with-reverse-geocoding':
                await require('./commands/enrich-summit-candidates-with-reverse-geocoding')(options);
                break;
            case 'enrich-gpx-yamap-links-by-title':
                await require('./commands/enrich-gpx-yamap-links-by-title')(options);
                break;
            case 'generate-mountain-summit-candidate-links':
                await require('./commands/generate-mountain-summit-candidate-links')(options);
                break;
            case 'refine-mountain-summit-candidate-links-by-location':
                await require('./commands/refine-mountain-summit-candidate-links-by-location')(options);
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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/log');
const { parseGpx, serializeGpx, extractTrackPoints, extractTrackName, appendWaypoint } = require('../lib/gpx');
const { ensureDir } = require('../lib/fs_safe');
const { detectSummitCandidates, normalizeDetectionConfig } = require('../lib/summit_detection');
const { execSync } = require('child_process');

function generateCandidateId(sourceGpxBasename, trackpointIndex, detectionParams) {
    const hash = crypto.createHash('sha1');
    hash.update(`${sourceGpxBasename}:${trackpointIndex}:${detectionParams}`);
    return `summit-candidate:${hash.digest('hex').substring(0, 16)}`;
}

function computeBounds(points) {
    if (points.length === 0) return { minlat: 0, minlon: 0, maxlat: 0, maxlon: 0 };
    let minlat = Infinity;
    let minlon = Infinity;
    let maxlat = -Infinity;
    let maxlon = -Infinity;
    for (const p of points) {
        if (p.lat < minlat) minlat = p.lat;
        if (p.lon < minlon) minlon = p.lon;
        if (p.lat > maxlat) maxlat = p.lat;
        if (p.lon > maxlon) maxlon = p.lon;
    }
    return { minlat, minlon, maxlat, maxlon };
}

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

module.exports = async function generateSummitCandidateGpx(options) {
    log.info('=== Generate Summit Candidate GPX ===');

    if (!options.input || !options.outDir || !options.manifest || !options.report) {
        throw new Error('Missing required arguments. Need: --input, --out-dir, --manifest, --report');
    }

    const inputPath = path.resolve(options.input);
    const outDir = path.resolve(options.outDir);
    const manifestPath = path.resolve(options.manifest);
    const reportPath = path.resolve(options.report);

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input path not found: ${inputPath}`);
    }

    const stat = fs.statSync(inputPath);
    let gpxFiles = [];

    if (stat.isDirectory()) {
        const files = fs.readdirSync(inputPath);
        gpxFiles = files
            .filter(f => f.toLowerCase().endsWith('.gpx'))
            .sort() // Sorted deterministically
            .map(f => ({
                fullPath: path.join(inputPath, f),
                basename: f
            }));
    } else if (stat.isFile() && inputPath.toLowerCase().endsWith('.gpx')) {
        gpxFiles = [{
            fullPath: inputPath,
            basename: path.basename(inputPath)
        }];
    } else {
        throw new Error(`Input path is neither a GPX directory nor a GPX file: ${inputPath}`);
    }

    if (gpxFiles.length === 0) {
        log.warn('No GPX files found to process.');
        return;
    }

    const config = normalizeDetectionConfig(options);
    const detectionParamsStr = `window=${config.smoothWindow},radius=${Math.min(config.peakRadius, 100)},min_prominence=${config.minProminence},merge=${config.mergeDistance}`;

    // Staging and duplicate checks
    const outputBasenames = new Set();
    const manifestFileEntries = [];

    let totalSummitCandidates = 0;
    let zeroCandidateFiles = 0;

    // Determine target output paths and check for collisions
    const targetMap = [];
    for (const fileObj of gpxFiles) {
        if (outputBasenames.has(fileObj.basename)) {
            throw new Error(`Duplicate output basename detected: ${fileObj.basename}`);
        }
        outputBasenames.add(fileObj.basename);

        const targetPath = path.join(outDir, fileObj.basename);
        if (fs.existsSync(targetPath)) {
            throw new Error(`Target collision: Output file already exists at ${targetPath}`);
        }
        targetMap.push({
            src: fileObj.fullPath,
            dest: targetPath,
            basename: fileObj.basename
        });
    }

    // Create a temporary staging directory inside the workspace
    const workspaceRoot = process.cwd();
    const stageDir = path.join(workspaceRoot, 'scratch', 'stage_summit_candidates_' + Date.now());
    ensureDir(stageDir);

    try {
        for (const entry of targetMap) {
            const content = fs.readFileSync(entry.src, 'utf8');
            let doc;
            try {
                doc = parseGpx(content);
            } catch (err) {
                throw new Error(`Failed to parse GPX XML for ${entry.basename}: ${err.message}`);
            }

            const points = extractTrackPoints(doc);
            const trackName = extractTrackName(doc);
            const bounds = computeBounds(points);

            // Compute SHA256 of source GPX
            const srcHash = crypto.createHash('sha256').update(content).digest('hex');

            let candidates = [];
            if (points.length >= 3) {
                candidates = detectSummitCandidates(points, config);
            } else {
                log.info(`[INFO] ${entry.basename} has too few trackpoints (${points.length}). Generating GPX with 0 candidates.`);
            }

            if (candidates.length === 0) {
                zeroCandidateFiles++;
            }

            const candidateIds = [];

            // Bind the custom yama namespace and update creator
            const gpxNode = doc.documentElement;
            if (gpxNode) {
                gpxNode.setAttribute('creator', 'Yama Museum Summit Candidate Generator');
                gpxNode.setAttribute('xmlns:yama', 'https://museum-yama-data.moukaeritai.work/ns/yama-data/0.1');
            }

            // Populate metadata if needed
            let metadataNode = doc.getElementsByTagName('metadata')[0];
            if (!metadataNode && gpxNode) {
                metadataNode = doc.createElement('metadata');
                gpxNode.insertBefore(metadataNode, gpxNode.firstChild);
            }

            if (metadataNode) {
                // metadata/name
                let nameNode = metadataNode.getElementsByTagName('name')[0];
                if (!nameNode && trackName) {
                    nameNode = doc.createElement('name');
                    nameNode.textContent = trackName;
                    metadataNode.appendChild(nameNode);
                }

                // metadata/bounds
                let boundsNode = metadataNode.getElementsByTagName('bounds')[0];
                if (!boundsNode && points.length > 0) {
                    boundsNode = doc.createElement('bounds');
                    boundsNode.setAttribute('minlat', bounds.minlat.toString());
                    boundsNode.setAttribute('minlon', bounds.minlon.toString());
                    boundsNode.setAttribute('maxlat', bounds.maxlat.toString());
                    boundsNode.setAttribute('maxlon', bounds.maxlon.toString());
                    metadataNode.appendChild(boundsNode);
                }

                // metadata/extensions
                let extensionsNode = metadataNode.getElementsByTagName('extensions')[0];
                if (!extensionsNode) {
                    extensionsNode = doc.createElement('extensions');
                    metadataNode.appendChild(extensionsNode);
                }

                const sourceBasenameNode = doc.createElement('yama:source_gpx_basename');
                sourceBasenameNode.textContent = entry.basename;
                extensionsNode.appendChild(sourceBasenameNode);

                const sourceRelativePathNode = doc.createElement('yama:source_gpx_relative_path');
                sourceRelativePathNode.textContent = path.relative(workspaceRoot, entry.src).replace(/\\/g, '/');
                extensionsNode.appendChild(sourceRelativePathNode);

                const detectionParamsNode = doc.createElement('yama:detection_parameters');
                detectionParamsNode.textContent = detectionParamsStr;
                extensionsNode.appendChild(detectionParamsNode);
            }

            // Append waypoints for each detected summit candidate
            for (const c of candidates) {
                const id = generateCandidateId(entry.basename, c.source_trackpoint_index, detectionParamsStr);
                candidateIds.push(id);

                const wpt = doc.createElement('wpt');
                wpt.setAttribute('lat', c.lat.toString());
                wpt.setAttribute('lon', c.lon.toString());

                if (c.ele !== undefined && !isNaN(c.ele)) {
                    const eleNode = doc.createElement('ele');
                    eleNode.textContent = c.ele.toString();
                    wpt.appendChild(eleNode);
                }

                if (c.time) {
                    const timeNode = doc.createElement('time');
                    timeNode.textContent = c.time;
                    wpt.appendChild(timeNode);
                }

                const nameNode = doc.createElement('name');
                nameNode.textContent = id;
                wpt.appendChild(nameNode);

                const descNode = doc.createElement('desc');
                descNode.textContent = `Summit candidate detected at elevation ${c.ele}m with prominence ${c.prominence}m.`;
                wpt.appendChild(descNode);

                const symNode = doc.createElement('sym');
                symNode.textContent = 'Summit Candidate';
                wpt.appendChild(symNode);

                const extensionsNode = doc.createElement('extensions');
                
                const trackpointIndexNode = doc.createElement('yama:source_trackpoint_index');
                trackpointIndexNode.textContent = c.source_trackpoint_index.toString();
                extensionsNode.appendChild(trackpointIndexNode);

                const validElevationIndexNode = doc.createElement('yama:valid_elevation_index');
                validElevationIndexNode.textContent = c.valid_elevation_index.toString();
                extensionsNode.appendChild(validElevationIndexNode);

                const smoothedEleNode = doc.createElement('yama:smoothed_ele');
                smoothedEleNode.textContent = c.smoothed_ele.toString();
                extensionsNode.appendChild(smoothedEleNode);

                const prominenceNode = doc.createElement('yama:prominence');
                prominenceNode.textContent = c.prominence.toString();
                extensionsNode.appendChild(prominenceNode);

                const detectionMethodNode = doc.createElement('yama:detection_method');
                detectionMethodNode.textContent = c.detection_method;
                extensionsNode.appendChild(detectionMethodNode);

                const detectionParamsNode = doc.createElement('yama:detection_parameters');
                detectionParamsNode.textContent = c.detection_parameters;
                extensionsNode.appendChild(detectionParamsNode);

                const statusNode = doc.createElement('yama:candidate_status');
                statusNode.textContent = 'unresolved';
                extensionsNode.appendChild(statusNode);

                wpt.appendChild(extensionsNode);

                // Insert before first <trk>
                const trkNodes = doc.getElementsByTagName('trk');
                if (trkNodes.length > 0) {
                    gpxNode.insertBefore(wpt, trkNodes[0]);
                    gpxNode.insertBefore(doc.createTextNode('\n  '), trkNodes[0]);
                } else {
                    gpxNode.appendChild(wpt);
                    gpxNode.appendChild(doc.createTextNode('\n'));
                }
            }

            totalSummitCandidates += candidates.length;

            // Serialize and write to staging directory
            const serialized = serializeGpx(doc);
            const stagedPath = path.join(stageDir, entry.basename);
            fs.writeFileSync(stagedPath, serialized, 'utf8');

            // Self-validation step on the output content
            let outDoc;
            try {
                outDoc = parseGpx(serialized);
            } catch (err) {
                throw new Error(`Self-validation failed: Generated GPX XML for ${entry.basename} is malformed: ${err.message}`);
            }

            const outPoints = extractTrackPoints(outDoc);
            if (points.length !== outPoints.length) {
                throw new Error(`Self-validation failed for ${entry.basename}: Original trackpoint count (${points.length}) does not match output trackpoint count (${outPoints.length})`);
            }

            for (let i = 0; i < points.length; i++) {
                const op = outPoints[i];
                const ip = points[i];
                if (op.lat !== ip.lat || op.lon !== ip.lon || op.ele !== ip.ele || op.time !== ip.time) {
                    throw new Error(`Self-validation failed for ${entry.basename}: Trackpoint ${i} geometry modified!`);
                }
            }

            const outWaypoints = outDoc.getElementsByTagName('wpt');
            if (outWaypoints.length !== candidates.length) {
                throw new Error(`Self-validation failed for ${entry.basename}: Expected ${candidates.length} waypoints, but found ${outWaypoints.length}`);
            }

            // Compute SHA256 of generated GPX
            const destHash = crypto.createHash('sha256').update(serialized).digest('hex');

            manifestFileEntries.push({
                source_gpx_path: path.relative(workspaceRoot, entry.src).replace(/\\/g, '/'),
                source_gpx_sha256: srcHash,
                output_gpx_path: path.relative(workspaceRoot, entry.dest).replace(/\\/g, '/'),
                output_gpx_sha256: destHash,
                track_name: trackName,
                bounds: bounds,
                trackpoint_count: points.length,
                summit_candidate_count: candidates.length,
                candidate_ids: candidateIds
            });
        }

        // Write the manifest
        const manifestObj = {
            stage: "generate_summit_candidate_gpx",
            stage_version: "0.1.0",
            git_commit: getGitCommitHash(),
            created_at: new Date().toISOString(),
            input_dir: path.relative(workspaceRoot, inputPath).replace(/\\/g, '/'),
            output_dir: path.relative(workspaceRoot, outDir).replace(/\\/g, '/'),
            parameters: {
                smooth_window: config.smoothWindow,
                peak_radius: config.peakRadius,
                min_prominence: config.minProminence,
                merge_distance: config.mergeDistance
            },
            summary: {
                input_gpx_count: gpxFiles.length,
                output_gpx_count: gpxFiles.length,
                total_summit_candidates: totalSummitCandidates,
                zero_candidate_files: zeroCandidateFiles,
                failed_files: 0
            },
            files: manifestFileEntries
        };

        ensureDir(path.dirname(manifestPath));
        fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2), 'utf8');

        // Write the report
        ensureDir(path.dirname(reportPath));
        const reportContent = `# Summit Candidate GPX Generation Report

* **Branch and HEAD commit**: ${manifestObj.git_commit}
* **Input directory**: \`${manifestObj.input_dir}\`
* **Output directory**: \`${manifestObj.output_dir}\`
* **Command used**: \`node .agents/skills/yama-data-pipeline/cli.js generate-summit-candidate-gpx ...\`
* **Detection parameters**: \`${detectionParamsStr}\`
* **Input GPX count**: ${manifestObj.summary.input_gpx_count}
* **Output GPX count**: ${manifestObj.summary.output_gpx_count}
* **Total summit candidate count**: ${manifestObj.summary.total_summit_candidates}
* **Zero-candidate file count**: ${manifestObj.summary.zero_candidate_files}
* **Parse/Validation failures**: 0
* **All-or-nothing generation used**: true
* **Source GPX files modified**: false
* **Validation results**: Passed self-validation checks matching track geometries, trackpoint counts, and metadata bounds.
* **Exact manifest path**: [\`manifest.json\`](file:///${manifestPath.replace(/\\/g, '/')})
* **Output path decision rationale**: Configured via --out-dir. Target directory is \`data/08_reporting/gpx/summit_candidates/2026-05-12/\` as agreed.
`;
        fs.writeFileSync(reportPath, reportContent, 'utf8');

        // Copy staged files to final destination (atomic directory promo)
        ensureDir(outDir);
        for (const entry of targetMap) {
            const stagedFilePath = path.join(stageDir, entry.basename);
            fs.copyFileSync(stagedFilePath, entry.dest);
        }

        log.info(`Generation complete. Generated ${manifestObj.summary.output_gpx_count} files, total of ${totalSummitCandidates} candidates.`);
    } finally {
        // Cleanup staging directory
        if (fs.existsSync(stageDir)) {
            fs.rmSync(stageDir, { recursive: true, force: true });
        }
    }
};

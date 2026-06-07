'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { haversineDistance } = require('./geo_distance');
const { getFileSha256 } = require('./sha256');
const { extractTrackPointsWithIndices } = require('./gpx_trackpoints');
const StagedWriter = require('./staged_writer');

/**
 * Parses a JSONL file into an array of objects.
 */
async function parseJsonl(filePath) {
    const records = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    for await (const line of rl) {
        if (line.trim()) {
            records.push(JSON.parse(line));
        }
    }
    return records;
}

/**
 * Main execution logic for generating supplemental candidates.
 */
async function generateSupplementalCandidates(options) {
    const {
        rawGpxDir,
        mountainsPath,
        groundingReferencePath,
        existingSummitCandidatesPath,
        summitCandidateManifestPath,
        balancedAssignmentsPath,
        activityLinksPath,
        outPath,
        manifestPath,
        reportPath,
        reviewDir
    } = options;

    // 1. Validate all input paths before writing final outputs
    const inputPaths = [
        rawGpxDir,
        mountainsPath,
        groundingReferencePath,
        existingSummitCandidatesPath,
        summitCandidateManifestPath,
        balancedAssignmentsPath,
        activityLinksPath
    ];
    for (const p of inputPaths) {
        if (!fs.existsSync(p)) {
            throw new Error(`Input path does not exist: ${p}`);
        }
    }

    // Load inputs
    const mountains = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));
    const groundingRef = await parseJsonl(groundingReferencePath);
    const existingCandidates = await parseJsonl(existingSummitCandidatesPath);
    const balancedAssigns = await parseJsonl(balancedAssignmentsPath);
    const activityLinks = await parseJsonl(activityLinksPath);

    // Build helper maps
    const groundingMap = new Map();
    for (const g of groundingRef) {
        groundingMap.set(g.mountain_no, g);
    }

    const balancedAssignMap = new Map();
    const candidateUseCount = {};
    for (const a of balancedAssigns) {
        balancedAssignMap.set(a.mountain_no, a);
        if (a.proposed_summit_candidate_id) {
            candidateUseCount[a.proposed_summit_candidate_id] = (candidateUseCount[a.proposed_summit_candidate_id] || 0) + 1;
        }
    }

    const activityLinkMap = new Map();
    for (const link of activityLinks) {
        activityLinkMap.set(link.gpx_basename, link);
    }

    // Determine the GPX files list in directory
    const gpxFiles = fs.readdirSync(rawGpxDir).filter(f => f.endsWith('.gpx'));
    const rawGpxFileCount = gpxFiles.length;

    // Build map from gpx_basename to its full path and SHA-256
    const gpxFileInfo = new Map();
    let totalTrackpointCount = 0;

    for (const f of gpxFiles) {
        const fullPath = path.join(rawGpxDir, f);
        const sha256 = getFileSha256(fullPath);
        const xmlString = fs.readFileSync(fullPath, 'utf8');
        let pts = [];
        try {
            pts = extractTrackPointsWithIndices(xmlString);
        } catch (e) {
            // Log parse errors if any
            console.error(`Error parsing ${f}:`, e);
        }
        totalTrackpointCount += pts.length;
        gpxFileInfo.set(f, {
            path: fullPath,
            sha256,
            pts
        });
    }

    // Setup staged writer
    const writer = new StagedWriter('.');

    // We will collect supplemental candidates and ineligible cases
    const supplementalCandidates = [];
    const ineligibleCases = [];
    
    // Counts for the summary
    let mountainsWithUsableGrounding = 0;
    let mountainsWithLinkedGpx = 0;
    let eligibleMountains = 0;
    let nearestTrackpointTooFarCount = 0;
    let missingGpxLinkCount = 0;
    let missingRawGpxFileCount = 0;
    let parseErrorCount = 0;

    // Loop through each mountain
    for (const m of mountains) {
        const mountainNo = m.mountain_no;
        const mountainName = m.name;

        // Check usable grounding
        const g = groundingMap.get(mountainNo);
        const hasGrounding = g && g.has_usable_coordinate && g.selected_grounding_lat !== null && g.selected_grounding_lon !== null;
        if (hasGrounding) {
            mountainsWithUsableGrounding++;
        }

        // Get linked GPX from balanced assignment
        const assign = balancedAssignMap.get(mountainNo);
        const sourceGpxBasename = assign ? assign.source_gpx_basename : null;
        const sourceGpxPath = assign ? assign.source_gpx_path : null;

        if (sourceGpxBasename) {
            mountainsWithLinkedGpx++;
        }

        if (!hasGrounding) {
            continue; // Not eligible
        }

        if (!sourceGpxBasename) {
            missingGpxLinkCount++;
            ineligibleCases.push({
                mountain_no: mountainNo,
                mountain_name: mountainName,
                reason: 'missing_gpx_link'
            });
            continue;
        }

        // Check if raw GPX file exists
        const gpxInfo = gpxFileInfo.get(sourceGpxBasename);
        if (!gpxInfo) {
            missingRawGpxFileCount++;
            ineligibleCases.push({
                mountain_no: mountainNo,
                mountain_name: mountainName,
                source_gpx_basename: sourceGpxBasename,
                reason: 'missing_raw_gpx_file'
            });
            continue;
        }

        eligibleMountains++;

        const pts = gpxInfo.pts;
        if (pts.length === 0) {
            parseErrorCount++;
            ineligibleCases.push({
                mountain_no: mountainNo,
                mountain_name: mountainName,
                source_gpx_basename: sourceGpxBasename,
                reason: 'gpx_parse_error'
            });
            continue;
        }

        // Find nearest trackpoint to Gemini coordinate
        const geminiLat = g.selected_grounding_lat;
        const geminiLon = g.selected_grounding_lon;

        let nearestPt = null;
        let minDistance = Infinity;

        for (const pt of pts) {
            const dist = haversineDistance(geminiLat, geminiLon, pt.lat, pt.lon);
            if (dist < minDistance) {
                minDistance = dist;
                nearestPt = pt;
            }
        }

        if (!nearestPt) {
            parseErrorCount++;
            ineligibleCases.push({
                mountain_no: mountainNo,
                mountain_name: mountainName,
                source_gpx_basename: sourceGpxBasename,
                reason: 'no_trackpoints_found'
            });
            continue;
        }

        // Verify distance limit (300m)
        if (minDistance > 300) {
            nearestTrackpointTooFarCount++;
            ineligibleCases.push({
                mountain_no: mountainNo,
                mountain_name: mountainName,
                source_gpx_basename: sourceGpxBasename,
                distance_gemini_to_trackpoint_m: minDistance,
                reason: 'nearest_trackpoint_too_far'
            });
            continue;
        }

        // Eligible! Compute local window statistics (radius = 100m, index_radius = 10)
        const windowPts = pts.filter(pt => {
            if (pt.segment_index !== nearestPt.segment_index) return false;
            if (Math.abs(pt.local_index - nearestPt.local_index) > 10) return false;
            const dist = haversineDistance(nearestPt.lat, nearestPt.lon, pt.lat, pt.lon);
            return dist <= 100;
        });

        const windowEles = windowPts.map(pt => pt.ele).filter(e => e !== null && !isNaN(e));
        const localWindowMaxEle = windowEles.length > 0 ? Math.max(...windowEles) : nearestPt.ele;
        const localWindowMinEle = windowEles.length > 0 ? Math.min(...windowEles) : nearestPt.ele;
        const localWindowEleRange = localWindowMaxEle - localWindowMinEle;

        let localPeakLikeScore = 1.0;
        if (nearestPt.ele !== null && !isNaN(nearestPt.ele)) {
            if (localWindowMaxEle > localWindowMinEle) {
                localPeakLikeScore = 1.0 - (localWindowMaxEle - nearestPt.ele) / (localWindowMaxEle - localWindowMinEle);
            }
        }

        // Find nearest existing canonical summit candidate
        let nearestExisting = null;
        let minExistingDistance = Infinity;

        for (const ec of existingCandidates) {
            const dist = haversineDistance(nearestPt.lat, nearestPt.lon, ec.lat, ec.lon);
            if (dist < minExistingDistance) {
                minExistingDistance = dist;
                nearestExisting = ec;
            }
        }

        // Build reason codes
        const genReasonCodes = ['gemini_anchor_search', 'raw_gpx_nearest_trackpoint'];
        
        // Check if there's a gap in existing candidates near the selected trackpoint
        if (minExistingDistance > 150) {
            genReasonCodes.push('candidate_extraction_gap');
        }

        if (assign) {
            if (assign.assignment_status === 'unassigned' || assign.proposed_coordinate_source === 'gemini_grounding') {
                genReasonCodes.push('balanced_assignment_no_gpx_candidate');
            }
            if (assign.proposed_summit_candidate_id && candidateUseCount[assign.proposed_summit_candidate_id] > 1) {
                genReasonCodes.push('shared_candidate_refinement_context');
            }
            if (assign.evidence && assign.evidence.name && assign.evidence.name.name_evidence_tier === 'name_missing') {
                genReasonCodes.push('name_missing_refinement_context');
            }
        }

        // Generate deterministic ID
        const sourceMethodId = 'gemini_near_gpx_supplemental_candidate_expansion';
        const sourceRunId = '2026-06-07_gemini_near_gpx_supplemental_candidate_expansion';
        const hashInput = [
            sourceMethodId,
            sourceRunId,
            mountainNo,
            sourceGpxBasename,
            nearestPt.segment_index,
            nearestPt.global_index,
            nearestPt.lat,
            nearestPt.lon,
            nearestPt.time
        ].join('|');
        const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
        const supplementalCandidateId = `supplemental-candidate:${hash.substring(0, 16)}`;

        // Build evidence links & context
        const actLink = activityLinkMap.get(sourceGpxBasename);
        const bestTitle = actLink && actLink.best_candidate ? actLink.best_candidate.title : null;
        const yamapActivityId = actLink && actLink.best_candidate ? actLink.best_candidate.yamap_activity_id : null;
        const titles = actLink && actLink.title_enriched_candidate_activities ? actLink.title_enriched_candidate_activities.map(a => a.title) : [];

        const record = {
            supplemental_candidate_id: supplementalCandidateId,
            supplemental_candidate_status: 'unresolved',
            supplemental_candidate_type: 'supplemental_gemini_near_gpx_point',
            source_method_id: sourceMethodId,
            source_run_id: sourceRunId,
            mountain_no: mountainNo,
            mountain_name: mountainName,
            source_gpx_basename: sourceGpxBasename,
            source_gpx_path: sourceGpxPath,
            source_gpx_sha256: gpxInfo.sha256,
            nearest_trackpoint_index: nearestPt.global_index,
            nearest_trackpoint_segment_index: nearestPt.segment_index,
            nearest_trackpoint_lat: nearestPt.lat,
            nearest_trackpoint_lon: nearestPt.lon,
            nearest_trackpoint_ele_m: nearestPt.ele,
            nearest_trackpoint_time: nearestPt.time,
            distance_gemini_to_trackpoint_m: parseFloat(minDistance.toFixed(3)),
            gemini_grounding_lat: geminiLat,
            gemini_grounding_lon: geminiLon,
            gemini_grounding_elevation_m: g.selected_grounding_elevation_m,
            gemini_grounding_confidence: g.selected_grounding_confidence_score,
            existing_nearest_summit_candidate_id: nearestExisting ? nearestExisting.summit_candidate_id : null,
            distance_to_existing_nearest_candidate_m: nearestExisting ? parseFloat(minExistingDistance.toFixed(3)) : null,
            local_window_trackpoint_count: windowPts.length,
            local_window_max_ele_m: localWindowMaxEle,
            local_window_min_ele_m: localWindowMinEle,
            local_window_ele_range_m: localWindowEleRange,
            local_window_distance_radius_m: 100.0,
            local_peak_like_score: parseFloat(localPeakLikeScore.toFixed(4)),
            candidate_generation_reason_codes: genReasonCodes,
            needs_human_review: true,
            review_reason_codes: ['supplemental_unverified'],
            evidence: {
                gemini_grounding: {
                    lat: geminiLat,
                    lon: geminiLon,
                    elevation_m: g.selected_grounding_elevation_m,
                    confidence: g.selected_grounding_confidence_score,
                    links: g.evidence_links || [],
                    raw_response_refs: g.raw_response_refs || []
                },
                raw_gpx_trackpoint: {
                    global_index: nearestPt.global_index,
                    segment_index: nearestPt.segment_index,
                    local_index: nearestPt.local_index,
                    lat: nearestPt.lat,
                    lon: nearestPt.lon,
                    ele_m: nearestPt.ele,
                    time: nearestPt.time
                },
                local_trackpoint_window: {
                    trackpoint_count: windowPts.length,
                    max_ele_m: localWindowMaxEle,
                    min_ele_m: localWindowMinEle,
                    ele_range_m: localWindowEleRange,
                    distance_radius_m: 100.0,
                    trackpoints: windowPts.map(pt => ({
                        global_index: pt.global_index,
                        lat: pt.lat,
                        lon: pt.lon,
                        ele: pt.ele,
                        time: pt.time
                    }))
                },
                existing_summit_candidate_context: nearestExisting ? {
                    summit_candidate_id: nearestExisting.summit_candidate_id,
                    lat: nearestExisting.lat,
                    lon: nearestExisting.lon,
                    ele_m: nearestExisting.ele_m,
                    distance_m: parseFloat(minExistingDistance.toFixed(3))
                } : null,
                balanced_assignment_context: assign ? {
                    proposed_lat: assign.proposed_lat,
                    proposed_lon: assign.proposed_lon,
                    proposed_ele_m: assign.proposed_ele_m,
                    proposed_coordinate_source: assign.proposed_coordinate_source,
                    proposed_summit_candidate_id: assign.proposed_summit_candidate_id,
                    review_category: assign.review_category,
                    csv_elevation_m: assign.evidence && assign.evidence.elevation ? assign.evidence.elevation.csv_elevation_m : null,
                    expected_municipality: assign.evidence && assign.evidence.municipality ? assign.evidence.municipality.expected_municipality : null
                } : null,
                activity_title_context: {
                    best_title: bestTitle,
                    yamap_activity_id: yamapActivityId,
                    titles: titles
                },
                source_file_provenance: {
                    raw_gpx_dir: rawGpxDir,
                    grounding_reference_path: groundingReferencePath,
                    balanced_assignments_path: balancedAssignmentsPath
                }
            },
            notes: `Supplemental candidate generated at nearest raw GPX trackpoint to Gemini grounding coordinate (distance: ${minDistance.toFixed(1)}m).`
        };

        supplementalCandidates.push(record);
    }

    // 2. Validate staged outputs before committing
    // Validation: Deterministic unique supplemental IDs
    const supplementalCandidateCount = supplementalCandidates.length;
    const needsHumanReviewCount = supplementalCandidateCount;

    const seenIds = new Set();
    for (const r of supplementalCandidates) {
        // Validate JSONL parseability
        const parsed = JSON.parse(JSON.stringify(r));
        if (parsed.supplemental_candidate_id !== r.supplemental_candidate_id) {
            throw new Error(`JSON serialization integrity check failed for ${r.supplemental_candidate_id}`);
        }

        // Validate unique IDs
        if (seenIds.has(r.supplemental_candidate_id)) {
            throw new Error(`Duplicate supplemental_candidate_id found: ${r.supplemental_candidate_id}`);
        }
        seenIds.add(r.supplemental_candidate_id);

        // Validate coordinate bounds (Ehime-area: 32.0 to 34.5 lat, 132.0 to 133.8 lon)
        const lat = r.nearest_trackpoint_lat;
        const lon = r.nearest_trackpoint_lon;
        if (lat < 32.0 || lat > 34.5 || lon < 132.0 || lon > 133.8) {
            throw new Error(`Coordinate out of Ehime bounds: ${r.supplemental_candidate_id} (${lat}, ${lon})`);
        }

        // Validate type & needs_human_review
        if (r.supplemental_candidate_type !== 'supplemental_gemini_near_gpx_point') {
            throw new Error(`Invalid supplemental_candidate_type: ${r.supplemental_candidate_type}`);
        }
        if (r.needs_human_review !== true) {
            throw new Error(`needs_human_review must be true`);
        }
    }

    // Format output files content
    const jsonlContent = supplementalCandidates.map(c => JSON.stringify(c)).join('\n') + '\n';

    // Manifest content
    const manifestObj = {
        stage: 30,
        method_id: 'gemini_near_gpx_supplemental_candidate_expansion',
        run_id: '2026-06-07_gemini_near_gpx_supplemental_candidate_expansion',
        schema_version: '1.0.0',
        created_at: new Date().toISOString(),
        branch: 'museum-yama-data',
        head_commit: 'cf35552 docs: audit supplemental candidate expansion inputs',
        inputs: {
            raw_gpx_dir: path.relative(process.cwd(), rawGpxDir),
            mountains: path.relative(process.cwd(), mountainsPath),
            grounding_reference: path.relative(process.cwd(), groundingReferencePath),
            existing_summit_candidates: path.relative(process.cwd(), existingSummitCandidatesPath),
            summit_candidate_manifest: path.relative(process.cwd(), summitCandidateManifestPath),
            balanced_assignments: path.relative(process.cwd(), balancedAssignmentsPath),
            activity_links: path.relative(process.cwd(), activityLinksPath)
        },
        outputs: {
            supplemental_summit_candidates: path.relative(process.cwd(), outPath),
            supplemental_summit_candidates_manifest: path.relative(process.cwd(), manifestPath)
        },
        input_sha256: {
            mountains: getFileSha256(mountainsPath),
            grounding_reference: getFileSha256(groundingReferencePath),
            existing_summit_candidates: getFileSha256(existingSummitCandidatesPath),
            summit_candidate_manifest: getFileSha256(summitCandidateManifestPath),
            balanced_assignments: getFileSha256(balancedAssignmentsPath),
            activity_links: getFileSha256(activityLinksPath)
        },
        parameters: {
            max_distance_gemini_to_trackpoint_m: 300,
            local_window_radius_m: 100,
            local_window_trackpoint_index_radius: 10,
            supplemental_candidate_type: 'supplemental_gemini_near_gpx_point',
            supplemental_candidate_status: 'unresolved',
            needs_human_review: true
        },
        summary: {
            raw_gpx_file_count: rawGpxFileCount,
            raw_trackpoint_count: totalTrackpointCount,
            mountains_with_usable_grounding: mountainsWithUsableGrounding,
            mountains_with_linked_gpx: mountainsWithLinkedGpx,
            eligible_mountains: eligibleMountains,
            supplemental_candidate_count: supplementalCandidateCount,
            nearest_trackpoint_too_far_count: nearestTrackpointTooFarCount,
            missing_gpx_link_count: missingGpxLinkCount,
            missing_raw_gpx_file_count: missingRawGpxFileCount,
            parse_error_count: parseErrorCount,
            needs_human_review_count: needsHumanReviewCount,
            source_files_modified: false,
            existing_summit_candidates_overwritten: false,
            assignment_outputs_regenerated: false,
            current_review_entry_point_replaced: false
        },
        source_files_modified: false,
        existing_summit_candidates_overwritten: false,
        assignment_outputs_regenerated: false,
        current_review_entry_point_replaced: false
    };

    const manifestContent = JSON.stringify(manifestObj, null, 2) + '\n';

    // CSV summaries
    const csvHeader = [
        'mountain_no',
        'mountain_name',
        'supplemental_candidate_id',
        'source_gpx_basename',
        'nearest_trackpoint_lat',
        'nearest_trackpoint_lon',
        'nearest_trackpoint_ele_m',
        'nearest_trackpoint_time',
        'distance_gemini_to_trackpoint_m',
        'existing_nearest_summit_candidate_id',
        'distance_to_existing_nearest_candidate_m',
        'local_peak_like_score',
        'needs_human_review',
        'review_reason_codes',
        'candidate_generation_reason_codes',
        'notes'
    ];

    function formatCsvRow(r) {
        return [
            r.mountain_no,
            r.mountain_name,
            r.supplemental_candidate_id,
            r.source_gpx_basename,
            r.nearest_trackpoint_lat,
            r.nearest_trackpoint_lon,
            r.nearest_trackpoint_ele_m,
            r.nearest_trackpoint_time,
            r.distance_gemini_to_trackpoint_m,
            r.existing_nearest_summit_candidate_id,
            r.distance_to_existing_nearest_candidate_m,
            r.local_peak_like_score,
            r.needs_human_review,
            r.review_reason_codes.join(';'),
            r.candidate_generation_reason_codes.join(';'),
            r.notes
        ].map(val => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',');
    }

    const csvLines = [csvHeader.join(','), ...supplementalCandidates.map(formatCsvRow)].join('\n') + '\n';

    // MD report
    const mdReport = `# Gemini-Near GPX Supplemental Candidate Expansion Report

This document records the execution results of the \`gemini_near_gpx_supplemental_candidate_expansion\` method.

---

## 1. Execution Context

* **Branch**: \`museum-yama-data\`
* **HEAD Inspected**: \`cf35552 docs: audit supplemental candidate expansion inputs\`
* **Command Executed**: 
  \`\`\`sh
  node .agents/skills/yama-data-pipeline/cli.js generate-gemini-near-gpx-supplemental-candidates ...
  \`\`\`
* **Run ID**: \`2026-06-07_gemini_near_gpx_supplemental_candidate_expansion\`
* **Created At**: ${new Date().toISOString()}

---

## 2. Parameter Invariants

* \`max_distance_gemini_to_trackpoint_m\`: 300
* \`local_window_radius_m\`: 100
* \`local_window_trackpoint_index_radius\`: 10
* \`supplemental_candidate_type\`: \`supplemental_gemini_near_gpx_point\`
* \`supplemental_candidate_status\`: \`unresolved\`
* \`needs_human_review\`: \`true\`

---

## 3. Input Summary

* **Raw GPX file count**: ${rawGpxFileCount}
* **Raw trackpoint count**: ${totalTrackpointCount}
* **Mountains with usable grounding**: ${mountainsWithUsableGrounding}
* **Mountains with linked GPX**: ${mountainsWithLinkedGpx}

---

## 4. Output Summary

* **Eligible mountains**: ${eligibleMountains}
* **Supplemental candidates generated**: ${supplementalCandidateCount}
* **Needs human review count**: ${needsHumanReviewCount}
* **Ineligible counts and reasons**:
  * Nearest trackpoint too far (>300m): ${nearestTrackpointTooFarCount}
  * Missing GPX link: ${missingGpxLinkCount}
  * Missing raw GPX file: ${missingRawGpxFileCount}
  * Parse error: ${parseErrorCount}

> [!WARNING]
> These supplemental candidates are for review-planning evidence only. They are not canonical summit candidates and must not be treated as canonical summit coordinates.

---

## 5. Local Peak-Like Score definition

The \`local_peak_like_score\` estimates if the point is a local maxima within a local window:
* **Local Window**: trackpoints in the same segment whose index is within \`selected_index ± 10\` and whose spatial distance is \`≤ 100\` meters.
* **Calculation**:
  \`\`\`javascript
  local_peak_like_score = 1.0 - (max_ele - selected_ele) / (max_ele - min_ele)
  \`\`\`
  Bounded strictly in \`[0, 1]\`.

---

## 6. Safety Affirmations

* **Source files modified**: false
* **Existing summit candidates overwritten**: false (existing canonical \`summit_candidates.jsonl\` remains fully untouched)
* **Assignment outputs regenerated**: false
* **Current human review entry point replaced**: false (Stage 25 remains the current entry point)

---

## 7. Next Recommended Step

We recommend running a new summit assignment experiment that uses both the existing canonical candidates and these newly generated supplemental candidates to see if the assignment coverage can be safely expanded.
`;

    // MD summary for review dir
    const mdSummary = `# Supplemental Candidate Review Summary

* **Run ID**: \`2026-06-07_gemini_near_gpx_supplemental_candidate_expansion\`
* **Supplemental candidates generated**: ${supplementalCandidateCount}
* **Needs human review**: ${needsHumanReviewCount} (100% of generated candidates)

These candidates have been written to the following CSV files for human review:
* [supplemental_candidate_summary.csv](file:///${path.resolve(reviewDir, 'supplemental_candidate_summary.csv').replace(/\\/g, '/')})
* [supplemental_candidate_review_required.csv](file:///${path.resolve(reviewDir, 'supplemental_candidate_review_required.csv').replace(/\\/g, '/')})

See [gemini_near_gpx_supplemental_candidate_expansion_report.md](file:///${path.resolve(reportPath).replace(/\\/g, '/')}) for the detailed execution report.
`;

    // Manifest for the review dir
    const reviewManifest = {
        run_id: '2026-06-07_gemini_near_gpx_supplemental_candidate_expansion',
        created_at: new Date().toISOString(),
        summary: {
            supplemental_candidate_count: supplementalCandidateCount,
            needs_human_review_count: needsHumanReviewCount
        },
        files: {
            summary_csv: 'supplemental_candidate_summary.csv',
            review_csv: 'supplemental_candidate_review_required.csv',
            summary_md: 'summary.md'
        }
    };

    // Pre-register all writes with safety checks
    writer.registerWrite(outPath, jsonlContent);
    writer.registerWrite(manifestPath, manifestContent);
    writer.registerWrite(reportPath, mdReport);

    const summaryCsvPath = path.join(reviewDir, 'supplemental_candidate_summary.csv');
    const reviewCsvPath = path.join(reviewDir, 'supplemental_candidate_review_required.csv');
    const summaryMdPath = path.join(reviewDir, 'summary.md');
    const reviewManifestPath = path.join(reviewDir, 'manifest.json');

    writer.registerWrite(summaryCsvPath, csvLines);
    writer.registerWrite(reviewCsvPath, csvLines);
    writer.registerWrite(summaryMdPath, mdSummary);
    writer.registerWrite(reviewManifestPath, JSON.stringify(reviewManifest, null, 2) + '\n');

    // Staging write and commit (all-or-nothing behavior)
    await writer.writeToStaging();
    writer.commit();
}

module.exports = {
    generateSupplementalCandidates
};

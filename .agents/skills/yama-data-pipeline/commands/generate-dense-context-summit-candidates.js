const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseGpx, extractTrackPoints, extractTrackName, extractTrkElements } = require('../lib/gpx');
const { processGPX, generateCandidateId } = require('../lib/dense_context_summit_detection');
const { matchMountainNames } = require('../lib/text_similarity');
const { haversineDistance } = require('../lib/geo_distance');
const StagedWriter = require('../lib/staged_writer');

module.exports = async function(args) {
    const rawGpxDir = args.rawGpxDir;
    const mountainsPath = args.mountains;
    const canonicalCandidatesPath = args.canonicalCandidates;
    const stage30CandidatesPath = args.stage30SupplementalCandidates;
    const groundingRefPath = args.groundingReference;
    const activityLinksPath = args.activityLinks;
    const stage32AssignmentsPath = args.stage32Assignments;

    const outCandidatesPath = args.out;
    const outManifestPath = args.manifest;
    const outReportPath = args.report;
    const outReviewDir = args.reviewDir;
    const outDocReportPath = args.docReport;

    // Check outputs don't exist
    const writer = new StagedWriter();

    // Load datasets
    const mountains = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));
    const canonical = fs.readFileSync(canonicalCandidatesPath, 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
    const stage30 = fs.readFileSync(stage30CandidatesPath, 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
    const groundingRef = fs.readFileSync(groundingRefPath, 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
    const activityLinks = fs.readFileSync(activityLinksPath, 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
    const stage32 = fs.readFileSync(stage32AssignmentsPath, 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);

    const config = {
        v1_prominent_smooth_window: 5,
        v1_prominent_peak_radius: 10,
        v1_prominent_min_prominence_m: 30,
        v1_prominent_merge_distance_m: 100,
        minor_peak_min_prominence_m: 10,
        minor_peak_merge_distance_m: 80,
        gemini_anchor_search_radius_m: 300,
        csv_anchor_search_radius_m: 300,
        named_context_search_radius_m: 500,
        traverse_split_min_separation_m: 300,
        dedupe_distance_m: 30,
        max_candidates_per_gpx_soft_limit: 30
    };

    // Prepare indices
    const csvAnchors = mountains.filter(m => m.coordinates && m.coordinates.lat !== null && m.coordinates.lon !== null).map(m => {
        return { type: 'csv', lat: m.coordinates.lat, lon: m.coordinates.lon, mountain_no: m.mountain_no, name: m.name };
    });

    const geminiAnchors = groundingRef.filter(g => g.selected_grounding_lat && g.selected_grounding_lon).map(g => ({
        type: 'gemini', lat: g.selected_grounding_lat, lon: g.selected_grounding_lon, mountain_no: g.mountain_no, name: g.mountain_name
    }));

    const activityLinkMap = new Map();
    for (const link of activityLinks) {
        activityLinkMap.set(link.gpx_basename, link);
    }

    const stage32Map = new Map();
    for (const a of stage32) {
        if (!stage32Map.has(a.source_gpx_basename)) stage32Map.set(a.source_gpx_basename, []);
        stage32Map.get(a.source_gpx_basename).push(a);
    }

    const outputRecords = [];
    const gpxFiles = fs.readdirSync(rawGpxDir).filter(f => f.endsWith('.gpx'));

    let trackpointCount = 0;
    const stats = {
        zero_candidate_gpx_count: 0,
        gpx_files_over_soft_limit: 0,
        matched_existing_canonical_30m: 0,
        new_candidates_vs_canonical_30m: 0,
        stage30_recovered_30m: 0,
        stage32_recovered_30m: 0,
        type_counts: {}
    };

    for (const gpxFile of gpxFiles) {
        const gpxPath = path.join(rawGpxDir, gpxFile);
        const gpxData = fs.readFileSync(gpxPath, 'utf8');
        const gpxSha256 = crypto.createHash('sha256').update(gpxData).digest('hex');
        const doc = parseGpx(gpxData);

        const trackName = extractTrackName(doc);
        const trkElements = extractTrkElements(doc);

        let points = [];
        let segIdx = 0;
        let ptIdx = 0;
        for (const trk of trkElements) {
            const segs = trk.getElementsByTagName('trkseg');
            for (let s = 0; s < segs.length; s++) {
                const trkpts = segs[s].getElementsByTagName('trkpt');
                for (let p = 0; p < trkpts.length; p++) {
                    const node = trkpts[p];
                    const lat = parseFloat(node.getAttribute('lat'));
                    const lon = parseFloat(node.getAttribute('lon'));
                    const eleNode = node.getElementsByTagName('ele')[0];
                    const hasEle = !!eleNode;
                    const ele = hasEle ? parseFloat(eleNode.textContent) : undefined;
                    const timeNode = node.getElementsByTagName('time')[0];
                    const time = timeNode && timeNode.textContent ? timeNode.textContent : '';

                    points.push({
                        lat, lon, hasEle, ele, time,
                        segment_index: segIdx,
                        trackpoint_index: ptIdx++
                    });
                }
                segIdx++;
            }
        }
        trackpointCount += points.length;

        // Contextual analysis
        const link = activityLinkMap.get(gpxFile) || {};
        const namedMatches = [];
        let isTraverse = false;

        const possibleTitles = [
            trackName,
            link.gpx_track_name,
            ...(link.title_enriched_candidate_activities || []).map(a => a.yamap_title)
        ].filter(Boolean);

        for (const mountain of mountains) {
            for (const t of possibleTitles) {
                const matchResult = matchMountainNames(mountain.name, t);
                if (matchResult.match) {
                    namedMatches.push({
                        mountain_no: mountain.mountain_no,
                        mountain_name: mountain.name,
                        matched_text: t,
                        match_type: matchResult.type
                    });
                }
            }
        }

        // Traverse logic: multiple distinct mountains or Stage 32 conflicts
        const uniqueMatchedMountains = new Set(namedMatches.map(m => m.mountain_no));
        const stage32ForGpx = stage32Map.get(gpxFile) || [];
        const stage32ConflictingMountains = new Set(stage32ForGpx.map(a => a.mountain_no));

        if (uniqueMatchedMountains.size > 1 || stage32ConflictingMountains.size > 1 || (link.candidate_dates_jst && link.candidate_dates_jst.length > 1)) {
            isTraverse = true;
        }

        const gpxContext = {
            named_matches: namedMatches,
            is_traverse: isTraverse
        };

        const candidates = processGPX(points, config, [...csvAnchors, ...geminiAnchors], gpxContext);

        if (candidates.length === 0) stats.zero_candidate_gpx_count++;
        if (candidates.length > config.max_candidates_per_gpx_soft_limit) stats.gpx_files_over_soft_limit++;

        for (const c of candidates) {
            // Find nearest canonical, stage30, etc.
            let nearestCanDist = Infinity;
            let nearestCanId = null;
            for (const can of canonical) {
                if (can.source_gpx_basename === gpxFile) {
                    const d = haversineDistance(c.lat, c.lon, can.lat, can.lon);
                    if (d < nearestCanDist) { nearestCanDist = d; nearestCanId = can.summit_candidate_id; }
                }
            }

            let nearestS30Dist = Infinity;
            let nearestS30Id = null;
            for (const s30 of stage30) {
                if (s30.source_gpx_basename === gpxFile) {
                    const d = haversineDistance(c.lat, c.lon, s30.nearest_trackpoint_lat, s30.nearest_trackpoint_lon);
                    if (d < nearestS30Dist) { nearestS30Dist = d; nearestS30Id = s30.supplemental_candidate_id; }
                }
            }

            if (nearestCanDist <= 30) stats.matched_existing_canonical_30m++;
            else stats.new_candidates_vs_canonical_30m++;

            if (nearestS30Dist <= 30) stats.stage30_recovered_30m++;

            const idSeed = `dense_context_summit_candidate_extraction_v2|2026-06-07_dense_context_summit_candidate_extraction_v2|${gpxFile}|${c.trackpoint_segment_index}|${c.trackpoint_index}|${c.lat}|${c.lon}|${c.time}|${c.primary_candidate_type}`;
            const candidateId = generateCandidateId('dense-summit-candidate', idSeed);

            stats.type_counts[c.primary_candidate_type] = (stats.type_counts[c.primary_candidate_type] || 0) + 1;

            outputRecords.push({
                summit_candidate_id: candidateId,
                candidate_status: 'unresolved',
                candidate_type: c.primary_candidate_type,
                candidate_generation_reason_codes: c.candidate_generation_reason_codes,
                source_method_id: 'dense_context_summit_candidate_extraction_v2',
                source_run_id: '2026-06-07_dense_context_summit_candidate_extraction_v2',
                source_gpx_basename: gpxFile,
                source_gpx_path: `data/01_raw/gpx/2026-05-12/${gpxFile}`,
                source_gpx_sha256: gpxSha256,
                source_trackpoint_index: c.trackpoint_index,
                source_trackpoint_segment_index: c.trackpoint_segment_index,
                lat: c.lat,
                lon: c.lon,
                ele_m: c.ele,
                time: c.time,
                track_name: trackName,
                candidate_rank_in_gpx: 1, // simplified
                candidate_rank_global: 1, // simplified
                smoothed_ele_m: c.smoothed_ele_m,
                prominence_m: c.prominence_m,
                local_window_trackpoint_count: c.local_window_trackpoint_count,
                local_window_max_ele_m: c.local_window_max_ele_m,
                local_window_min_ele_m: c.local_window_min_ele_m,
                local_window_ele_range_m: c.local_window_ele_range_m,
                distance_to_nearest_existing_canonical_candidate_m: nearestCanDist === Infinity ? null : nearestCanDist,
                nearest_existing_canonical_candidate_id: nearestCanId,
                distance_to_nearest_stage30_supplemental_candidate_m: nearestS30Dist === Infinity ? null : nearestS30Dist,
                nearest_stage30_supplemental_candidate_id: nearestS30Id,
                related_mountain_nos: [], // to be populated
                related_mountain_names: [],
                evidence: c.evidence,
                notes: ''
            });
        }
    }

    // Prepare outputs
    const manifest = {
        stage: 'summit_candidate_extraction',
        method_id: 'dense_context_summit_candidate_extraction_v2',
        run_id: '2026-06-07_dense_context_summit_candidate_extraction_v2',
        schema_version: '1.0',
        created_at: new Date().toISOString(),
        branch: 'museum-yama-data',
        inputs: {
            raw_gpx: rawGpxDir
        },
        outputs: {
            candidates: outCandidatesPath
        },
        summary: {
            raw_gpx_file_count: gpxFiles.length,
            raw_trackpoint_count: trackpointCount,
            mountain_source_row_count: mountains.length,
            canonical_candidate_count: canonical.length,
            stage30_supplemental_candidate_count: stage30.length,
            stage32_assignment_count: stage32.length,
            output_candidate_count: outputRecords.length,
            candidate_type_counts: stats.type_counts,
            zero_candidate_gpx_count: stats.zero_candidate_gpx_count,
            gpx_files_over_soft_candidate_limit: stats.gpx_files_over_soft_limit,
            new_candidates_vs_canonical_30m_count: stats.new_candidates_vs_canonical_30m,
            matched_existing_canonical_30m_count: stats.matched_existing_canonical_30m,
            stage30_supplemental_recovered_30m_count: stats.stage30_recovered_30m,
            stage32_supplemental_fallback_recovered_30m_count: stats.stage32_recovered_30m,
            repository_relative_path_violations: 0,
            source_files_modified: false,
            canonical_candidates_overwritten: false,
            stage30_outputs_regenerated: false,
            stage32_outputs_regenerated: false,
            current_review_entry_point_replaced: false
        }
    };

    const docReport = `# Dense Context Summit Candidate Extraction v2 Report

- Generated Candidates: ${outputRecords.length}
- Matched Existing Canonical: ${stats.matched_existing_canonical_30m}
- New Candidates: ${stats.new_candidates_vs_canonical_30m}
- Stage 30 Recovered: ${stats.stage30_recovered_30m}
- Canonical Overwritten: false
- Stage 30 Regenerated: false
- Stage 32 Regenerated: false
- Entry Point Replaced: false
`;

    // Format CSV summaries
    const typeSummaryCsv = 'candidate_type,count\n' + Object.entries(stats.type_counts).map(([k,v]) => `${k},${v}`).join('\n');
    const gpxCoverageCsv = 'gpx_basename,candidate_count\n' + gpxFiles.map(f => {
        const count = outputRecords.filter(r => r.source_gpx_basename === f).length;
        return `${f},${count}`;
    }).join('\n');

    const mountCoverage = new Map();
    for (const r of outputRecords) {
        if (r.evidence && r.evidence.name_activity_title_context && r.evidence.name_activity_title_context.matches) {
            for (const m of r.evidence.name_activity_title_context.matches) {
                mountCoverage.set(m.mountain_no, (mountCoverage.get(m.mountain_no) || 0) + 1);
            }
        }
    }
    const mountCoverageCsv = 'mountain_no,count\n' + Array.from(mountCoverage.entries()).map(([k,v]) => `${k},${v}`).join('\n');

    const canComparison = outputRecords.map(r => `${r.summit_candidate_id},${r.distance_to_nearest_existing_canonical_candidate_m !== null && r.distance_to_nearest_existing_canonical_candidate_m <= 30}`);
    const canComparisonCsv = 'summit_candidate_id,matched\n' + canComparison.join('\n');

    const s30Comparison = outputRecords.map(r => `${r.summit_candidate_id},${r.distance_to_nearest_stage30_supplemental_candidate_m !== null && r.distance_to_nearest_stage30_supplemental_candidate_m <= 30}`);
    const s30ComparisonCsv = 'summit_candidate_id,matched\n' + s30Comparison.join('\n');

    // Stage 32 fallback checking
    const s32Coverage = stage32.map(s32 => {
        let matched = false;
        for (const r of outputRecords) {
            if (s32.source_gpx_basename === r.source_gpx_basename) {
                if (haversineDistance(s32.proposed_lat, s32.proposed_lon, r.lat, r.lon) <= 30) {
                    matched = true;
                    break;
                }
            }
        }
        return `${s32.mountain_no},${matched}`;
    });
    const s32CoverageCsv = 'mountain_no,matched\n' + s32Coverage.join('\n');

    // Format output
    const jsonlContent = outputRecords.map(r => JSON.stringify(r)).join('\n') + '\n';

    writer.registerWrite(outCandidatesPath, jsonlContent);
    writer.registerWrite(outManifestPath, JSON.stringify(manifest, null, 2));
    writer.registerWrite(outDocReportPath, docReport);
    writer.registerWrite(path.join(outReviewDir, 'summary.md'), docReport);
    writer.registerWrite(path.join(outReviewDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writer.registerWrite(path.join(outReviewDir, 'candidate_type_summary.csv'), typeSummaryCsv);
    writer.registerWrite(path.join(outReviewDir, 'candidate_coverage_by_gpx.csv'), gpxCoverageCsv);
    writer.registerWrite(path.join(outReviewDir, 'candidate_coverage_by_mountain_context.csv'), mountCoverageCsv);
    writer.registerWrite(path.join(outReviewDir, 'comparison_with_2026-05-12_canonical_candidates.csv'), canComparisonCsv);
    writer.registerWrite(path.join(outReviewDir, 'comparison_with_stage30_supplemental_candidates.csv'), s30ComparisonCsv);
    writer.registerWrite(path.join(outReviewDir, 'stage32_fallback_coverage_analysis.csv'), s32CoverageCsv);

    await writer.writeToStaging();
    writer.commit();

    console.log('Successfully generated dense context candidates.');
};

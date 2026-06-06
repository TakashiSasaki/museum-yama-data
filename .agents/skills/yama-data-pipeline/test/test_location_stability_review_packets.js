'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { generateStabilityReviewPackets } = require('../lib/location_stability_review_packets');

function generateMockData(tempDir) {
    const mockReviewDir = path.join(tempDir, 'review_input');
    fs.mkdirSync(mockReviewDir, { recursive: true });

    // 1. Generate 531 top1 queue rows
    const top1Lines = [
        'mountain_no,mountain_name,summit_candidate_id,source_gpx_basename,track_name,candidate_ele_m,mountain_elevation_m,elevation_diff_m,location_refined_candidate_score,location_refined_rank_for_mountain,location_refined_rank_for_summit_candidate,score_gap_to_next_candidate,mutual_top1,mutual_top3,confidence,review_priority,compact_review_priority,review_bucket,location_refinement_level,csv_municipality,csv_island,matched_terms,nearest_display_name,review_reason_codes,review_priority_reason_codes,compact_review_reason_codes,notes'
    ];
    for (let i = 1; i <= 531; i++) {
        const gpx = i <= 200 ? 'yamap_2022-01-01_08_00.gpx' : 'yamap_2022-02-01_09_00.gpx';
        const track = i <= 200 ? 'Hike 1' : 'Hike 2';
        top1Lines.push(`${i},Mountain_${i},summit-candidate:sc_${i},${gpx},${track},500,505,5,0.78,1,1,0.01,true,true,medium,high,high,resolve_conflict,location_strong_match,Matsuyama,,,same_municipality,Matsuyama,multiple_candidates,,resolve_conflict,notes_${i}`);
    }
    fs.writeFileSync(path.join(mockReviewDir, 'compact_review_queue_top1.csv'), top1Lines.join('\n') + '\n', 'utf8');

    // 2. Generate top3 queue rows
    const top3Lines = [
        'mountain_no,mountain_name,summit_candidate_id,source_gpx_basename,track_name,candidate_ele_m,mountain_elevation_m,elevation_diff_m,location_refined_candidate_score,location_refined_rank_for_mountain,location_refined_rank_for_summit_candidate,score_gap_to_next_candidate,mutual_top1,mutual_top3,confidence,review_priority,compact_review_priority,review_bucket,location_refinement_level,csv_municipality,csv_island,matched_terms,nearest_display_name,review_reason_codes,review_priority_reason_codes,compact_review_reason_codes,notes'
    ];
    for (let i = 1; i <= 531; i++) {
        const gpx = i <= 200 ? 'yamap_2022-01-01_08_00.gpx' : 'yamap_2022-02-01_09_00.gpx';
        const track = i <= 200 ? 'Hike 1' : 'Hike 2';
        top3Lines.push(`${i},Mountain_${i},summit-candidate:sc_${i},${gpx},${track},500,505,5,0.78,1,1,0.01,true,true,medium,high,high,resolve_conflict,location_strong_match,Matsuyama,,,same_municipality,Matsuyama,multiple_candidates,,resolve_conflict,notes_${i}`);
    }
    fs.writeFileSync(path.join(mockReviewDir, 'compact_review_queue_top3.csv'), top3Lines.join('\n') + '\n', 'utf8');

    // 3. Generate conflicts CSV
    const conflictsLines = [
        'mountain_no,mountain_name,summit_candidate_id,source_gpx_basename,track_name,candidate_ele_m,mountain_elevation_m,elevation_diff_m,location_refined_candidate_score,location_refined_rank_for_mountain,location_refined_rank_for_summit_candidate,score_gap_to_next_candidate,mutual_top1,mutual_top3,confidence,review_priority,compact_review_priority,review_bucket,location_refinement_level,csv_municipality,csv_island,matched_terms,nearest_display_name,review_reason_codes,review_priority_reason_codes,compact_review_reason_codes,notes'
    ];
    for (let i = 1; i <= 10; i++) {
        conflictsLines.push(`${i},Mountain_${i},summit-candidate:sc_${i},yamap_2022-01-01_08_00.gpx,Hike 1,500,505,5,0.78,1,1,0.01,true,true,medium,high,high,resolve_conflict,location_strong_match,Matsuyama,,,same_municipality,Matsuyama,multiple_candidates,,resolve_conflict,notes_${i}`);
    }
    fs.writeFileSync(path.join(mockReviewDir, 'compact_review_queue_conflicts.csv'), conflictsLines.join('\n') + '\n', 'utf8');

    // 4. Generate GPX groups CSV
    const gpxGroupsLines = [
        'source_gpx_basename,track_name,mountain_count_in_group,summit_candidate_count_in_group,top1_link_count,conflict_count,mountain_names,summit_candidate_ids,suggested_review_order,notes',
        'yamap_2022-01-01_08_00.gpx,Hike 1,200,200,200,200,Mountain_1,sc_1,1,notes',
        'yamap_2022-02-01_09_00.gpx,Hike 2,331,331,331,331,Mountain_201,sc_201,2,notes'
    ];
    fs.writeFileSync(path.join(mockReviewDir, 'conflict_groups_by_gpx.csv'), gpxGroupsLines.join('\n') + '\n', 'utf8');

    // 5. Generate summit conflicts CSV
    const summitConflictsLines = [
        'summit_candidate_id,source_gpx_basename,track_name,candidate_lat,candidate_lon,candidate_ele_m,top1_mountain_count,top3_mountain_count,top1_mountain_nos,top1_mountain_names,top3_mountain_nos,top3_mountain_names,max_score,score_spread,suggested_review_bucket,notes',
        'summit-candidate:sc_1,yamap_2022-01-01_08_00.gpx,Hike 1,33.8,132.8,500,1,1,1,Mountain_1,1,Mountain_1,0.78,0.0,resolve_conflict,notes'
    ];
    fs.writeFileSync(path.join(mockReviewDir, 'conflict_groups_by_summit_candidate.csv'), summitConflictsLines.join('\n') + '\n', 'utf8');

    // 6. Generate refined links JSONL containing stability info
    const refinedLinksLines = [];
    for (let i = 1; i <= 531; i++) {
        const gpx = i <= 200 ? 'yamap_2022-01-01_08_00.gpx' : 'yamap_2022-02-01_09_00.gpx';
        const track = i <= 200 ? 'Hike 1' : 'Hike 2';
        const rec = {
            mountain_no: i,
            mountain_name: `Mountain_${i}`,
            summit_candidate_id: `summit-candidate:sc_${i}`,
            source_gpx_basename: gpx,
            track_name: track,
            candidate_lat: 33.8 + i * 0.0001,
            candidate_lon: 132.8 + i * 0.0001,
            candidate_ele_m: 500,
            mountain_elevation_m: 505,
            location_stability_refined_candidate_score: 0.78,
            location_stability_refined_rank_for_mountain: 1,
            location_stability_refined_rank_for_summit_candidate: 1,
            location_stability_review_priority: 'high',
            confidence: 'medium',
            review_reason_codes: ['multiple_candidates_for_mountain'],
            notes: `mock notes ${i}`,
            evidence: {
                location_stability: {
                    mountain_source_municipality: 'Matsuyama',
                    candidate_center_municipality: 'Matsuyama',
                    candidate_municipality_stability: 'stable_interior',
                    all_cardinal_1km_same: true,
                    distance_stable_interior: true,
                    center_distance_to_boundary_m: 1500,
                    municipality_relation: 'same_municipality',
                    location_stability_bucket: 'location_strong_match',
                    reason_codes: ['REL_SAME_MUNICIPALITY']
                }
            }
        };
        refinedLinksLines.push(JSON.stringify(rec));
    }
    const refinedLinksPath = path.join(tempDir, 'location_stability_refined_candidate_links.jsonl');
    fs.writeFileSync(refinedLinksPath, refinedLinksLines.join('\n') + '\n', 'utf8');

    return { mockReviewDir, refinedLinksPath };
}

async function runReviewPacketTests() {
    console.log('--- Testing generateStabilityReviewPackets logic ---');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-stab-packets-test-'));

    try {
        const { mockReviewDir, refinedLinksPath } = generateMockData(tempDir);
        const outDir = path.join(tempDir, 'location_stability_review_packets');
        const decisionTemplate = path.join(tempDir, 'location_stability_review_decisions_template.csv');
        const manifest = path.join(tempDir, 'manifest.json');
        const report = path.join(tempDir, 'report.md');
        const stagedDir = path.join(tempDir, 'staged');
        fs.mkdirSync(stagedDir, { recursive: true });

        const result = await generateStabilityReviewPackets({
            top1Path: path.join(mockReviewDir, 'compact_review_queue_top1.csv'),
            top3Path: path.join(mockReviewDir, 'compact_review_queue_top3.csv'),
            conflictsPath: path.join(mockReviewDir, 'compact_review_queue_conflicts.csv'),
            gpxGroupsPath: path.join(mockReviewDir, 'conflict_groups_by_gpx.csv'),
            summitConflictsPath: path.join(mockReviewDir, 'conflict_groups_by_summit_candidate.csv'),
            refinedLinksPath,
            outDir,
            decisionTemplatePath: decisionTemplate,
            stagedDir
        });

        // 1. Verify index.md is generated
        assert.ok(fs.existsSync(path.join(stagedDir, 'index.md')), 'index.md should exist');

        // 2. Verify GPX group packets are generated
        assert.strictEqual(result.gpxPackets.length, 2, 'Should generate exactly 2 GPX packets');
        assert.ok(fs.existsSync(path.join(stagedDir, 'gpx_groups', 'gpx_group_0001_yamap_2022-01-01_08_00.md')), 'GPX packet file 1 should exist');

        // Verify GPX group packet has stability headers and warnings
        const gpxPackContent = fs.readFileSync(path.join(stagedDir, 'gpx_groups', 'gpx_group_0001_yamap_2022-01-01_08_00.md'), 'utf8');
        assert.ok(gpxPackContent.includes('Candidate links shown here are NOT final'), 'GPX packet should include warnings');
        assert.ok(gpxPackContent.includes('Location Stability Bucket'), 'GPX packet should include location stability headers');

        // 3. Verify summit candidate conflict packets are generated
        assert.strictEqual(result.summitPackets.length, 1, 'Should generate exactly 1 summit candidate packet');
        assert.ok(fs.existsSync(path.join(stagedDir, 'summit_candidate_groups', 'summit_candidate_0001_sc_1.md')), 'Summit candidate packet file should exist');

        // 4. Verify individual mountain packets are generated
        assert.strictEqual(result.mountainPackets.length, 531, 'Should generate exactly 531 mountain packets');
        assert.ok(fs.existsSync(path.join(stagedDir, 'mountain_groups', 'mountain_001.md')), 'Mountain packet file 1 should exist');

        // 5. Verify Decision Template rows, columns and values
        assert.strictEqual(result.decisionRows.length, 531, 'Decision template should contain exactly 531 rows');
        assert.ok(fs.existsSync(path.join(stagedDir, 'location_stability_review_decisions_template.csv')), 'Decision template file should exist');

        const decRows = result.decisionRows;
        assert.strictEqual(decRows[0].mountain_no, '1');
        assert.strictEqual(decRows[0].mountain_name, 'Mountain_1');
        assert.strictEqual(decRows[0].suggested_summit_candidate_id, 'summit-candidate:sc_1');
        assert.strictEqual(decRows[0].suggested_candidate_confidence, 'medium');
        assert.strictEqual(decRows[0].suggested_location_stability_bucket, 'location_strong_match');
        assert.strictEqual(decRows[0].suggested_municipality_relation, 'same_municipality');
        assert.strictEqual(decRows[0].suggested_candidate_municipality, 'Matsuyama');
        assert.strictEqual(decRows[0].source_mountain_municipality, 'Matsuyama');
        assert.strictEqual(decRows[0].accepted_summit_candidate_id, '');
        assert.strictEqual(decRows[0].decision_status, 'pending_review');
        assert.strictEqual(decRows[0].map_checked, 'false');
        assert.strictEqual(decRows[0].needs_followup, 'false');
        assert.strictEqual(decRows[0].created_from_stage, 'location_stability_review_packets');
        assert.ok(!path.isAbsolute(decRows[0].packet_path), 'packet_path is relative');

        console.log('✅ PASS: generateStabilityReviewPackets tests passed!');
    } catch (err) {
        console.error('Error during packets tests:', err);
        throw err;
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

runReviewPacketTests();

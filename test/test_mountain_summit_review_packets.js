'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { generateReviewPackets } = require('../lib/mountain_summit_review_packets');

function generateMockData(tempDir) {
    const mockReviewDir = path.join(tempDir, 'review_input');
    fs.mkdirSync(mockReviewDir, { recursive: true });

    // Generate exactly 531 mountains for Top-1 CSV
    const top1Lines = [
        'mountain_no,mountain_name,summit_candidate_id,source_gpx_basename,track_name,candidate_ele_m,mountain_elevation_m,elevation_diff_m,location_refined_candidate_score,review_bucket,compact_review_priority'
    ];
    for (let i = 1; i <= 531; i++) {
        const gpx = i <= 200 ? `yamap_2022-01-01_08_00.gpx` : `yamap_2022-02-01_09_00.gpx`;
        const track = i <= 200 ? 'Hike 1' : 'Hike 2';
        top1Lines.push(`${i},Mountain_${i},summit-candidate:sc_${i},${gpx},${track},500,505,5,0.78,resolve_conflict,high`);
    }
    fs.writeFileSync(path.join(mockReviewDir, 'compact_review_queue_top1.csv'), top1Lines.join('\n') + '\n', 'utf8');

    // Generate Top-3 CSV
    const top3Lines = [
        'mountain_no,mountain_name,summit_candidate_id,source_gpx_basename,track_name,candidate_ele_m,mountain_elevation_m,elevation_diff_m,location_refined_candidate_score,location_refined_rank_for_mountain,location_refined_rank_for_summit_candidate,score_gap_to_next_candidate,mutual_top1,mutual_top3,confidence,review_priority,compact_review_priority,review_bucket,location_refinement_level,csv_municipality,csv_island,matched_terms,nearest_display_name,review_reason_codes,review_priority_reason_codes,compact_review_reason_codes,notes'
    ];
    for (let i = 1; i <= 531; i++) {
        const gpx = i <= 200 ? `yamap_2022-01-01_08_00.gpx` : `yamap_2022-02-01_09_00.gpx`;
        const track = i <= 200 ? 'Hike 1' : 'Hike 2';
        top3Lines.push(`${i},Mountain_${i},summit-candidate:sc_${i},${gpx},${track},500,505,5,0.78,1,1,0.01,true,true,medium,high,high,resolve_conflict,exact_municipality_match,Matsuyama,,,Matsuyama,multiple_candidates,,resolve_conflict,notes_${i}`);
    }
    fs.writeFileSync(path.join(mockReviewDir, 'compact_review_queue_top3.csv'), top3Lines.join('\n') + '\n', 'utf8');

    // Generate Conflicts CSV
    const conflictsLines = [
        'mountain_no,mountain_name,summit_candidate_id,source_gpx_basename,track_name,candidate_ele_m,mountain_elevation_m,elevation_diff_m,location_refined_candidate_score,location_refined_rank_for_mountain,location_refined_rank_for_summit_candidate,score_gap_to_next_candidate,mutual_top1,mutual_top3,confidence,review_priority,compact_review_priority,review_bucket,location_refinement_level,csv_municipality,csv_island,matched_terms,nearest_display_name,review_reason_codes,review_priority_reason_codes,compact_review_reason_codes,notes'
    ];
    for (let i = 1; i <= 10; i++) {
        conflictsLines.push(`${i},Mountain_${i},summit-candidate:sc_${i},yamap_2022-01-01_08_00.gpx,Hike 1,500,505,5,0.78,1,1,0.01,true,true,medium,high,high,resolve_conflict,exact_municipality_match,Matsuyama,,,Matsuyama,multiple_candidates,,resolve_conflict,notes_${i}`);
    }
    fs.writeFileSync(path.join(mockReviewDir, 'compact_review_queue_conflicts.csv'), conflictsLines.join('\n') + '\n', 'utf8');

    // Generate GPX Groups CSV
    const gpxGroupsLines = [
        'source_gpx_basename,track_name,mountain_count_in_group,summit_candidate_count_in_group,top1_link_count,conflict_count,mountain_names,summit_candidate_ids,suggested_review_order,notes',
        'yamap_2022-01-01_08_00.gpx,Hike 1,200,200,200,200,Mountain_1,sc_1,1,notes',
        'yamap_2022-02-01_09_00.gpx,Hike 2,331,331,331,331,Mountain_201,sc_201,2,notes'
    ];
    fs.writeFileSync(path.join(mockReviewDir, 'conflict_groups_by_gpx.csv'), gpxGroupsLines.join('\n') + '\n', 'utf8');

    // Generate Summit Conflicts CSV
    const summitConflictsLines = [
        'summit_candidate_id,source_gpx_basename,track_name,candidate_lat,candidate_lon,candidate_ele_m,top1_mountain_count,top3_mountain_count,top1_mountain_nos,top1_mountain_names,top3_mountain_nos,top3_mountain_names,max_score,score_spread,suggested_review_bucket,notes',
        'summit-candidate:sc_1,yamap_2022-01-01_08_00.gpx,Hike 1,33.8,132.8,500,1,1,1,Mountain_1,1,Mountain_1,0.78,0.0,resolve_conflict,notes'
    ];
    fs.writeFileSync(path.join(mockReviewDir, 'conflict_groups_by_summit_candidate.csv'), summitConflictsLines.join('\n') + '\n', 'utf8');

    return mockReviewDir;
}

function runReviewPacketTests() {
    console.log('--- Testing generateReviewPackets logic ---');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-packets-test-'));

    try {
        const reviewDir = generateMockData(tempDir);
        const outDir = path.join(tempDir, 'review_packets');
        const decisionTemplate = path.join(tempDir, 'review_decisions_template.csv');
        const manifest = path.join(tempDir, 'review_packet_manifest.json');
        const report = path.join(tempDir, 'report.md');
        const stagedDir = path.join(tempDir, 'staged');
        fs.mkdirSync(stagedDir, { recursive: true });

        const result = generateReviewPackets({
            reviewDir,
            outDir,
            decisionTemplatePath: decisionTemplate,
            manifestPath: manifest,
            reportPath: report,
            stagedDir
        });

        // 1. Verify GPX group packet generation
        assert.strictEqual(result.gpxPackets.length, 2, 'Should generate exactly 2 GPX packets');
        assert.ok(fs.existsSync(path.join(stagedDir, 'gpx_groups', 'gpx_group_0001_yamap_2022-01-01_08_00.md')), 'GPX packet 1 should exist');
        assert.ok(fs.existsSync(path.join(stagedDir, 'gpx_groups', 'gpx_group_0002_yamap_2022-02-01_09_00.md')), 'GPX packet 2 should exist');

        // Verify GPX group packet content
        const gpxPackContent = fs.readFileSync(path.join(stagedDir, 'gpx_groups', 'gpx_group_0001_yamap_2022-01-01_08_00.md'), 'utf8');
        assert.ok(gpxPackContent.includes('# GPX Group Review Packet: gpx_group_0001'), 'GPX packet should contain header');
        assert.ok(gpxPackContent.includes('yamap_2022-01-01_08_00.gpx'), 'GPX packet should contain GPX filename');
        assert.ok(gpxPackContent.includes('Hike 1'), 'GPX packet should contain track name');
        assert.ok(gpxPackContent.includes('Mountain_1'), 'GPX packet should list mountain name');

        // 2. Verify Summit Candidate packet generation
        assert.strictEqual(result.summitPackets.length, 1, 'Should generate exactly 1 Summit packet');
        assert.ok(fs.existsSync(path.join(stagedDir, 'summit_candidate_groups', 'summit_candidate_0001_sc_1.md')), 'Summit candidate packet 1 should exist');

        const summitPackContent = fs.readFileSync(path.join(stagedDir, 'summit_candidate_groups', 'summit_candidate_0001_sc_1.md'), 'utf8');
        assert.ok(summitPackContent.includes('# Summit Candidate Conflict Packet: summit_candidate_0001'), 'Summit packet should contain header');
        assert.ok(summitPackContent.includes('summit-candidate:sc_1'), 'Summit packet should contain candidate ID');
        assert.ok(summitPackContent.includes('33.8'), 'Summit packet should contain lat');
        assert.ok(summitPackContent.includes('132.8'), 'Summit packet should contain lon');

        // 3. Verify Index Generation
        assert.ok(fs.existsSync(path.join(stagedDir, 'index.md')), 'index.md should be created');
        const indexContent = fs.readFileSync(path.join(stagedDir, 'index.md'), 'utf8');
        assert.ok(indexContent.includes('Total GPX Group Packets (Traverses)**: 2'), 'Index should show GPX packet count');
        assert.ok(indexContent.includes('Total Summit Candidate Conflict Packets**: 1'), 'Index should show Summit packet count');
        assert.ok(indexContent.includes('gpx_group_0001_yamap_2022-01-01_08_00.md'), 'Index should link to GPX packet 1');
        assert.ok(indexContent.includes('summit_candidate_0001_sc_1.md'), 'Index should link to Summit packet 1');

        // 4. Verify Decision Template
        assert.strictEqual(result.decisionRows.length, 531, 'Decision template should contain 531 rows');
        assert.ok(fs.existsSync(path.join(stagedDir, 'review_decisions_template.csv')), 'review_decisions_template.csv should be created');

        // Check columns and default values
        const decRows = result.decisionRows;
        assert.strictEqual(decRows[0].decision_row_id, 'dec-0001', 'First row should have dec-0001');
        assert.strictEqual(decRows[0].mountain_no, '1');
        assert.strictEqual(decRows[0].mountain_name, 'Mountain_1');
        assert.strictEqual(decRows[0].suggested_summit_candidate_id, 'summit-candidate:sc_1');
        assert.strictEqual(decRows[0].review_packet_id, 'gpx_group_0001', 'Should link to the GPX group packet');
        assert.strictEqual(decRows[0].review_packet_path, 'review_packets/gpx_groups/gpx_group_0001_yamap_2022-01-01_08_00.md', 'Should prefill relative path');

        // Decision status should be initialized to pending_review and blanks
        assert.strictEqual(decRows[0].decision_status, 'pending_review');
        assert.strictEqual(decRows[0].accepted_summit_candidate_id, '');
        assert.strictEqual(decRows[0].rejected_summit_candidate_ids, '');
        assert.strictEqual(decRows[0].needs_external_map_check, '');
        assert.strictEqual(decRows[0].needs_redetection, '');

        console.log('✅ PASS: generateReviewPackets tests passed!');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

runReviewPacketTests();

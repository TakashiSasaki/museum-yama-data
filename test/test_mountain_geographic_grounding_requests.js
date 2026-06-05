'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    selectMountain,
    generateGroundingRequests,
    EXPECTED_OUTPUT_SCHEMA
} = require('../lib/mountain_geographic_grounding_requests');

console.log('--- Testing mountain_geographic_grounding_requests ---');

// Mock data builder helpers
function mockMountain(no, name) {
    return {
        mountain_no: no,
        name: name,
        source_row_no: no + 1,
        location: { municipality_or_island: '松山市', municipality: '松山市', island: '' },
        coordinates: { lat: 33.8 + no * 0.01, lon: 132.8 + no * 0.01 },
        elevation_m: 500 + no * 10,
        yamap_url: `https://yamap.com/mountains/${no}`
    };
}

function mockLink(mNo, cId, overrides = {}) {
    return {
        mountain_no: mNo,
        summit_candidate_id: cId,
        source_gpx_basename: 'track.gpx',
        track_name: 'Test Track',
        candidate_lat: 33.8,
        candidate_lon: 132.8,
        candidate_ele_m: 502.5,
        location_stability_refined_candidate_score: 0.8,
        location_stability_refined_rank_for_mountain: 1,
        location_stability_refined_rank_for_summit_candidate: 1,
        ...overrides
    };
}

function mockCsvRow(mNo, cId, overrides = {}) {
    return {
        mountain_no: String(mNo),
        summit_candidate_id: cId,
        source_gpx_basename: 'track.gpx',
        track_name: 'Test Track',
        mutual_top1: 'true',
        mutual_top3: 'true',
        compact_review_priority: 'medium',
        review_bucket: 'accept_candidate_after_map_check',
        location_refined_candidate_score: '0.8',
        ...overrides
    };
}

// 1. Test Selection Logic
{
    const csvLinkMap = new Map();
    
    // Test resolve_conflict
    const links1 = [mockLink(1, 'c1')];
    csvLinkMap.set('1:c1', mockCsvRow(1, 'c1', { review_bucket: 'resolve_conflict' }));
    const s1 = selectMountain(1, links1, csvLinkMap);
    assert.strictEqual(s1.select, true, 'Should select resolve_conflict');
    assert.ok(s1.reasons.includes('review_bucket_resolve_conflict'));

    // Test check_close_alternatives
    const links2 = [mockLink(2, 'c2')];
    csvLinkMap.set('2:c2', mockCsvRow(2, 'c2', { review_bucket: 'check_close_alternatives' }));
    const s2 = selectMountain(2, links2, csvLinkMap);
    assert.strictEqual(s2.select, true, 'Should select check_close_alternatives');

    // Test check_location_warning
    const links3 = [mockLink(3, 'c3')];
    csvLinkMap.set('3:c3', mockCsvRow(3, 'c3', { review_bucket: 'check_location_warning' }));
    const s3 = selectMountain(3, links3, csvLinkMap);
    assert.strictEqual(s3.select, true, 'Should select check_location_warning');

    // Test compact_review_priority == high
    const links4 = [mockLink(4, 'c4')];
    csvLinkMap.set('4:c4', mockCsvRow(4, 'c4', { compact_review_priority: 'high' }));
    const s4 = selectMountain(4, links4, csvLinkMap);
    assert.strictEqual(s4.select, true, 'Should select high compact priority');

    // Test mutual_top1 == false
    const links5 = [mockLink(5, 'c5')];
    csvLinkMap.set('5:c5', mockCsvRow(5, 'c5', { mutual_top1: 'false' }));
    const s5 = selectMountain(5, links5, csvLinkMap);
    assert.strictEqual(s5.select, true, 'Should select non-mutual top1');

    // Test stability incompatibility
    const links6 = [mockLink(6, 'c6', { location_stability_bucket: 'municipality_incompatible_strong' })];
    csvLinkMap.set('6:c6', mockCsvRow(6, 'c6'));
    const s6 = selectMountain(6, links6, csvLinkMap);
    assert.strictEqual(s6.select, true, 'Should select stability incompatibility strong');

    // Test exclusion of low_priority/deprioritized by default
    const linksEx1 = [mockLink(7, 'c7')];
    csvLinkMap.set('7:c7', mockCsvRow(7, 'c7', { review_bucket: 'low_priority' }));
    const sEx1 = selectMountain(7, linksEx1, csvLinkMap);
    assert.strictEqual(sEx1.select, false, 'Should exclude low_priority');

    const linksEx2 = [mockLink(8, 'c8')];
    csvLinkMap.set('8:c8', mockCsvRow(8, 'c8', { review_bucket: 'deprioritized' }));
    const sEx2 = selectMountain(8, linksEx2, csvLinkMap);
    assert.strictEqual(sEx2.select, false, 'Should exclude deprioritized');

    // Test default exclusion of accept_candidate_after_map_check
    const linksEx3 = [mockLink(9, 'c9')];
    csvLinkMap.set('9:c9', mockCsvRow(9, 'c9', { review_bucket: 'accept_candidate_after_map_check' }));
    const sEx3 = selectMountain(9, linksEx3, csvLinkMap);
    assert.strictEqual(sEx3.select, false, 'Should exclude clean accept_candidate_after_map_check');
}

// 2. Test generateGroundingRequests (Consolidated output generation)
{
    const mountainsData = [
        mockMountain(1, 'Selected Mountain A'),
        mockMountain(2, 'Excluded Mountain B')
    ];

    const refinedLinks = [
        mockLink(1, 'c1', {
            location_stability_bucket: 'location_uncertain_keep',
            evidence: {
                location_stability: {
                    candidate_municipality_stability: 'stable_interior',
                    municipality_relation: 'same_municipality'
                }
            }
        }),
        mockLink(2, 'c2', {
            location_stability_bucket: 'location_strong_match',
            evidence: {
                location_stability: {
                    candidate_municipality_stability: 'stable_interior',
                    municipality_relation: 'same_municipality'
                }
            }
        })
    ];

    const top1Rows = [
        mockCsvRow(1, 'c1', { review_bucket: 'resolve_conflict' }),
        mockCsvRow(2, 'c2', { review_bucket: 'accept_candidate_after_map_check' })
    ];
    const top3Rows = top1Rows;
    const conflictsRows = [top1Rows[0]];
    const conflictGroupsByGpx = [];
    const conflictGroupsBySummitCandidate = [];

    const result = generateGroundingRequests({
        mountainsData,
        refinedLinks,
        top1Rows,
        top3Rows,
        conflictsRows,
        conflictGroupsByGpx,
        conflictGroupsBySummitCandidate,
        featureOutDir: 'out/feature',
        reportingOutDir: 'out/reporting'
    });

    assert.strictEqual(result.selectedCount, 1, 'Should select exactly 1 mountain');
    assert.strictEqual(result.excludedCount, 1, 'Should exclude exactly 1 mountain');
    
    // Check machine request packet
    assert.strictEqual(result.requestPacketsJsonlLines.length, 1, 'Should have 1 request packet line');
    const packet = JSON.parse(result.requestPacketsJsonlLines[0]);
    assert.strictEqual(packet.mountain_no, 1);
    assert.strictEqual(packet.mountain_name, 'Selected Mountain A');
    assert.strictEqual(packet.selection.selected_for_grounding, true);
    assert.ok(packet.selection.selection_reason_codes.includes('review_bucket_resolve_conflict'));
    assert.strictEqual(packet.top1_candidate.summit_candidate_id, 'c1');
    assert.deepStrictEqual(packet.expected_output_schema, EXPECTED_OUTPUT_SCHEMA, 'Packet should contain expected schema');

    // Check selection log
    assert.strictEqual(result.selectionJsonlLines.length, 1, 'Should have 1 selection line');
    const selectionLog = JSON.parse(result.selectionJsonlLines[0]);
    assert.strictEqual(selectionLog.mountain_no, 1);
    assert.strictEqual(selectionLog.top1_summit_candidate_id, 'c1');
    assert.ok(selectionLog.grounding_request_id.startsWith('req-grounding-000001-'));

    // Check markdown packet content
    assert.strictEqual(result.markdownPacketsMap.size, 1);
    const md = result.markdownPacketsMap.get('mountain_000001.md');
    assert.ok(md.includes('# Geographic grounding request: mountain_000001'), 'Markdown header correct');
    assert.ok(md.includes('Selected Mountain A'), 'Contains mountain name');
    assert.ok(md.includes('Requested output format'), 'Contains requested output format section');
    assert.ok(md.includes('JSON schema only'), 'Specifies JSON schema only');

    // Check submission queue rows
    assert.strictEqual(result.submissionQueueRows.length, 1);
    const queueRow = result.submissionQueueRows[0];
    assert.strictEqual(queueRow.mountain_no, '1');
    assert.strictEqual(queueRow.submission_status, 'pending', 'Submission status initialized to pending');
    assert.strictEqual(queueRow.submitted_at, '', 'Submitted_at initialized to blank');
    assert.strictEqual(queueRow.raw_response_id, '', 'Raw_response_id initialized to blank');

    // Additional assertions for mountain name fix
    assert.strictEqual(selectionLog.mountain_name, 'Selected Mountain A', 'Selection log should have correct name');
    assert.strictEqual(queueRow.mountain_name, 'Selected Mountain A', 'Queue row should have correct name');
    assert.ok(result.indexMdContent.includes('Selected Mountain A'), 'Index markdown should contain correct name');
    assert.ok(packet.external_agent_task.prompt_text.includes('Selected Mountain A'), 'Prompt text should contain correct name');
    assert.ok(!packet.external_agent_task.prompt_text.includes('undefined'), 'Prompt text should not contain undefined');
    assert.ok(!md.includes('undefined'), 'Markdown packet should not contain undefined');

    // Test fallbacks for mountain name resolution
    const { getMountainName } = require('../lib/mountain_geographic_grounding_requests');
    assert.strictEqual(getMountainName({ name: 'NameA' }), 'NameA');
    assert.strictEqual(getMountainName({ mountain_name: 'NameB' }), 'NameB');
    assert.strictEqual(getMountainName({}, { name: 'NameC' }), 'NameC');
    assert.strictEqual(getMountainName({}, { mountain_name: 'NameD' }), 'NameD');
    assert.strictEqual(getMountainName({}), 'UNKNOWN_MOUNTAIN_NAME');
    assert.strictEqual(getMountainName({ name: '  ' }, { name: 'NameE' }), 'NameE');
}

console.log('✅ PASS: test_mountain_geographic_grounding_requests unit tests passed.');

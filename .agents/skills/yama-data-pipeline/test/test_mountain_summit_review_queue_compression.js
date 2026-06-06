'use strict';
/**
 * test_mountain_summit_review_queue_compression.js
 *
 * Tests for lib/mountain_summit_review_queue_compression.js and queues command.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const {
    hasSevereWarnings,
    compressReviewQueues
} = require('../lib/mountain_summit_review_queue_compression');
const generateQueuesCommand = require('../commands/generate-compact-mountain-summit-review-queues');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e.message}`);
        failed++;
    }
}

console.log('\n== test_mountain_summit_review_queue_compression ==');

const mockLinks = [
    {
        mountain_no: 1,
        mountain_name: "Mount A",
        summit_candidate_id: "sc:1",
        source_gpx_basename: "gpx1.gpx",
        track_name: "Track 1",
        candidate_ele_m: 500,
        mountain_elevation_m: 502,
        location_refined_candidate_score: 0.85,
        location_refined_rank_for_mountain: 1,
        location_refined_rank_for_summit_candidate: 1,
        confidence: "high",
        review_priority: "medium",
        evidence: { name: { name_tier: "strong" }, elevation: { elevation_tier: "strong", diff_m: 2 } },
        location_refinement: { location_refinement_level: "exact_municipality_match" }
    },
    {
        mountain_no: 1,
        mountain_name: "Mount A",
        summit_candidate_id: "sc:2",
        source_gpx_basename: "gpx1.gpx",
        track_name: "Track 1",
        candidate_ele_m: 490,
        mountain_elevation_m: 502,
        location_refined_candidate_score: 0.83, // Gap is 0.02 (<= 0.03)
        location_refined_rank_for_mountain: 2,
        location_refined_rank_for_summit_candidate: 1,
        confidence: "medium",
        review_priority: "medium",
        evidence: { name: { name_tier: "none" }, elevation: { elevation_tier: "medium", diff_m: 12 } },
        location_refinement: { location_refinement_level: "exact_municipality_match" }
    },
    {
        mountain_no: 2,
        mountain_name: "Mount B",
        summit_candidate_id: "sc:1", // Shared candidate sc:1 is top rank 1 for Mt A and Mt B
        source_gpx_basename: "gpx1.gpx",
        track_name: "Track 1",
        candidate_ele_m: 500,
        mountain_elevation_m: 600,
        location_refined_candidate_score: 0.70,
        location_refined_rank_for_mountain: 1,
        location_refined_rank_for_summit_candidate: 2,
        confidence: "low",
        review_priority: "high",
        evidence: { name: { name_tier: "weak" }, elevation: { elevation_tier: "warning", diff_m: 100 } },
        location_refinement: { location_refinement_level: "boundary_tolerated_mismatch" }
    },
    {
        mountain_no: 3,
        mountain_name: "Mount C",
        summit_candidate_id: null, // No candidate row
        source_gpx_basename: "",
        track_name: "",
        candidate_ele_m: null,
        mountain_elevation_m: 300,
        location_refined_candidate_score: 0.00,
        location_refined_rank_for_mountain: null,
        location_refined_rank_for_summit_candidate: null,
        confidence: "none",
        review_priority: "high"
    }
];

// 1. Top-1 queue generation
test('top1 queue contains exactly one row per mountain including placeholders', () => {
    const { top1Queue } = compressReviewQueues(mockLinks, 0.03);
    assert.strictEqual(top1Queue.length, 3);
    
    // Check mountain 1 top-1
    const m1 = top1Queue.find(l => l.mountain_no === 1);
    assert.strictEqual(m1.summit_candidate_id, "sc:1");

    // Check mountain 3 top-1 (placeholder)
    const m3 = top1Queue.find(l => l.mountain_no === 3);
    assert.strictEqual(m3.summit_candidate_id, null);
});

// 2. Top-3 queue generation
test('top3 queue includes all ranks <= 3', () => {
    const { top3Queue } = compressReviewQueues(mockLinks, 0.03);
    assert.strictEqual(top3Queue.length, 4); // Mt 1 (sc:1, sc:2), Mt 2 (sc:1), Mt 3 (placeholder)
    
    const mt1Rows = top3Queue.filter(l => l.mountain_no === 1);
    assert.strictEqual(mt1Rows.length, 2);
});

// 3. Score gap computation
test('score gap is correctly calculated for rank 1 and rank 2 candidates', () => {
    const { enrichedLinks } = compressReviewQueues(mockLinks, 0.03);
    const m1_r1 = enrichedLinks.find(l => l.mountain_no === 1 && l.location_refined_rank_for_mountain === 1);
    const m1_r2 = enrichedLinks.find(l => l.mountain_no === 1 && l.location_refined_rank_for_mountain === 2);

    // Gap to next for rank 1 should be 0.85 - 0.83 = 0.02
    assert.strictEqual(m1_r1.score_gap_to_next_candidate, 0.02);
    // Gap to next for rank 2 is null since there is no rank 3
    assert.strictEqual(m1_r2.score_gap_to_next_candidate, null);
});

// 4. Mutual top-1 and top-3 detection
test('mutual top-1 and top-3 flags are assigned correctly', () => {
    const { enrichedLinks } = compressReviewQueues(mockLinks, 0.03);

    // Mount A - sc:1 is rank 1 for Mt A, and rank 1 for sc:1. So it is mutual top-1.
    const mtA_sc1 = enrichedLinks.find(l => l.mountain_no === 1 && l.summit_candidate_id === "sc:1");
    assert.strictEqual(mtA_sc1.mutual_top1, true);
    assert.strictEqual(mtA_sc1.mutual_top3, true);

    // Mount B - sc:1 is rank 1 for Mt B, but rank 2 for sc:1. So it is NOT mutual top-1.
    const mtB_sc1 = enrichedLinks.find(l => l.mountain_no === 2 && l.summit_candidate_id === "sc:1");
    assert.strictEqual(mtB_sc1.mutual_top1, false);
    assert.strictEqual(mtB_sc1.mutual_top3, true); // It is top 1 for mountain, and top 2 for candidate, so both <= 3.
});

// 5. Summit candidate shared by multiple mountains
test('detects when a candidate is top-ranked for multiple mountains', () => {
    const { enrichedLinks } = compressReviewQueues(mockLinks, 0.03);

    const mtA_sc1 = enrichedLinks.find(l => l.mountain_no === 1 && l.summit_candidate_id === "sc:1");
    const mtB_sc1 = enrichedLinks.find(l => l.mountain_no === 2 && l.summit_candidate_id === "sc:1");

    // Both should trigger resolve_conflict because sc:1 is rank 1 for both Mount A and Mount B
    assert.strictEqual(mtA_sc1.review_bucket, 'resolve_conflict');
    assert.ok(mtA_sc1.compact_review_reason_codes.includes('shared_candidate'));

    assert.strictEqual(mtB_sc1.review_bucket, 'resolve_conflict');
    assert.ok(mtB_sc1.compact_review_reason_codes.includes('shared_candidate'));
});

// 6. GPX grouping report
test('source GPX basename groupings are computed correctly', () => {
    const { gpxGroupRows } = compressReviewQueues(mockLinks, 0.03);

    // We have gpx1.gpx (Mt A, Mt B)
    assert.strictEqual(gpxGroupRows.length, 1);
    const row = gpxGroupRows[0];
    assert.strictEqual(row.source_gpx_basename, "gpx1.gpx");
    assert.strictEqual(row.mountain_count_in_group, 2); // Mt A, Mt B
    assert.strictEqual(row.summit_candidate_count_in_group, 2); // sc:1, sc:2
    assert.strictEqual(row.top1_link_count, 2); // sc:1 (rank 1 for A), sc:1 (rank 1 for B)
    assert.strictEqual(row.conflict_count, 2); // sc:1 conflict for A, sc:1 conflict for B
});

// 7. Summit-candidate conflict grouping report
test('summit candidate conflict groupings are computed correctly', () => {
    const { summitConflictRows } = compressReviewQueues(mockLinks, 0.03);

    // Two candidates: sc:1, sc:2
    assert.strictEqual(summitConflictRows.length, 2);

    const sc1 = summitConflictRows.find(r => r.summit_candidate_id === "sc:1");
    assert.strictEqual(sc1.top1_mountain_count, 2); // Rank 1 for A and B
    assert.strictEqual(sc1.top3_mountain_count, 2);
    assert.strictEqual(sc1.suggested_review_bucket, "resolve_conflict");
    assert.strictEqual(sc1.score_spread, 0.15); // 0.85 - 0.70 = 0.15

    const sc2 = summitConflictRows.find(r => r.summit_candidate_id === "sc:2");
    assert.strictEqual(sc2.top1_mountain_count, 0); // Rank 2 for A
    assert.strictEqual(sc2.top3_mountain_count, 1);
    assert.strictEqual(sc2.suggested_review_bucket, "check");
});

// 8. Review bucket assignment
test('assigns review buckets and priorities correctly', () => {
    // Modify mock links locally to check individual rules
    const clearLink = {
        mountain_no: 4,
        mountain_name: "Mount D",
        summit_candidate_id: "sc:clear",
        source_gpx_basename: "gpx2.gpx",
        location_refined_candidate_score: 0.95,
        location_refined_rank_for_mountain: 1,
        location_refined_rank_for_summit_candidate: 1,
        confidence: "high",
        review_priority: "medium",
        evidence: { name: { name_tier: "strong" }, elevation: { elevation_tier: "strong", diff_m: 2 } },
        location_refinement: { location_refinement_level: "exact_municipality_match" }
    };

    const locationWarningLink = {
        mountain_no: 5,
        mountain_name: "Mount E",
        summit_candidate_id: "sc:loc",
        source_gpx_basename: "gpx2.gpx",
        location_refined_candidate_score: 0.65,
        location_refined_rank_for_mountain: 1,
        location_refined_rank_for_summit_candidate: 1,
        confidence: "low",
        review_priority: "high",
        evidence: { name: { name_tier: "strong" }, elevation: { elevation_tier: "strong", diff_m: 2 } },
        location_refinement: { location_refinement_level: "boundary_tolerated_mismatch" }
    };

    const { enrichedLinks } = compressReviewQueues([...mockLinks, clearLink, locationWarningLink], 0.03);

    const d = enrichedLinks.find(l => l.mountain_no === 4);
    assert.strictEqual(d.review_bucket, 'accept_candidate_after_map_check');
    assert.strictEqual(d.compact_review_priority, 'medium');

    const e = enrichedLinks.find(l => l.mountain_no === 5);
    assert.strictEqual(e.review_bucket, 'check_location_warning');
    assert.strictEqual(e.compact_review_priority, 'high');
});

// 9. Command staging lifecycle, manifest validation, collision and mtime preservation tests
test('generate-compact-mountain-summit-review-queues command lifecycle integration', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-review-queues-cmd-test-'));

    const refinedPath = path.join(tmpDir, 'refined_links.jsonl');
    const outDir = path.join(tmpDir, 'reporting');
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const reportPath = path.join(tmpDir, 'report.md');

    // Write mock input JSONL
    fs.writeFileSync(refinedPath, mockLinks.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');

    // Run Command
    await generateQueuesCommand({
        refinedLinks: refinedPath,
        outDir: outDir,
        manifest: manifestPath,
        report: reportPath
    });

    // Verify outputs exist
    assert.ok(fs.existsSync(manifestPath));
    assert.ok(fs.existsSync(reportPath));
    assert.ok(fs.existsSync(path.join(outDir, 'compact_review_queue_top1.csv')));
    assert.ok(fs.existsSync(path.join(outDir, 'compact_review_queue_top3.csv')));
    assert.ok(fs.existsSync(path.join(outDir, 'compact_review_queue_conflicts.csv')));
    assert.ok(fs.existsSync(path.join(outDir, 'conflict_groups_by_gpx.csv')));
    assert.ok(fs.existsSync(path.join(outDir, 'conflict_groups_by_summit_candidate.csv')));
    assert.ok(fs.existsSync(path.join(outDir, 'compact_review_summary.md')));

    // Read Top-1 CSV and verify row count
    const top1Content = fs.readFileSync(path.join(outDir, 'compact_review_queue_top1.csv'), 'utf8');
    const top1Lines = top1Content.split('\n').filter(l => l.trim());
    assert.strictEqual(top1Lines.length, 4); // Header + 3 mountains

    // Check collision
    let threwCollision = false;
    try {
        await generateQueuesCommand({
            refinedLinks: refinedPath,
            outDir: outDir,
            manifest: manifestPath,
            report: reportPath
        });
    } catch (e) {
        threwCollision = true;
        assert.ok(e.message.includes('collision') || e.message.includes('already exists'));
    }
    assert.ok(threwCollision, 'Command should fail when output files already exist');

    // Check mtime preservation of input
    const mtimeBefore = fs.statSync(refinedPath).mtimeMs;
    await new Promise(resolve => setTimeout(resolve, 10));

    // Run command on other output location
    const otherOutDir = path.join(tmpDir, 'reporting2');
    const otherManifest = path.join(tmpDir, 'manifest2.json');
    const otherReport = path.join(tmpDir, 'report2.md');

    await generateQueuesCommand({
        refinedLinks: refinedPath,
        outDir: otherOutDir,
        manifest: otherManifest,
        report: otherReport
    });

    const mtimeAfter = fs.statSync(refinedPath).mtimeMs;
    assert.strictEqual(mtimeBefore, mtimeAfter, 'Input file mtime changed!');

    // Cleanup
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
});

// Summary
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exitCode = 1;

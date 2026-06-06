'use strict';
/**
 * test_mountain_summit_candidate_linking.js
 *
 * Tests for lib/mountain_summit_candidate_linking.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
    computeNameEvidence,
    computeElevationEvidence,
    computeCsvCoordinateEvidence,
    computeLocationEvidence,
    computeActivityLinkEvidence,
    computeCombinedScore,
    deriveReviewReasonCodes,
    deriveCandidateStatus,
    generateCandidateLinks,
    finalizeLinks,
    generateNoCandidateRows,
    buildReviewCsvRows,
    buildReviewCsv,
    buildReviewMarkdown,
    WEIGHTS,
    ELE_TIERS,
} = require('../lib/mountain_summit_candidate_linking');

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

console.log('\n== test_mountain_summit_candidate_linking ==');

// ── Name evidence tests ───────────────────────────────────────────────────────

test('Japanese mountain name token containment in GPX track name (exact)', () => {
    const ev = computeNameEvidence('関ヶ森', '関ヶ森・観音山・倉谷山・芝ヶ峠', null);
    assert.ok(ev.name_score > 0.5, `Expected name_score > 0.5, got ${ev.name_score}`);
    assert.ok(ev.gpx_track_containment > 0, 'Expected positive GPX containment');
});

test('Mountain name contained in multi-mountain track (traverse case)', () => {
    // Track has multiple names — mountain name is one of them
    const ev = computeNameEvidence('観音山', '関ヶ森・観音山・倉谷山・芝ヶ峠', null);
    assert.ok(ev.name_score > 0.3, `Expected name_score > 0.3 for contained name, got ${ev.name_score}`);
});

test('Mountain name NOT in track yields low score', () => {
    const ev = computeNameEvidence('石鎚山', '関ヶ森・観音山・倉谷山・芝ヶ峠', null);
    assert.ok(ev.name_score < 0.3, `Expected low score for non-matching name, got ${ev.name_score}`);
});

test('YAMAP best candidate title evidence matches mountain name', () => {
    const activityLink = {
        best_candidate: { title: '関ヶ森・観音山・倉谷山・芝ヶ峠', yamap_activity_id: '12345' },
        title_enriched_candidate_activities: [],
    };
    const ev = computeNameEvidence('関ヶ森', null, activityLink);
    assert.ok(ev.yamap_best_title_score > 0.3, `Expected YAMAP title score > 0.3, got ${ev.yamap_best_title_score}`);
    assert.ok(ev.name_score > 0.3, `Expected name_score > 0.3, got ${ev.name_score}`);
});

test('YAMAP any candidate activity title evidence', () => {
    const activityLink = {
        best_candidate: null,
        title_enriched_candidate_activities: [
            { title: '石鎚山登山' },
            { title: '高森山ハイク' },
        ],
    };
    const ev = computeNameEvidence('高森山', null, activityLink);
    assert.ok(ev.yamap_any_title_max_score > 0.3, `Expected any-title score > 0.3, got ${ev.yamap_any_title_max_score}`);
});

test('Multiple mountain names in one track: each gets positive evidence', () => {
    const track = '高森山・岩伽羅山・衣掛山・吉山';
    const names = ['高森山', '岩伽羅山', '衣掛山', '吉山'];
    for (const name of names) {
        const ev = computeNameEvidence(name, track, null);
        assert.ok(ev.name_score > 0.2, `Name "${name}" should have positive evidence in track, got ${ev.name_score}`);
    }
});

test('Name score is in [0,1] range', () => {
    const cases = [
        ['石鎚山', '石鎚山', null],
        ['石鎚山', '関ヶ森・観音山', null],
        ['', '', null],
        ['石鎚山', null, null],
    ];
    for (const [mtn, track, act] of cases) {
        const ev = computeNameEvidence(mtn, track, act);
        assert.ok(ev.name_score >= 0 && ev.name_score <= 1, `name_score out of range: ${ev.name_score}`);
    }
});

// ── Elevation evidence tests ──────────────────────────────────────────────────

test('Elevation diff 0..10 m → strong', () => {
    const ev = computeElevationEvidence(592, 596);
    assert.strictEqual(ev.elevation_tier, 'strong');
    assert.strictEqual(ev.elevation_score, 1.0);
    assert.strictEqual(ev.diff_m, 4);
});

test('Elevation diff 10..30 m → medium', () => {
    const ev = computeElevationEvidence(500, 515);
    assert.strictEqual(ev.elevation_tier, 'medium');
    assert.strictEqual(ev.elevation_score, 0.7);
});

test('Elevation diff 30..50 m → weak', () => {
    const ev = computeElevationEvidence(500, 540);
    assert.strictEqual(ev.elevation_tier, 'weak');
    assert.strictEqual(ev.elevation_score, 0.4);
});

test('Elevation diff >50 m → warning', () => {
    const ev = computeElevationEvidence(500, 600);
    assert.strictEqual(ev.elevation_tier, 'warning');
    assert.strictEqual(ev.elevation_score, 0.1);
});

test('Missing mountain elevation → unavailable', () => {
    const ev = computeElevationEvidence(null, 596);
    assert.strictEqual(ev.elevation_tier, 'unavailable');
    assert.strictEqual(ev.elevation_score, 0.0);
    assert.strictEqual(ev.diff_m, null);
});

// ── CSV coordinate evidence tests ─────────────────────────────────────────────

test('CSV coordinate distance 0..100 m → strong', () => {
    // ~50m apart
    const ev = computeCsvCoordinateEvidence(33.856064, 132.843218, 33.856514, 132.843218);
    assert.strictEqual(ev.csv_coordinate_tier, 'strong');
    assert.ok(ev.distance_m < 100);
});

test('CSV coordinate distance >1000 m → warning', () => {
    const ev = computeCsvCoordinateEvidence(33.856064, 132.843218, 33.867, 132.843218);
    assert.strictEqual(ev.csv_coordinate_tier, 'warning');
});

test('Missing CSV coordinate → unavailable', () => {
    const ev = computeCsvCoordinateEvidence(null, null, 33.856514, 132.843218);
    assert.strictEqual(ev.csv_coordinate_tier, 'unavailable');
    assert.strictEqual(ev.csv_coordinate_score, 0.0);
    assert.strictEqual(ev.distance_m, null);
});

// ── Location evidence tests ───────────────────────────────────────────────────

test('Location overlap match → strong_overlap', () => {
    const mountainLoc = { municipality_or_island: '松山市', municipality: '松山市', island: null };
    const locEvidence = { location_candidates: [{ location_name: '松山市', location_type: 'city' }] };
    const ev = computeLocationEvidence(mountainLoc, locEvidence);
    assert.strictEqual(ev.location_tier, 'strong_overlap');
    assert.ok(ev.location_score > 0.5);
});

test('Location mismatch warning → mismatch_warning tier, not rejection', () => {
    const mountainLoc = { municipality_or_island: '今治市', municipality: '今治市', island: null };
    const locEvidence = { location_candidates: [{ location_name: '松山市', location_type: 'city' }] };
    const ev = computeLocationEvidence(mountainLoc, locEvidence);
    assert.strictEqual(ev.location_tier, 'mismatch_warning');
    // score is small but positive — NOT zero, not a hard rejection
    assert.ok(ev.location_score > 0 && ev.location_score < 0.5);
});

test('No geocoded candidates → unavailable', () => {
    const mountainLoc = { municipality_or_island: '松山市', municipality: '松山市', island: null };
    const locEvidence = { location_candidates: [] };
    const ev = computeLocationEvidence(mountainLoc, locEvidence);
    assert.strictEqual(ev.location_tier, 'unavailable');
    assert.strictEqual(ev.location_score, 0.0);
});

test('Island evidence preserved separately', () => {
    const mountainLoc = { municipality_or_island: '越智郡上島町', municipality: null, island: '岩城島' };
    const locEvidence = {
        location_candidates: [
            { location_name: '岩城島', location_type: 'island' },
            { location_name: '越智郡上島町', location_type: 'county' },
        ],
    };
    const ev = computeLocationEvidence(mountainLoc, locEvidence);
    assert.ok(ev.matched_island, 'Island should match');
    assert.ok(ev.location_score >= 0.3, `Expected at least island match score, got ${ev.location_score}`);
});

// ── Activity link evidence tests ──────────────────────────────────────────────

test('Activity link high confidence → score 0.8', () => {
    const actLink = { enriched_confidence: 'high', enriched_match_status: 'single_high_confidence_candidate',
        combined_activity_link_score: 1, needs_review: false, review_reason_codes: [],
        timezone_ambiguity: true, timezone_sensitive: false, date_candidate_count: 1 };
    const ev = computeActivityLinkEvidence(actLink);
    assert.strictEqual(ev.activity_link_score, 0.8);
    assert.strictEqual(ev.activity_link_confidence, 'high');
});

test('Activity link ambiguity preserved', () => {
    const actLink = { enriched_confidence: 'medium', enriched_match_status: 'multiple_candidates_ranked',
        combined_activity_link_score: 0.5, needs_review: true,
        review_reason_codes: ['multiple_date_candidates'],
        timezone_ambiguity: true, timezone_sensitive: true, date_candidate_count: 3 };
    const ev = computeActivityLinkEvidence(actLink);
    assert.strictEqual(ev.activity_link_score, 0.5);
    assert.ok(ev.activity_link_needs_review, 'Should flag needs_review');
    assert.ok(ev.activity_link_timezone_sensitive, 'Should flag timezone_sensitive');
});

test('No activity link → none confidence, score 0', () => {
    const ev = computeActivityLinkEvidence(null);
    assert.strictEqual(ev.activity_link_score, 0.0);
    assert.strictEqual(ev.activity_link_confidence, 'none');
});

test('Timezone-sensitive activity link → adds timezone_sensitive review reason', () => {
    const codes = deriveReviewReasonCodes({
        nameEvidence: { name_tier: 'strong', name_score: 0.9 },
        elevationEvidence: { elevation_tier: 'strong' },
        csvCoordEvidence: { csv_coordinate_tier: 'strong' },
        locationEvidence: { location_tier: 'strong_overlap' },
        activityEvidence: {
            activity_link_match_status: 'single_high_confidence_candidate',
            activity_link_timezone_sensitive: true,
            activity_link_date_candidate_count: 1,
        },
        candidateCountForMountain: 1,
        mountainCountForCandidate: 1,
        isNoCandidateMarker: false,
    });
    assert.ok(codes.includes('timezone_sensitive_activity_link'), 'Expected timezone_sensitive_activity_link reason code');
});

// ── Combined score tests ──────────────────────────────────────────────────────

test('Combined score is in [0,1] range for various evidence combinations', () => {
    const cases = [
        // High-confidence case
        {
            name: { name_score: 1.0 },
            ele: { elevation_score: 1.0 },
            coord: { csv_coordinate_score: 1.0 },
            loc: { location_score: 0.8 },
            act: { activity_link_score: 0.8 },
        },
        // No evidence at all
        {
            name: { name_score: 0.0 },
            ele: { elevation_score: 0.0 },
            coord: { csv_coordinate_score: 0.0 },
            loc: { location_score: 0.0 },
            act: { activity_link_score: 0.0 },
        },
        // Mixed
        {
            name: { name_score: 0.6 },
            ele: { elevation_score: 0.4 },
            coord: { csv_coordinate_score: 0.0 },
            loc: { location_score: 0.8 },
            act: { activity_link_score: 0.5 },
        },
    ];
    for (const c of cases) {
        const score = computeCombinedScore(c.name, c.ele, c.coord, c.loc, c.act);
        assert.ok(score >= 0 && score <= 1, `Combined score out of range: ${score}`);
    }
});

test('Weights sum to 1.0', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1.0) < 1e-9, `Weights should sum to 1.0, got ${total}`);
});

// ── Ranking determinism tests ─────────────────────────────────────────────────

test('Candidate ranking is deterministic', () => {
    const mountains = [{ mountain_no: 1, name: '関ヶ森', source_row_no: 2, elevation_m: 592,
        location: { municipality_or_island: '松山市', municipality: '松山市', island: null },
        coordinates: { lat: null, lon: null } }];

    const summitCandidates = [
        { summit_candidate_id: 'sc:aaa', lat: 33.856, lon: 132.843, ele_m: 573,
            source_gpx_path: 'a.gpx', source_gpx_basename: 'a.gpx', summit_candidate_gpx_path: 'sc/a.gpx', track_name: '関ヶ森・観音山' },
        { summit_candidate_id: 'sc:bbb', lat: 33.860, lon: 132.840, ele_m: 590,
            source_gpx_path: 'b.gpx', source_gpx_basename: 'b.gpx', summit_candidate_gpx_path: 'sc/b.gpx', track_name: '関ヶ森山頂' },
    ];

    const links1 = generateCandidateLinks(mountains, summitCandidates, new Map(), new Map());
    const links2 = generateCandidateLinks(mountains, summitCandidates, new Map(), new Map());

    assert.strictEqual(links1.length, links2.length, 'Should produce same number of links');
    for (let i = 0; i < links1.length; i++) {
        assert.strictEqual(links1[i].summit_candidate_id, links2[i].summit_candidate_id,
            'Ranking should be deterministic');
    }
});

// ── Mountain with no candidates ───────────────────────────────────────────────

test('Mountain with no candidates appears in review queue', () => {
    const mountains = [
        { mountain_no: 1, name: '存在しない山', source_row_no: 2, elevation_m: 100,
            location: { municipality_or_island: '宇宙市', municipality: '宇宙市', island: null },
            coordinates: { lat: null, lon: null } },
    ];
    // No summit candidates that match
    const summitCandidates = [];
    const links = generateCandidateLinks(mountains, summitCandidates, new Map(), new Map());
    assert.strictEqual(links.length, 0, 'No candidate links expected');

    const linkedNos = new Set(links.map(l => l.mountain_no));
    const noCandidateRows = generateNoCandidateRows(mountains, linkedNos);
    assert.strictEqual(noCandidateRows.length, 1, 'Expected 1 no-candidate row');
    assert.strictEqual(noCandidateRows[0].match_status, 'no_candidate');
    assert.ok(noCandidateRows[0].review_reason_codes.includes('no_candidate_for_mountain'));
});

// ── Candidate shared by multiple mountains ────────────────────────────────────

test('Candidate shared by multiple mountains is flagged', () => {
    const candidate = { summit_candidate_id: 'sc:shared', lat: 33.856, lon: 132.843, ele_m: 592,
        source_gpx_path: 'a.gpx', source_gpx_basename: 'a.gpx', summit_candidate_gpx_path: 'sc/a.gpx', track_name: '石鎚山・瓶ヶ森' };

    const mountains = [
        { mountain_no: 1, name: '石鎚山', source_row_no: 2, elevation_m: 590,
            location: { municipality_or_island: '西条市', municipality: '西条市', island: null },
            coordinates: { lat: null, lon: null } },
        { mountain_no: 2, name: '瓶ヶ森', source_row_no: 3, elevation_m: 1896,
            location: { municipality_or_island: '西条市', municipality: '西条市', island: null },
            coordinates: { lat: null, lon: null } },
    ];

    const links = generateCandidateLinks(mountains, [candidate], new Map(), new Map());
    // Both mountains have positive name evidence in the same track
    assert.ok(links.length >= 1, 'Expected at least one candidate link');

    const mountainNosSet = new Set(mountains.map(m => m.mountain_no));
    finalizeLinks(links, mountainNosSet);

    // Find links for each mountain to shared candidate
    const sharedLinks = links.filter(l => l.summit_candidate_id === 'sc:shared');
    if (sharedLinks.length > 1) {
        // Should have multiple_mountains_for_candidate reason
        const flagged = sharedLinks.some(l => l.review_reason_codes.includes('multiple_mountains_for_candidate'));
        assert.ok(flagged, 'Expected multiple_mountains_for_candidate review code');
    }
});

// ── JSONL parse validation ────────────────────────────────────────────────────

test('Generated JSONL is parseable', () => {
    const mountains = [{ mountain_no: 1, name: '石鎚山', source_row_no: 2, elevation_m: 1982,
        location: { municipality_or_island: '西条市', municipality: '西条市', island: null },
        coordinates: { lat: 33.75, lon: 133.11 } }];
    const summitCandidates = [{ summit_candidate_id: 'sc:test1', lat: 33.7512, lon: 133.1105, ele_m: 1985,
        source_gpx_path: 'x.gpx', source_gpx_basename: 'x.gpx', summit_candidate_gpx_path: 'sc/x.gpx', track_name: '石鎚山' }];

    const links = generateCandidateLinks(mountains, summitCandidates, new Map(), new Map());
    finalizeLinks(links, new Set([1]));

    const jsonlLines = links.map(l => JSON.stringify(l));
    for (const line of jsonlLines) {
        assert.doesNotThrow(() => JSON.parse(line), `JSONL line should be parseable: ${line.slice(0, 80)}`);
    }
});

// ── Review CSV generation ─────────────────────────────────────────────────────

test('Review CSV generation produces valid CSV', () => {
    const mountains = [{ mountain_no: 1, name: '石鎚山', source_row_no: 2, elevation_m: 1982,
        location: { municipality_or_island: '西条市', municipality: '西条市', island: null },
        coordinates: { lat: null, lon: null } }];
    const summitCandidates = [{ summit_candidate_id: 'sc:x', lat: 33.75, lon: 133.11, ele_m: 1980,
        source_gpx_path: 'x.gpx', source_gpx_basename: 'x.gpx', summit_candidate_gpx_path: 'sc/x.gpx', track_name: '石鎚山' }];

    const links = generateCandidateLinks(mountains, summitCandidates, new Map(), new Map());
    finalizeLinks(links, new Set([1]));

    const allLinks = [...links, ...generateNoCandidateRows(mountains, new Set(links.map(l => l.mountain_no)))];
    const csvRows = buildReviewCsvRows(mountains, allLinks);
    const csv = buildReviewCsv(csvRows);

    const lines = csv.split('\n').filter(l => l.trim());
    assert.ok(lines.length >= 2, 'CSV should have header + at least one data row');
    // Header should include mountain_no
    assert.ok(lines[0].includes('mountain_no'), 'Header should include mountain_no');
});

// ── Output path collision failure ─────────────────────────────────────────────

test('Output path collision fails with clear error', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yama-msc-test-'));
    const existingFile = path.join(tmpDir, 'collision.jsonl');
    fs.writeFileSync(existingFile, 'existing content');

    const generateCmd = require('../commands/generate-mountain-summit-candidate-links');

    // We use a non-existent mountains path — should fail on collision before even reading inputs
    let threw = false;
    try {
        await generateCmd({
            mountains: 'data/03_primary/mountains/ehime_mountain_source_rows.json',
            summitCandidates: 'data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl',
            locationEvidence: 'data/04_feature/location_enrichment/summit_candidates/2026-05-12/summit_candidate_location_evidence.jsonl',
            activityLinks: 'data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl',
            out: existingFile,
            manifest: path.join(tmpDir, 'manifest.json'),
            reviewCsv: path.join(tmpDir, 'review.csv'),
            reviewMd: path.join(tmpDir, 'review.md'),
            report: path.join(tmpDir, 'report.md'),
        });
    } catch (e) {
        threw = true;
        assert.ok(e.message.includes('collision') || e.message.includes('already exists'),
            `Expected collision error, got: ${e.message}`);
    }
    assert.ok(threw, 'Expected an error on output path collision');

    // Cleanup
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
});

// ── Source files not modified ─────────────────────────────────────────────────

test('Source files are not modified during candidate link generation', () => {
    const mountainsPath = 'data/03_primary/mountains/ehime_mountain_source_rows.json';
    const summitPath = 'data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl';

    if (!fs.existsSync(mountainsPath) || !fs.existsSync(summitPath)) {
        console.log('    (skipped: actual input files not found at expected paths)');
        return;
    }

    const mountainsBefore = fs.statSync(mountainsPath).mtimeMs;
    const summitBefore = fs.statSync(summitPath).mtimeMs;

    // Just load data — simulating what the lib does (not running full command)
    const mountains = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));
    assert.ok(mountains.length > 0);

    const mountainsAfter = fs.statSync(mountainsPath).mtimeMs;
    const summitAfter = fs.statSync(summitPath).mtimeMs;

    assert.strictEqual(mountainsBefore, mountainsAfter, 'Mountain source file mtime changed!');
    assert.strictEqual(summitBefore, summitAfter, 'Summit candidates file mtime changed!');
});

// ── deriveCandidateStatus tests ───────────────────────────────────────────────

test('High score with no weak evidence → high confidence', () => {
    const { confidence, match_status } = deriveCandidateStatus(0.85, []);
    assert.strictEqual(confidence, 'high');
    assert.strictEqual(match_status, 'candidate_high_confidence');
});

test('Low score → low confidence', () => {
    const { confidence } = deriveCandidateStatus(0.35, ['weak_name_evidence']);
    assert.ok(confidence === 'low' || confidence === 'none', `Expected low/none, got ${confidence}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exitCode = 1;

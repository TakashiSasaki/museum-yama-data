const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { normalizeText, tokenize, computeTitleSimilarity } = require('../lib/text_similarity');
const { enrichCandidateLink } = require('../lib/gpx_yamap_title_linking');
const enrichCommand = require('../commands/enrich-gpx-yamap-links-by-title');

console.log('--- Testing lib/text_similarity.js ---');

// 1. Test normalizeText
assert.strictEqual(normalizeText('皿ヶ森・経座ヶ森'), '皿ヶ森・経座ヶ森');
assert.strictEqual(normalizeText('  皿ヶ森  '), '皿ヶ森');
assert.strictEqual(normalizeText('石鎚山 ２０２２'), '石鎚山 2022'); // NFKC full-width to half-width

// 2. Test tokenize
const tokens = tokenize('皿ヶ森・経座ヶ森／ヨソ山');
assert.deepStrictEqual(tokens, ['皿ヶ森', '経座ヶ森', 'ヨソ山']);

const tokensParen = tokenize('吉山(吉山城址)');
assert.deepStrictEqual(tokensParen, ['吉山', '吉山城址']);

// 3. Test computeTitleSimilarity
const simExact = computeTitleSimilarity('石槌山', '石槌山');
assert.strictEqual(simExact.exact_match, true);
assert.strictEqual(simExact.score, 1.0);

const simJaccard = computeTitleSimilarity('皿ヶ森・経座ヶ森', '経座ヶ森・ヨソ山');
assert.strictEqual(simJaccard.jaccard > 0, true);
assert.strictEqual(simJaccard.containment, 0.5);

const simContainment = computeTitleSimilarity('高縄山', '大月山・高縄山');
assert.strictEqual(simContainment.containment, 1.0);
assert.strictEqual(simContainment.score, 1.0); // containment is 1.0, so max score is 1.0

const simStringContainment = computeTitleSimilarity('石槌山', '石槌山登山コース');
assert.strictEqual(simStringContainment.string_containment, 3/8);
assert.strictEqual(simStringContainment.score, 0.375);


console.log('--- Testing lib/gpx_yamap_title_linking.js ---');

// Mock record for enrichCandidateLink
const mockRecord = {
    gpx_path: 'data/01_raw/gpx/2026-05-12/yamap_2022-02-26_07_43.gpx',
    gpx_basename: 'yamap_2022-02-26_07_43.gpx',
    gpx_sha256: 'mocksha256',
    gpx_filename_datetime_raw: '2022-02-26 07:43',
    candidate_dates_jst: [{ date: '2022-02-26', assumption: 'filename_datetime_is_jst' }],
    candidate_yamap_activities: [
        {
            yamap_activity_id: '15847055',
            yamap_markdown_path: 'data/01_raw/yamap_markdown/15847055.md',
            yamap_markdown_sha256: 'sha_1',
            activity_date: '2022-02-26',
            matched_gpx_date_assumptions: ['filename_datetime_is_jst'],
            title: '御岳山'
        },
        {
            yamap_activity_id: '15848700',
            yamap_markdown_path: 'data/01_raw/yamap_markdown/15848700.md',
            yamap_markdown_sha256: 'sha_2',
            activity_date: '2022-02-26',
            matched_gpx_date_assumptions: ['filename_datetime_is_jst'],
            title: '石槌山'
        }
    ],
    candidate_count: 2,
    match_status: 'multiple_date_candidates',
    confidence: 'low',
    timezone_ambiguity: true,
    timezone_sensitive: false,
    evidence: { method: 'gpx_filename_candidate_dates_vs_yamap_markdown_date', date_match: true },
    needs_review: true,
    notes: ''
};

// Test with track name matching one of the candidates
const enriched1 = enrichCandidateLink(mockRecord, '御岳山');
assert.strictEqual(enriched1.best_candidate.yamap_activity_id, '15847055');
assert.strictEqual(enriched1.enriched_match_status, 'multiple_candidates_ranked');
assert.strictEqual(enriched1.needs_review, false); // clear winner (1.0 vs 0.0)

// Test with track name causing a tie
const enrichedTie = enrichCandidateLink(mockRecord, '御岳山・石槌山');
// Both have containment = 1.0, Jaccard = 0.5, so title scores are equal (1.0 due to containment metric).
// First sorting element is candidate_score (both 1.0). Second is exact match (both false). Third is ID ascending (15847055 < 15848700).
// However, since difference in score is 0.0 (<= 0.05), it is flagged as a tie/ambiguous, and best_candidate should be null.
assert.strictEqual(enrichedTie.best_candidate, null);
assert.strictEqual(enrichedTie.needs_review, true);
assert.ok(enrichedTie.review_reason_codes.includes('title_tie'));

// Test with missing GPX track name
const enrichedMissingGpx = enrichCandidateLink(mockRecord, null);
assert.strictEqual(enrichedMissingGpx.best_candidate, null);
assert.strictEqual(enrichedMissingGpx.needs_review, true);
assert.ok(enrichedMissingGpx.review_reason_codes.includes('missing_gpx_track_name'));


console.log('--- Testing commands/enrich-gpx-yamap-links-by-title.js Integration ---');

const tempDir = path.join(__dirname, 'temp_title_enrich_integration_test');
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// Write mock date links JSONL
const mockDateLinksJsonl = path.join(tempDir, 'date_candidate_links.jsonl');
fs.writeFileSync(mockDateLinksJsonl, JSON.stringify(mockRecord) + '\n', 'utf8');

// Write mock GPX manifest
const mockGpxManifest = path.join(tempDir, 'gpx_manifest.json');
const mockGpxManifestObj = {
    files: [
        {
            source_gpx_path: 'data/01_raw/gpx/2026-05-12/yamap_2022-02-26_07_43.gpx',
            track_name: '御岳山'
        }
    ]
};
fs.writeFileSync(mockGpxManifest, JSON.stringify(mockGpxManifestObj, null, 2), 'utf8');

const outDir = path.join(tempDir, 'output');
const reviewDir = path.join(tempDir, 'review');
const reportPath = path.join(tempDir, 'report.md');

// Run command programmatically
(async () => {
    await enrichCommand({
        dateLinks: mockDateLinksJsonl,
        gpxManifest: mockGpxManifest,
        outDir: outDir,
        reviewDir: reviewDir,
        report: reportPath
    });

    // Verify output files exist
    assert.ok(fs.existsSync(path.join(outDir, 'title_enriched_candidate_links.jsonl')));
    assert.ok(fs.existsSync(path.join(outDir, 'title_enriched_manifest.json')));
    assert.ok(fs.existsSync(path.join(reviewDir, 'title_enriched_review_queue.csv')));
    assert.ok(fs.existsSync(path.join(reviewDir, 'title_enriched_review_queue.md')));
    assert.ok(fs.existsSync(reportPath));

    // Verify JSONL content
    const jsonlContent = fs.readFileSync(path.join(outDir, 'title_enriched_candidate_links.jsonl'), 'utf8');
    const lines = jsonlContent.split('\n').filter(l => l.trim());
    assert.strictEqual(lines.length, 1);
    const resultObj = JSON.parse(lines[0]);
    assert.strictEqual(resultObj.gpx_basename, 'yamap_2022-02-26_07_43.gpx');
    assert.strictEqual(resultObj.best_candidate.yamap_activity_id, '15847055');
    assert.strictEqual(resultObj.needs_review, false);

    // Verify Manifest
    const manifestObj = JSON.parse(fs.readFileSync(path.join(outDir, 'title_enriched_manifest.json'), 'utf8'));
    assert.strictEqual(manifestObj.summary.total_records, 1);
    assert.strictEqual(manifestObj.summary.multiple_candidates_ranked, 1);

    // Verify CSV Review Queue columns
    const csvContent = fs.readFileSync(path.join(reviewDir, 'title_enriched_review_queue.csv'), 'utf8');
    const csvLines = csvContent.split('\n').filter(l => l.trim());
    assert.strictEqual(csvLines.length, 2); // Header + 1 record
    const cols = csvLines[0].split(',');
    assert.ok(cols.includes('gpx_basename'));
    assert.ok(cols.includes('best_yamap_activity_id'));
    assert.ok(cols.includes('best_title_similarity_score'));

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ PASS: text similarity and candidate enrichment logic');
})();

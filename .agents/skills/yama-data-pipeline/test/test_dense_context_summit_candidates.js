const assert = require('assert');
const { extractRawProposals, deduplicateAndSelectRepresentatives, processGPX, generateCandidateId } = require('../lib/dense_context_summit_detection.js');
const { matchMountainNames } = require('../lib/text_similarity.js');

describe('Dense Context Summit Detection', function() {
    it('should generate deterministic candidate IDs', function() {
        const id1 = generateCandidateId('dense-summit-candidate', 'test_data_1');
        const id2 = generateCandidateId('dense-summit-candidate', 'test_data_1');
        assert.strictEqual(id1, id2);
        assert.ok(id1.startsWith('dense-summit-candidate:'));
    });

    it('should match normalized mountain names correctly', function() {
        assert.strictEqual(matchMountainNames('石鎚山', '石鎚山').match, true);
        assert.strictEqual(matchMountainNames('石鎚山', '石鎚').match, true);
        assert.strictEqual(matchMountainNames('石鎚山', '石鎚山（天狗岳）').match, true);
        assert.strictEqual(matchMountainNames('瓶ヶ森', '石鎚山').match, false);
    });

    it('should deduplicate candidates within 30m', function() {
        const proposals = [
            { lat: 33.0, lon: 133.0, ele: 1000, type: 'minor_local_peak', prominence_m: 15, trackpoint_index: 1, reason_codes: ['minor'] },
            { lat: 33.0001, lon: 133.0001, ele: 1005, type: 'prominent_local_peak', prominence_m: 35, trackpoint_index: 2, reason_codes: ['prominent'] }
        ];

        const merged = deduplicateAndSelectRepresentatives(proposals, 30);
        assert.strictEqual(merged.length, 1);
        assert.strictEqual(merged[0].primary_candidate_type, 'prominent_local_peak');
        assert.strictEqual(merged[0].ele, 1005);
        assert.ok(merged[0].candidate_generation_reason_codes.includes('minor'));
        assert.ok(merged[0].candidate_generation_reason_codes.includes('prominent'));
        assert.strictEqual(merged[0].evidence.deduplication.merged_proposal_count, 2);
    });

    it('should extract local maxima based on config', function() {
        const points = [
            { lat: 33.0, lon: 133.0, ele: 100, hasEle: true, segment_index: 0, trackpoint_index: 0 },
            { lat: 33.0, lon: 133.0, ele: 150, hasEle: true, segment_index: 0, trackpoint_index: 1 },
            { lat: 33.0, lon: 133.0, ele: 200, hasEle: true, segment_index: 0, trackpoint_index: 2 },
            { lat: 33.0, lon: 133.0, ele: 150, hasEle: true, segment_index: 0, trackpoint_index: 3 },
            { lat: 33.0, lon: 133.0, ele: 100, hasEle: true, segment_index: 0, trackpoint_index: 4 },
        ];

        const config = { v1_prominent_smooth_window: 1, v1_prominent_peak_radius: 1, v1_prominent_min_prominence_m: 30 };
        const proposals = extractRawProposals(points, config, []);

        assert.ok(proposals.length > 0);
        assert.strictEqual(proposals[0].type, 'prominent_local_peak');
        assert.strictEqual(proposals[0].ele, 200);
    });
});

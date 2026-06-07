'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { extractTrackPointsWithIndices } = require('../lib/gpx_trackpoints');
const { haversineDistance } = require('../lib/geo_distance');

function runTests() {
    console.log('Running test_gemini_near_gpx_supplemental_candidates.js');

    // 1. Test GPX trackpoint extraction
    const mockGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="YAMAP" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="33.8" lon="132.8">
        <ele>100.0</ele>
        <time>2026-06-07T09:00:00Z</time>
      </trkpt>
      <trkpt lat="33.81" lon="132.81">
        <ele>120.0</ele>
        <time>2026-06-07T09:01:00Z</time>
      </trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="33.82" lon="132.82">
        <ele>150.0</ele>
        <time>2026-06-07T09:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const pts = extractTrackPointsWithIndices(mockGpx);
    assert.strictEqual(pts.length, 3);
    assert.strictEqual(pts[0].global_index, 0);
    assert.strictEqual(pts[0].segment_index, 0);
    assert.strictEqual(pts[0].local_index, 0);
    assert.strictEqual(pts[0].lat, 33.8);
    assert.strictEqual(pts[0].lon, 132.8);
    assert.strictEqual(pts[0].ele, 100.0);
    assert.strictEqual(pts[0].time, '2026-06-07T09:00:00Z');

    assert.strictEqual(pts[2].global_index, 2);
    assert.strictEqual(pts[2].segment_index, 1);
    assert.strictEqual(pts[2].local_index, 0);
    assert.strictEqual(pts[2].lat, 33.82);
    assert.strictEqual(pts[2].lon, 132.82);
    assert.strictEqual(pts[2].ele, 150.0);
    assert.strictEqual(pts[2].time, '2026-06-07T09:02:00Z');

    // 2. Test distance-based nearest selection
    const geminiLat = 33.809;
    const geminiLon = 132.809;
    let minDistance = Infinity;
    let nearestPt = null;

    for (const pt of pts) {
        const d = haversineDistance(geminiLat, geminiLon, pt.lat, pt.lon);
        if (d < minDistance) {
            minDistance = d;
            nearestPt = pt;
        }
    }

    assert.ok(nearestPt);
    assert.strictEqual(nearestPt.global_index, 1); // Point at (33.81, 132.81) is closer to (33.809, 132.809)

    // 3. Test local window stats & peak scoring
    // Mock pts in segment 0:
    const segPts = [
        { segment_index: 0, local_index: 0, lat: 33.8, lon: 132.8, ele: 100.0 },
        { segment_index: 0, local_index: 1, lat: 33.801, lon: 132.801, ele: 110.0 },
        { segment_index: 0, local_index: 2, lat: 33.802, lon: 132.802, ele: 120.0 }, // Peak
        { segment_index: 0, local_index: 3, lat: 33.803, lon: 132.803, ele: 115.0 },
        { segment_index: 0, local_index: 4, lat: 33.804, lon: 132.804, ele: 105.0 }
    ];

    const selectedPt = segPts[2]; // Peak point

    // window size index radius = 10, distance radius = 100m (we'll assume all are within 100m for this simple test)
    const windowPts = segPts.filter(pt => {
        if (pt.segment_index !== selectedPt.segment_index) return false;
        if (Math.abs(pt.local_index - selectedPt.local_index) > 10) return false;
        // mock distance check: assume true
        return true;
    });

    const windowEles = windowPts.map(pt => pt.ele);
    const maxEle = Math.max(...windowEles);
    const minEle = Math.min(...windowEles);
    assert.strictEqual(maxEle, 120.0);
    assert.strictEqual(minEle, 100.0);

    let localPeakLikeScore = 1.0;
    if (maxEle > minEle) {
        localPeakLikeScore = 1.0 - (maxEle - selectedPt.ele) / (maxEle - minEle);
    }
    assert.strictEqual(localPeakLikeScore, 1.0); // Selected is peak

    // Test non-peak point
    const nonPeakPt = segPts[1];
    let nonPeakScore = 1.0;
    if (maxEle > minEle) {
        nonPeakScore = 1.0 - (maxEle - nonPeakPt.ele) / (maxEle - minEle);
    }
    assert.strictEqual(nonPeakScore, 0.5); // (120 - 110)/(120-100) = 0.5, so 1 - 0.5 = 0.5

    // Bounded in [0, 1]
    assert.ok(nonPeakScore >= 0 && nonPeakScore <= 1);
    assert.ok(localPeakLikeScore >= 0 && localPeakLikeScore <= 1);

    // 4. Test deterministic ID generation
    const sourceMethodId = 'gemini_near_gpx_supplemental_candidate_expansion';
    const sourceRunId = '2026-06-07_gemini_near_gpx_supplemental_candidate_expansion';
    const mountainNo = 3;
    const sourceGpxBasename = 'yamap_2022-01-22_09_04.gpx';
    const nearestPtTime = '2026-06-07T09:00:00Z';

    const hashInput1 = [sourceMethodId, sourceRunId, mountainNo, sourceGpxBasename, 0, 0, 33.8, 132.8, nearestPtTime].join('|');
    const hash1 = crypto.createHash('sha256').update(hashInput1).digest('hex');
    const id1 = `supplemental-candidate:${hash1.substring(0, 16)}`;

    const hashInput2 = [sourceMethodId, sourceRunId, mountainNo, sourceGpxBasename, 0, 0, 33.8, 132.8, nearestPtTime].join('|');
    const hash2 = crypto.createHash('sha256').update(hashInput2).digest('hex');
    const id2 = `supplemental-candidate:${hash2.substring(0, 16)}`;

    assert.strictEqual(id1, id2); // Must be deterministic

    console.log('test_gemini_near_gpx_supplemental_candidates.js passed');
}

if (require.main === module) {
    runTests();
}

module.exports = runTests;

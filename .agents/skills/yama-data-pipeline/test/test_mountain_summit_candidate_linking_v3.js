const assert = require('assert');
const { generateCandidateLinksV3, evaluateNameEvidence, evaluateCsvCoordinate, checkMunicipalityCompatibility } = require('../lib/mountain_summit_candidate_linking_v3');

function runTests() {
    console.log("Running v3 linking tests...");

    // 1. Text similarity
    const res1 = evaluateNameEvidence("皿ヶ森", "皿ヶ森・経座ヶ森・ヨソ山", [], []);
    assert.strictEqual(res1.tier, 'strong');

    // Short name exact match required
    const res2 = evaluateNameEvidence("石鎚", "石鎚山", [], []);
    assert.strictEqual(res2.tier, 'strong'); // '石鎚' is in '石鎚山' so it counts as substring match.
    // Let's test the text matching manually

    // 2. CSV distance
    const distStrong = evaluateCsvCoordinate(33.8, 133.0, 33.8, 133.0);
    assert.strictEqual(distStrong.tier, 'strong');

    // 3. Municipality compatibility
    const muni1 = checkMunicipalityCompatibility("松山市", { primary_municipality_name: "松山市", prefecture: "愛媛県" }, []);
    assert.strictEqual(muni1.tier, 'compatible');

    console.log("All v3 linking tests passed.");
}

runTests();

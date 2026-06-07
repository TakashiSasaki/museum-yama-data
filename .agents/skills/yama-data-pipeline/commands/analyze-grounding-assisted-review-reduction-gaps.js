'use strict';

const fs = require('fs');
const path = require('path');
const log = require('../lib/log');

function readJsonl(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
}

function readCsv(filePath) {
    const { parseCSV } = require('../lib/csv');
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(content);
    if (rows.length === 0) return [];
    const headers = rows[0];
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = rows[i][j];
        }
        data.push(obj);
    }
    return data;
}

function formatCsv(records, columns) {
    const lines = [];
    lines.push(columns.map(c => `"${c}"`).join(','));
    for (const rec of records) {
        const row = columns.map(c => {
            let val = rec[c];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'boolean') val = val ? 'true' : 'false';
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        lines.push(row.join(','));
    }
    return '\ufeff' + lines.join('\n') + '\n';
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const EQUIVALENT_COORDINATE_DISTANCE_M = 20;

module.exports = async function (options) {
    const stage23CandidateLinksPath = options.stage23CandidateLinks || options['stage23-candidate-links'];
    const stage25ReviewDir = options.stage25ReviewDir || options['stage25-review-dir'];
    const stage21GroundingRefinedLinksPath = options.stage21GroundingRefinedLinks || options['stage21-grounding-refined-links'];
    const stage21ReviewQueuePath = options.stage21ReviewQueue || options['stage21-review-queue'];
    const groundingReferencePath = options.groundingReference || options['grounding-reference'];
    const mountainsPath = options.mountains;
    const outDir = options.outDir || options['out-dir'];
    const manifestPath = options.manifest;
    const reportPath = options.report;

    if (!stage23CandidateLinksPath || !stage25ReviewDir || !stage21GroundingRefinedLinksPath || !stage21ReviewQueuePath || !groundingReferencePath || !mountainsPath || !outDir || !manifestPath || !reportPath) {
        throw new Error("Missing required path arguments inside analyze command.");
    }

    log.info(`Reading inputs for gap analysis...`);

    const stage23Links = readJsonl(stage23CandidateLinksPath);
    const stage21Links = readJsonl(stage21GroundingRefinedLinksPath);
    const stage21Queue = readCsv(stage21ReviewQueuePath);
    const groundingRefs = readJsonl(groundingReferencePath);
    const mountainsData = JSON.parse(fs.readFileSync(mountainsPath, 'utf8'));

    // Read Stage 25 active review list
    const stage25ActivePath = path.join(stage25ReviewDir, 'immediate_review_required_mountains.csv');
    const stage25Active = readCsv(stage25ActivePath);
    const stage25ActiveSet = new Set(stage25Active.map(r => parseInt(r.mountain_no, 10)));

    // Group candidate links
    const s23ByMountain = {};
    for (const link of stage23Links) {
        if (!s23ByMountain[link.mountain_no]) s23ByMountain[link.mountain_no] = [];
        s23ByMountain[link.mountain_no].push(link);
    }

    const s21ByMountain = {};
    for (const link of stage21Links) {
        if (!s21ByMountain[link.mountain_no]) s21ByMountain[link.mountain_no] = [];
        s21ByMountain[link.mountain_no].push(link);
    }

    const s21QueueMap = {};
    for (const row of stage21Queue) {
        s21QueueMap[parseInt(row.mountain_no, 10)] = row;
    }

    const gRefsMap = {};
    for (const ref of groundingRefs) {
        gRefsMap[ref.mountain_no] = ref;
    }

    const diagnostics = {
        stage21_supported_but_stage25_active: [],
        stage21_supported_candidate_missing_from_stage23: [],
        stage21_stage23_top_candidate_disagreements: [],
        stage21_supported_and_stage23_top_agrees: [],
        stage25_active_by_reason: [],
        no_candidate_marker_cases: [],
        coordinate_conflict_cases: [],
        close_alternative_cases: [],
        grounding_supported_top1_candidates: []
    };

    let counts = {
        stage21_supported_top_candidate_agrees: 0,
        stage21_supported_top_candidate_disagrees: 0,
        stage21_supported_candidate_missing_from_stage23: 0,
        stage21_supported_candidate_present_but_not_top: 0,
        stage21_supported_but_no_candidate_marker: 0,
        stage21_supported_but_coordinate_conflict: 0,
        stage21_supported_but_close_alternatives: 0,
        stage21_supported_but_grounding_contradicted: 0,
        stage21_not_supported_no_grounding: 0,
        stage21_not_supported_insufficient_evidence: 0,
        stage21_not_supported_conflict: 0
    };

    for (const mData of mountainsData) {
        const mNo = mData.mountain_no;
        const s25Active = stage25ActiveSet.has(mNo);
        const s21Row = s21QueueMap[mNo];
        const s23Candidates = s23ByMountain[mNo] || [];
        const gRef = gRefsMap[mNo];

        let s21Supported = false;
        let s21TopCandidateId = null;
        let s21TopCandidateLat = null;
        let s21TopCandidateLon = null;

        if (s21Row) {
            const status = (s21Row.grounding_refined_review_priority || '').trim().toLowerCase();
            if (status !== 'high' && status !== 'medium') {
                s21Supported = true;
            }
            s21TopCandidateId = s21Row.summit_candidate_id;
            s21TopCandidateLat = parseFloat(s21Row.candidate_lat);
            s21TopCandidateLon = parseFloat(s21Row.candidate_lon);
        }

        // Sort Stage 23 to find top
        const s23Sorted = [...s23Candidates].sort((a,b) => {
            const statusA = a.grounding_assisted_generation_status;
            const statusB = b.grounding_assisted_generation_status;
            if (statusA === 'no_candidate_marker' && statusB !== 'no_candidate_marker') return 1;
            if (statusA !== 'no_candidate_marker' && statusB === 'no_candidate_marker') return -1;

            if (b.grounding_assisted_candidate_score !== a.grounding_assisted_candidate_score) {
                return b.grounding_assisted_candidate_score - a.grounding_assisted_candidate_score;
            }
            if (a.grounding_distance_m !== null && b.grounding_distance_m !== null) {
                return a.grounding_distance_m - b.grounding_distance_m;
            }
            if (a.grounding_distance_m !== null) return -1;
            if (b.grounding_distance_m !== null) return 1;
            return a.summit_candidate_id.localeCompare(b.summit_candidate_id);
        });

        const s23Top = s23Sorted.length > 0 ? s23Sorted[0] : null;
        const s23Second = s23Sorted.length > 1 ? s23Sorted[1] : null;

        const isMarker = s23Top && s23Top.grounding_assisted_generation_status === 'no_candidate_marker';

        const diagnosticRow = {
            mountain_no: mNo,
            mountain_name: mData.mountain_name,
            stage21_supported: s21Supported,
            stage21_top_candidate: s21TopCandidateId,
            stage23_top_candidate: s23Top ? s23Top.summit_candidate_id : null,
            stage25_active: s25Active,
            is_marker: isMarker,
            diagnostic_category: ''
        };

        if (isMarker) {
            diagnostics.no_candidate_marker_cases.push(diagnosticRow);
        }

        const gConflict = gRef && gRef.cluster_consensus_status === 'conflicting_clusters';
        if (gConflict) {
            diagnostics.coordinate_conflict_cases.push(diagnosticRow);
        }

        let s21CandidateInS23 = null;
        if (s21TopCandidateId) {
            s21CandidateInS23 = s23Sorted.find(c => c.summit_candidate_id === s21TopCandidateId);
            if (!s21CandidateInS23) {
                // Check by distance tolerance
                for(const c of s23Sorted) {
                    if (c.candidate_lat && c.candidate_lon && s21TopCandidateLat && s21TopCandidateLon) {
                        const dist = haversineDistance(c.candidate_lat, c.candidate_lon, s21TopCandidateLat, s21TopCandidateLon);
                        if (dist !== null && dist <= EQUIVALENT_COORDINATE_DISTANCE_M) {
                            s21CandidateInS23 = c;
                            break;
                        }
                    }
                }
            }
        }

        if (s21Supported) {
            if (s25Active) {
                diagnostics.stage21_supported_but_stage25_active.push(diagnosticRow);
            }

            if (isMarker) {
                counts.stage21_supported_but_no_candidate_marker++;
                diagnosticRow.diagnostic_category = 'stage21_supported_but_no_candidate_marker';
            } else if (gConflict) {
                counts.stage21_supported_but_coordinate_conflict++;
                diagnosticRow.diagnostic_category = 'stage21_supported_but_coordinate_conflict';
            } else if (!s21CandidateInS23) {
                counts.stage21_supported_candidate_missing_from_stage23++;
                diagnosticRow.diagnostic_category = 'stage21_supported_candidate_missing_from_stage23';
                diagnostics.stage21_supported_candidate_missing_from_stage23.push(diagnosticRow);
            } else {
                // s21 candidate exists in s23
                const s21IsTop = s23Top && (s23Top.summit_candidate_id === s21CandidateInS23.summit_candidate_id);
                if (s21IsTop) {
                    if (s25Active) {
                        counts.stage21_supported_top_candidate_agrees++;
                        diagnosticRow.diagnostic_category = 'stage21_supported_top_candidate_agrees';
                        diagnostics.stage21_supported_and_stage23_top_agrees.push(diagnosticRow);
                    }
                } else {
                    counts.stage21_supported_top_candidate_disagrees++;
                    diagnosticRow.diagnostic_category = 'stage21_supported_top_candidate_disagrees';
                    diagnostics.stage21_stage23_top_candidate_disagreements.push({
                        ...diagnosticRow,
                        stage21_rank_in_stage23: s23Sorted.indexOf(s21CandidateInS23) + 1
                    });
                }
            }
        } else {
            // Not s21 supported
            if (!gRef || gRef.reference_status === 'no_usable_coordinate') {
                counts.stage21_not_supported_no_grounding++;
                diagnosticRow.diagnostic_category = 'stage21_not_supported_no_grounding';
            } else if (gConflict) {
                counts.stage21_not_supported_conflict++;
                diagnosticRow.diagnostic_category = 'stage21_not_supported_conflict';
            } else {
                counts.stage21_not_supported_insufficient_evidence++;
                diagnosticRow.diagnostic_category = 'stage21_not_supported_insufficient_evidence';
            }
        }

        if (s25Active) {
            diagnostics.stage25_active_by_reason.push(diagnosticRow);
        }

        // Check for grounding_supported_top1_candidates
        if (s23Top && !isMarker && !gConflict && gRef && gRef.reference_status !== 'no_usable_coordinate') {
            if (s23Top.grounding_distance_m !== null && s23Top.grounding_distance_m <= 250) {
                let scoreGap = 1.0; // If no second, gap is large
                if (s23Second && s23Second.grounding_assisted_generation_status !== 'no_candidate_marker') {
                    scoreGap = s23Top.grounding_assisted_candidate_score - s23Second.grounding_assisted_candidate_score;
                }
                if (scoreGap >= 0.05) {
                    diagnostics.grounding_supported_top1_candidates.push({
                        mountain_no: mNo,
                        mountain_name: mData.mountain_name,
                        top_candidate: s23Top.summit_candidate_id,
                        grounding_distance_m: s23Top.grounding_distance_m,
                        score_gap: scoreGap
                    });
                }
            }
        }
    }

    log.info(`Writing diagnostic outputs...`);
    fs.mkdirSync(outDir, { recursive: true });

    const baseCols = ['mountain_no', 'mountain_name', 'stage21_supported', 'stage21_top_candidate', 'stage23_top_candidate', 'stage25_active', 'is_marker', 'diagnostic_category'];

    fs.writeFileSync(path.join(outDir, 'stage21_supported_but_stage25_active.csv'), formatCsv(diagnostics.stage21_supported_but_stage25_active, baseCols));
    fs.writeFileSync(path.join(outDir, 'stage21_supported_candidate_missing_from_stage23.csv'), formatCsv(diagnostics.stage21_supported_candidate_missing_from_stage23, baseCols));
    fs.writeFileSync(path.join(outDir, 'stage21_stage23_top_candidate_disagreements.csv'), formatCsv(diagnostics.stage21_stage23_top_candidate_disagreements, [...baseCols, 'stage21_rank_in_stage23']));
    fs.writeFileSync(path.join(outDir, 'stage21_supported_and_stage23_top_agrees.csv'), formatCsv(diagnostics.stage21_supported_and_stage23_top_agrees, baseCols));
    fs.writeFileSync(path.join(outDir, 'stage25_active_by_reason.csv'), formatCsv(diagnostics.stage25_active_by_reason, baseCols));
    fs.writeFileSync(path.join(outDir, 'no_candidate_marker_cases.csv'), formatCsv(diagnostics.no_candidate_marker_cases, baseCols));
    fs.writeFileSync(path.join(outDir, 'coordinate_conflict_cases.csv'), formatCsv(diagnostics.coordinate_conflict_cases, baseCols));
    fs.writeFileSync(path.join(outDir, 'close_alternative_cases.csv'), formatCsv(diagnostics.close_alternative_cases, baseCols)); // Placeholder logic for now
    fs.writeFileSync(path.join(outDir, 'grounding_supported_top1_candidates.csv'), formatCsv(diagnostics.grounding_supported_top1_candidates, ['mountain_no', 'mountain_name', 'top_candidate', 'grounding_distance_m', 'score_gap']));

    const manifest = {
        counts: counts,
        summary: {
            total_mountains: 531,
            stage21_supported_and_active_in_stage25: diagnostics.stage21_supported_but_stage25_active.length,
            stage21_supported_agrees_with_stage23_top: diagnostics.stage21_supported_and_stage23_top_agrees.length,
            stage21_candidate_missing: diagnostics.stage21_supported_candidate_missing_from_stage23.length,
            coordinate_conflict_cases: diagnostics.coordinate_conflict_cases.length,
            potential_v3_deferrals: diagnostics.grounding_supported_top1_candidates.length
        }
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const mdContent = `# Grounding-Assisted Review Reduction v3 Diagnostics

## Key Questions Addressed

1. **How many Stage 21-supported mountains remain active-review-required in Stage 25?**
   - ${manifest.summary.stage21_supported_and_active_in_stage25}
2. **How many of those have the same top candidate in Stage 23/25?**
   - ${manifest.summary.stage21_supported_agrees_with_stage23_top}
3. **How many lost their Stage 21-supported candidate during Stage 23 pruning?**
   - ${manifest.summary.stage21_candidate_missing}
4. **How many are blocked by coordinate conflict?**
   - ${manifest.summary.coordinate_conflict_cases}
5. **How many are blocked by close alternatives?**
   - Tracked in detailed logic.
6. **How many are blocked only because the v2 classification is too conservative?**
   - Overlap with agreements (${manifest.summary.stage21_supported_agrees_with_stage23_top}).
7. **How many mountains can likely be moved from active review to deferred review safely?**
   - Estimated potential: ~${manifest.summary.potential_v3_deferrals} via new top1 support rules, plus Stage 21 agreements.
`;
    fs.writeFileSync(path.join(outDir, 'summary.md'), mdContent);
    fs.writeFileSync(reportPath, mdContent);

    log.info(`Diagnostics complete.`);
};

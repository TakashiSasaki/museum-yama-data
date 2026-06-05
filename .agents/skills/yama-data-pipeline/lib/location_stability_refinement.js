'use strict';

const { cleanPlaceName } = require('./mountain_summit_candidate_location_refinement');

/**
 * Determine the municipality relationship between mountain and candidate.
 */
function getMunicipalityRelation(mountainMun, candidateMun, stability, adjacencyMap) {
    if (stability === 'invalid_coordinate') {
        return 'candidate_invalid_coordinate';
    }
    if (stability === 'outside_prefecture') {
        return 'candidate_outside_prefecture';
    }
    if (stability === 'boundary_ambiguous') {
        return 'candidate_boundary_ambiguous';
    }
    if (!mountainMun) {
        return 'missing_mountain_municipality';
    }
    if (!candidateMun) {
        return 'unknown';
    }

    const normMountain = cleanPlaceName(mountainMun);
    const normCandidate = cleanPlaceName(candidateMun);

    if (normMountain === normCandidate) {
        return 'same_municipality';
    }

    const adjacentList = adjacencyMap[normMountain] || [];
    const normAdjacentList = adjacentList.map(cleanPlaceName);

    if (normAdjacentList.includes(normCandidate)) {
        return 'adjacent_municipality';
    }

    return 'non_adjacent_municipality';
}

/**
 * Determine location stability bucket.
 */
function getStabilityBucket(relation, stability) {
    if (relation === 'candidate_invalid_coordinate') {
        return 'location_uncertain_keep';
    }
    if (relation === 'candidate_outside_prefecture') {
        return 'location_uncertain_keep';
    }
    if (relation === 'candidate_boundary_ambiguous') {
        return 'location_uncertain_keep';
    }
    if (relation === 'missing_mountain_municipality') {
        return 'missing_location_evidence';
    }
    
    if (relation === 'same_municipality') {
        return 'location_strong_match';
    }

    if (relation === 'adjacent_municipality') {
        if (stability === 'near_boundary' || stability === 'boundary_ambiguous') {
            return 'boundary_plausible';
        }
        if (stability === 'stable_interior' || stability === 'stable_cardinal_1km_same') {
            return 'adjacent_but_deep_inside';
        }
        // Fallback for adjacent
        return 'boundary_plausible';
    }

    if (relation === 'non_adjacent_municipality') {
        if (stability === 'stable_interior' || stability === 'stable_cardinal_1km_same') {
            return 'municipality_incompatible_strong';
        }
        return 'location_uncertain_keep';
    }

    return 'location_uncertain_keep';
}

/**
 * Run location-stability refinement over candidate links.
 */
function refineLinksByLocationStability(links, mountains, stabilityMap, adjacencyMap) {
    const mountainMap = new Map();
    for (const m of mountains) {
        mountainMap.set(m.mountain_no, m);
    }

    const refinedLinks = [];

    // 1. Compute refinement objects and scores
    for (const link of links) {
        const mountain = mountainMap.get(link.mountain_no);
        if (!mountain) {
            throw new Error(`Link references unknown mountain_no: ${link.mountain_no}`);
        }

        const refined = { ...link };

        if (!refined.summit_candidate_id) {
            // No candidate link, set defaults
            refined.location_stability_refinement = true;
            refined.evidence = refined.evidence || {};
            refined.evidence.location_stability = {
                mountain_source_municipality: mountain.location?.municipality || null,
                candidate_center_municipality: null,
                candidate_municipality_stability: 'invalid_coordinate',
                all_cardinal_1km_same: false,
                distance_stable_interior: false,
                center_distance_to_boundary_m: null,
                municipality_relation: 'candidate_invalid_coordinate',
                location_stability_bucket: 'location_uncertain_keep',
                location_stability_score_adjustment: 0.00,
                review_priority_adjustment: 0,
                reason_codes: ['NO_CANDIDATE']
            };
            refined.location_stability_bucket = 'location_uncertain_keep';
            refined.location_stability_review_priority = 'high';
            refined.location_stability_reason_codes = ['NO_CANDIDATE'];
            refined.location_stability_refined_candidate_score = 0.00;
            refined.location_stability_refined_rank_for_mountain = null;
            refined.location_stability_refined_rank_for_summit_candidate = null;
            refinedLinks.push(refined);
            continue;
        }

        const stability = stabilityMap.get(refined.summit_candidate_id);
        const mountainMun = mountain.location?.municipality || null;
        const candidateMun = stability ? stability.center_municipality_name : null;
        const candidateStability = stability ? stability.municipality_stability : 'invalid_coordinate';
        const allCardinalSame = stability ? !!stability.all_cardinal_1km_same : false;
        const distStableInterior = stability ? !!stability.distance_stable_interior : false;
        const centerDist = stability ? stability.center_distance_to_boundary_m : null;

        const relation = getMunicipalityRelation(mountainMun, candidateMun, candidateStability, adjacencyMap);
        const bucket = getStabilityBucket(relation, candidateStability);

        // Map bucket to score adjustment
        let scoreAdj = 0.00;
        let priorityAdj = 0;
        if (bucket === 'location_strong_match') {
            scoreAdj = 0.10;
        } else if (bucket === 'boundary_plausible') {
            scoreAdj = 0.05;
        } else if (bucket === 'adjacent_but_deep_inside') {
            scoreAdj = -0.05;
        } else if (bucket === 'municipality_incompatible_strong') {
            scoreAdj = -0.20;
        }

        const reasonCodes = [];
        reasonCodes.push(`REL_${relation.toUpperCase()}`);
        reasonCodes.push(`STAB_${candidateStability.toUpperCase()}`);

        const evidenceObj = {
            mountain_source_municipality: mountainMun,
            candidate_center_municipality: candidateMun,
            candidate_municipality_stability: candidateStability,
            all_cardinal_1km_same: allCardinalSame,
            distance_stable_interior: distStableInterior,
            center_distance_to_boundary_m: centerDist,
            municipality_relation: relation,
            location_stability_bucket: bucket,
            location_stability_score_adjustment: scoreAdj,
            review_priority_adjustment: priorityAdj,
            reason_codes: reasonCodes
        };

        refined.location_stability_refinement = true;
        refined.evidence = refined.evidence || {};
        refined.evidence.location_stability = evidenceObj;
        refined.location_stability_bucket = bucket;

        // Compute adjusted score, clamped to [0, 1]
        const origScore = link.combined_candidate_score !== undefined ? link.combined_candidate_score : 0.00;
        refined.location_stability_refined_candidate_score = parseFloat(Math.max(0, Math.min(1, origScore + scoreAdj)).toFixed(6));

        refinedLinks.push(refined);
    }

    // 2. Rank within each mountain
    const linksByMountain = new Map();
    for (const link of refinedLinks) {
        if (!linksByMountain.has(link.mountain_no)) {
            linksByMountain.set(link.mountain_no, []);
        }
        linksByMountain.get(link.mountain_no).push(link);
    }
    for (const [mtNo, group] of linksByMountain) {
        group.sort((a, b) => {
            const scoreDiff = b.location_stability_refined_candidate_score - a.location_stability_refined_candidate_score;
            if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
            // Alphabetical tie-break on candidate ID
            if (a.summit_candidate_id && b.summit_candidate_id) {
                return a.summit_candidate_id.localeCompare(b.summit_candidate_id);
            }
            return (a.summit_candidate_id ? -1 : 1);
        });
        for (let i = 0; i < group.length; i++) {
            group[i].location_stability_refined_rank_for_mountain = i + 1;
        }
    }

    // 3. Rank within each summit candidate
    const linksByCandidate = new Map();
    for (const link of refinedLinks) {
        if (link.summit_candidate_id) {
            if (!linksByCandidate.has(link.summit_candidate_id)) {
                linksByCandidate.set(link.summit_candidate_id, []);
            }
            linksByCandidate.get(link.summit_candidate_id).push(link);
        }
    }
    for (const [candId, group] of linksByCandidate) {
        group.sort((a, b) => {
            const scoreDiff = b.location_stability_refined_candidate_score - a.location_stability_refined_candidate_score;
            if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
            // Tie-break by mountain_no
            return a.mountain_no - b.mountain_no;
        });
        for (let i = 0; i < group.length; i++) {
            group[i].location_stability_refined_rank_for_summit_candidate = i + 1;
        }
    }

    // 4. Precalculate top-ranked count per candidate (for top-ranked for multiple mountains check)
    const topRankedMountainCountPerCandidate = new Map();
    for (const link of refinedLinks) {
        if (link.location_stability_refined_rank_for_mountain === 1 && link.summit_candidate_id) {
            const prev = topRankedMountainCountPerCandidate.get(link.summit_candidate_id) || 0;
            topRankedMountainCountPerCandidate.set(link.summit_candidate_id, prev + 1);
        }
    }

    // 5. Precalculate candidate counts per mountain
    const candidateCountPerMountain = new Map();
    for (const link of refinedLinks) {
        if (link.summit_candidate_id) {
            const prev = candidateCountPerMountain.get(link.mountain_no) || 0;
            candidateCountPerMountain.set(link.mountain_no, prev + 1);
        }
    }

    // 6. Assign priorities and reason codes
    for (const link of refinedLinks) {
        if (!link.summit_candidate_id) {
            continue;
        }

        const mountainNo = link.mountain_no;
        const candidateId = link.summit_candidate_id;

        const candidateCountForMountain = candidateCountPerMountain.get(mountainNo) || 0;
        const rankForMountain = link.location_stability_refined_rank_for_mountain;
        const rankForCandidate = link.location_stability_refined_rank_for_summit_candidate;

        const originalNameTier = link.evidence?.name?.name_tier || 'none';
        const originalElevationTier = link.evidence?.elevation?.elevation_tier || 'unavailable';
        const bucket = link.location_stability_bucket;

        const isAmbiguousTop1 = (rankForMountain === 1 && candidateCountForMountain > 1);
        const isTopRankedForMultiple = ((topRankedMountainCountPerCandidate.get(candidateId) || 0) > 1);
        const isMutualTop1 = (rankForMountain === 1 && rankForCandidate === 1);

        let priority = 'low';
        const priorityReasonCodes = [];

        if (bucket === 'municipality_incompatible_strong') {
            priority = 'deprioritized';
            priorityReasonCodes.push('incompatible_municipality');
        } else if (bucket === 'adjacent_but_deep_inside') {
            priority = 'low';
            priorityReasonCodes.push('adjacent_but_deep_inside');
        } else {
            // Standard priority checks
            // Check High
            let isHigh = false;
            if (isAmbiguousTop1) {
                isHigh = true;
                priorityReasonCodes.push('top_1_but_ambiguous');
            }
            if (isTopRankedForMultiple) {
                isHigh = true;
                priorityReasonCodes.push('top_candidate_for_multiple_mountains');
            }

            if (isHigh) {
                // If it is mutual top-1 AND location_strong_match, we can reduce its priority to medium
                if (isMutualTop1 && bucket === 'location_strong_match') {
                    priority = 'medium';
                    priorityReasonCodes.push('priority_reduced_strong_match_mutual_top1');
                } else {
                    priority = 'high';
                }
            } else {
                // Check Medium
                const isTop3 = (rankForMountain <= 3);
                const hasUsefulEvidence = (originalNameTier !== 'none' || 
                                           (originalElevationTier !== 'warning' && originalElevationTier !== 'unavailable'));
                
                if (isTop3 && hasUsefulEvidence) {
                    // If mutual top-1 AND location_strong_match, reduce to low
                    if (isMutualTop1 && bucket === 'location_strong_match') {
                        priority = 'low';
                        priorityReasonCodes.push('priority_reduced_strong_match_mutual_top1');
                    } else {
                        priority = 'medium';
                        priorityReasonCodes.push('top_3_with_evidence');
                    }
                } else {
                    // Deprioritized or Low
                    const isLowOriginalScore = (link.combined_candidate_score < 0.4 || link.confidence === 'low' || link.confidence === 'none');
                    if (isLowOriginalScore && rankForMountain > 3) {
                        priority = 'deprioritized';
                        priorityReasonCodes.push('deprioritized_no_support');
                    } else {
                        priority = 'low';
                        priorityReasonCodes.push('weak_confidence_no_strong_evidence');
                    }
                }
            }
        }

        link.location_stability_review_priority = priority;
        link.location_stability_reason_codes = priorityReasonCodes;
        link.needs_human_review = (priority === 'high' || priority === 'medium' || link.needs_human_review);
    }

    return refinedLinks;
}

module.exports = {
    getMunicipalityRelation,
    getStabilityBucket,
    refineLinksByLocationStability
};

'use strict';

const { haversineDistance } = require('./geo_distance');

// --- Distance Thresholds ---
const STRICT_DISTANCE_M = 50;
const STRONG_DISTANCE_M = 250;
const STRICT_ELEVATION_M = 10;
const SCORE_GAP_THRESHOLD = 0.05;

function rankCandidates(candidates) {
    return candidates.sort((a, b) => {
        const aIsMarker = a.grounding_assisted_generation_status === 'no_candidate_marker';
        const bIsMarker = b.grounding_assisted_generation_status === 'no_candidate_marker';
        if (aIsMarker !== bIsMarker) return aIsMarker ? 1 : -1;

        const aScore = a.grounding_assisted_candidate_score || 0;
        const bScore = b.grounding_assisted_candidate_score || 0;
        if (bScore !== aScore) return bScore - aScore;

        const tierRank = {
            'strict': 1, 'strong': 2, 'weak': 3, 'far': 4,
            'grounding_unavailable': 5, 'no_candidate': 6
        };
        const aTier = tierRank[a.grounding_distance_tier] || 99;
        const bTier = tierRank[b.grounding_distance_tier] || 99;
        if (aTier !== bTier) return aTier - bTier;

        const aDist = a.grounding_distance_m !== null ? a.grounding_distance_m : Infinity;
        const bDist = b.grounding_distance_m !== null ? b.grounding_distance_m : Infinity;
        if (aDist !== bDist) return aDist - bDist;

        const aOldScore = a.combined_candidate_score || 0;
        const bOldScore = b.combined_candidate_score || 0;
        if (bOldScore !== aOldScore) return bOldScore - aOldScore;

        return (a.summit_candidate_id || '').localeCompare(b.summit_candidate_id || '');
    });
}

function processMountain(mountainNo, mountainData, candidates, groundingRef, stage21LinksByMountain, stage21QueueMap) {
    candidates = rankCandidates(candidates);

    candidates.forEach((c, i) => {
        c.candidate_rank = i + 1;
    });

    const topCandidate = candidates[0];
    const secondCandidate = candidates.length > 1 ? candidates[1] : null;
    const isMarker = topCandidate.grounding_assisted_generation_status === 'no_candidate_marker';
    const scoreGap = secondCandidate ? topCandidate.grounding_assisted_candidate_score - secondCandidate.grounding_assisted_candidate_score : null;

    let reviewClass = 'review_required_fallback';
    let activeReview = true;
    let reasonCodes = [];

    const stage21RefinedLinks = stage21LinksByMountain[mountainNo] || [];
    stage21RefinedLinks.sort((a, b) => (a.grounding_refined_rank_for_mountain || 99) - (b.grounding_refined_rank_for_mountain || 99));
    const stage21TopCandidate = stage21RefinedLinks.length > 0 ? stage21RefinedLinks[0] : null;

    let stage21Support = false;
    let stage21Agree = false;
    let stage21TopId = stage21TopCandidate ? stage21TopCandidate.summit_candidate_id : null;
    let stage21ReviewStatus = null;

    if (stage21TopCandidate) {
        const qRow = stage21QueueMap[mountainNo];
        if (qRow) {
             stage21ReviewStatus = qRow.grounding_refined_review_priority;
             if (stage21ReviewStatus !== 'high' && stage21ReviewStatus !== 'medium') {
                 stage21Support = true;
             }
        }
    }

    if (stage21TopId === topCandidate.summit_candidate_id) {
        stage21Agree = true;
    }

    const distM = topCandidate.grounding_distance_m;
    const eleDiffM = topCandidate.grounding_elevation_diff_m;
    const nameMatch = topCandidate.grounding_name_match_status;
    const muniMatch = topCandidate.grounding_municipality_match_status;
    const coordConflict = groundingRef ? groundingRef.coordinate_conflict : false;
    const hasUsableCoord = groundingRef ? groundingRef.has_usable_coordinate : false;

    if (isMarker) {
        reviewClass = 'review_required_no_candidate';
        reasonCodes.push('no_candidate_marker');
    } else if (coordConflict || topCandidate.grounding_assisted_generation_status === 'grounding_coordinate_conflict') {
        reviewClass = 'review_required_grounding_coordinate_conflict';
        reasonCodes.push('coordinate_conflict');
    } else if (!hasUsableCoord && !stage21Support) {
        reviewClass = 'review_required_no_grounding';
        reasonCodes.push('no_usable_coordinate');
    } else if (muniMatch === 'contradiction' || nameMatch === 'contradiction') {
        reviewClass = 'review_required_grounding_contradiction';
        reasonCodes.push('grounding_contradiction');
    } else if (stage21Support && !stage21Agree) {
        reviewClass = 'review_required_conflict';
        reasonCodes.push('stage21_stage23_top_candidate_disagreement');
    } else {
        const within50 = candidates.filter(c => c.grounding_distance_m !== null && c.grounding_distance_m <= STRICT_DISTANCE_M);
        const within250 = candidates.filter(c => c.grounding_distance_m !== null && c.grounding_distance_m <= STRONG_DISTANCE_M);

        let closeAlternatives = false;
        if (secondCandidate && secondCandidate.grounding_distance_m !== null && secondCandidate.grounding_distance_m <= STRONG_DISTANCE_M) {
             if (scoreGap !== null && scoreGap < SCORE_GAP_THRESHOLD) {
                 closeAlternatives = true;
             }
        }

        if (closeAlternatives) {
             reviewClass = 'review_required_close_alternatives';
             reasonCodes.push('close_competing_candidate');
        } else if (
            distM !== null && distM <= STRICT_DISTANCE_M &&
            (eleDiffM === undefined || eleDiffM === null || eleDiffM <= STRICT_ELEVATION_M) &&
            nameMatch === 'exact' && muniMatch === 'exact' &&
            within50.length === 1
        ) {
            reviewClass = 'auto_supported_strict_grounding_match';
            activeReview = false;
        } else if (
            distM !== null && distM <= STRONG_DISTANCE_M &&
            (!secondCandidate || scoreGap >= SCORE_GAP_THRESHOLD || secondCandidate.grounding_distance_m > STRONG_DISTANCE_M)
        ) {
            reviewClass = 'review_deferred_grounding_supported_top1';
            activeReview = false;
        } else if (stage21Support && stage21Agree) {
            reviewClass = 'review_deferred_stage21_supported';
            activeReview = false;
            reasonCodes.push('stage21_carry_forward');
        } else if (distM !== null && distM <= STRONG_DISTANCE_M) {
            reviewClass = 'map_check_recommended';
            activeReview = false;
        } else {
            reviewClass = 'review_required_insufficient_evidence';
            reasonCodes.push('insufficient_support');
        }
    }

    const mountainResult = {
        mountain_no: mountainNo,
        mountain_name: mountainData ? mountainData.name : topCandidate.mountain_name,
        review_classification: reviewClass,
        active_review_required: activeReview,
        top_summit_candidate_id: topCandidate.summit_candidate_id,
        top_grounding_assisted_score: topCandidate.grounding_assisted_candidate_score,
        second_summit_candidate_id: secondCandidate ? secondCandidate.summit_candidate_id : null,
        score_gap_to_second: scoreGap,
        grounding_reference_status: groundingRef ? groundingRef.grounding_reference_status : null,
        has_usable_coordinate: hasUsableCoord,
        coordinate_conflict: coordConflict,
        grounding_distance_m: distM,
        grounding_distance_tier: topCandidate.grounding_distance_tier,
        grounding_elevation_diff_m: eleDiffM,
        grounding_name_match_status: nameMatch,
        grounding_municipality_match_status: muniMatch,
        stage21_review_status: stage21ReviewStatus,
        stage21_top_candidate_id: stage21TopId,
        stage21_stage23_agree: stage21Agree,
        candidate_count: candidates.filter(c => c.grounding_assisted_generation_status !== 'no_candidate_marker').length,
        candidate_count_within_50m: candidates.filter(c => c.grounding_distance_m !== null && c.grounding_distance_m <= STRICT_DISTANCE_M).length,
        candidate_count_within_250m: candidates.filter(c => c.grounding_distance_m !== null && c.grounding_distance_m <= STRONG_DISTANCE_M).length,
        review_reason_codes: reasonCodes.join(';'),
        notes: '',
        stage21_support: stage21Support
    };

    topCandidate.candidate_review_classification = reviewClass;

    candidates.forEach(c => {
         c.mountain_no = mountainNo;
         c.mountain_name = mountainResult.mountain_name;
         if (!c.candidate_review_classification) {
             c.candidate_review_classification = activeReview ? 'active_review_alternative' : 'deferred_alternative';
         }
         c.stage21_link_status = stage21RefinedLinks.find(s => s.summit_candidate_id === c.summit_candidate_id) ? 'present_in_stage21' : 'not_in_stage21';
    });

    return { mountainResult, candidates };
}

module.exports = {
    rankCandidates,
    processMountain
};

'use strict';

function hasSevereWarnings(link) {
    const warningCodes = ['elevation_warning', 'municipality_mismatch_warning', 'mismatch_warning', 'coordinate_mismatch_warning'];
    if (link.review_reason_codes && link.review_reason_codes.some(c => warningCodes.includes(c))) {
        return true;
    }
    if (link.location_refinement && link.location_refinement.location_refinement_level === 'boundary_tolerated_mismatch') {
        return true;
    }
    return false;
}

function compressReviewQueues(links, gapThreshold = 0.03) {
    // 1. Group links by mountain and candidate
    const linksByMountain = new Map();
    const linksByCandidate = new Map();

    for (const link of links) {
        const mtNo = link.mountain_no;
        if (!linksByMountain.has(mtNo)) {
            linksByMountain.set(mtNo, []);
        }
        linksByMountain.get(mtNo).push(link);

        const candId = link.summit_candidate_id;
        if (candId) {
            if (!linksByCandidate.has(candId)) {
                linksByCandidate.set(candId, []);
            }
            linksByCandidate.get(candId).push(link);
        }
    }

    // 2. Identify top-ranked counts per candidate
    const topRankedMountainCountPerCandidate = new Map();
    for (const link of links) {
        if (link.location_refined_rank_for_mountain === 1 && link.summit_candidate_id) {
            const prev = topRankedMountainCountPerCandidate.get(link.summit_candidate_id) || 0;
            topRankedMountainCountPerCandidate.set(link.summit_candidate_id, prev + 1);
        }
    }

    // 3. Compute score gaps and derive row enrichment
    const enrichedLinks = [];
    for (const link of links) {
        const enriched = { ...link };
        const mtNo = link.mountain_no;
        const candId = link.summit_candidate_id;

        const mtLinks = linksByMountain.get(mtNo) || [];
        const rank = link.location_refined_rank_for_mountain;
        const score = link.location_refined_candidate_score;

        // Gap computation
        let gapToNext = null;
        let gapFromTop = 0;
        let topScore = 0;

        // Find rank 1 and rank 2 scores
        const r1Link = mtLinks.find(l => l.location_refined_rank_for_mountain === 1);
        const r2Link = mtLinks.find(l => l.location_refined_rank_for_mountain === 2);

        if (r1Link) {
            topScore = r1Link.location_refined_candidate_score;
            gapFromTop = topScore - score;
        }

        if (rank && mtLinks.length > 0) {
            const nextLink = mtLinks.find(l => l.location_refined_rank_for_mountain === rank + 1);
            if (nextLink) {
                gapToNext = Number((score - nextLink.location_refined_candidate_score).toFixed(6));
            }
        }

        const scoreGapRank1To2 = (r1Link && r2Link) ? Number((r1Link.location_refined_candidate_score - r2Link.location_refined_candidate_score).toFixed(6)) : null;

        // Mutual top1 and top3
        const isMutualTop1 = candId ? (rank === 1 && link.location_refined_rank_for_summit_candidate === 1) : false;
        const isMutualTop3 = candId ? (rank <= 3 && link.location_refined_rank_for_summit_candidate <= 3) : false;

        // Conflict flags
        const isSharedCandidate = candId ? ((topRankedMountainCountPerCandidate.get(candId) || 0) > 1) : false;
        const hasSmallScoreGap = scoreGapRank1To2 !== null ? (scoreGapRank1To2 <= gapThreshold) : false;

        // Review bucket assignment
        let bucket = 'low_priority';
        const compactReasonCodes = [];

        // Flags
        const isTop1 = (rank === 1);
        const isTop3 = (rank !== null && rank <= 3);

        const originalNameTier = link.evidence?.name?.name_tier || 'none';
        const originalElevationTier = link.evidence?.elevation?.elevation_tier || 'unavailable';
        const hasStrongNameOrElevation = (originalNameTier === 'strong' || originalElevationTier === 'strong');
        const hasLocationWarning = (link.location_refinement?.location_refinement_level === 'boundary_tolerated_mismatch' ||
                                    (link.location_refinement?.location_refinement_reason_codes || []).includes('municipality_mismatch_warning'));

        // Assign buckets in logical order
        if (!candId) {
            bucket = 'resolve_conflict';
            compactReasonCodes.push('no_candidate_for_mountain');
        } else if (isSharedCandidate || (isTop1 && !isMutualTop1)) {
            bucket = 'resolve_conflict';
            if (isSharedCandidate) compactReasonCodes.push('shared_candidate');
            if (isTop1 && !isMutualTop1) compactReasonCodes.push('not_mutual_top1');
        } else if (isTop1 && isMutualTop1 && (link.confidence === 'high' || link.confidence === 'medium') && !hasSevereWarnings(link)) {
            bucket = 'accept_candidate_after_map_check';
            compactReasonCodes.push('clear_mutual_top1');
        } else if ((isTop1 || (isTop3 && gapFromTop <= gapThreshold)) && hasSmallScoreGap) {
            bucket = 'check_close_alternatives';
            compactReasonCodes.push('small_score_gap');
        } else if (hasLocationWarning && hasStrongNameOrElevation) {
            bucket = 'check_location_warning';
            compactReasonCodes.push('location_mismatch_warning');
        } else if (link.review_priority === 'deprioritized' && !isTop3) {
            bucket = 'deprioritized';
            compactReasonCodes.push('deprioritized');
        } else {
            bucket = 'low_priority';
            compactReasonCodes.push('low_priority_alternative');
        }

        // Compact Review Priority mapping
        let compactPriority = 'low';
        if (bucket === 'resolve_conflict' || bucket === 'check_location_warning' || bucket === 'check_close_alternatives') {
            compactPriority = 'high';
        } else if (bucket === 'accept_candidate_after_map_check') {
            compactPriority = 'medium';
        } else {
            compactPriority = 'low';
        }

        // Add calculated properties
        enriched.score_gap_to_next_candidate = gapToNext;
        enriched.score_gap_from_top_candidate = gapFromTop;
        enriched.mutual_top1 = isMutualTop1;
        enriched.mutual_top3 = isMutualTop3;
        enriched.review_bucket = bucket;
        enriched.compact_review_reason_codes = compactReasonCodes;
        enriched.compact_review_priority = compactPriority;

        enrichedLinks.push(enriched);
    }

    // 4. Generate Top-1 Queue
    const top1Queue = [];
    for (const [mtNo, mtLinks] of linksByMountain) {
        // Find if any link is rank 1
        const r1 = enrichedLinks.find(l => l.mountain_no === mtNo && l.location_refined_rank_for_mountain === 1);
        if (r1) {
            top1Queue.push(r1);
        } else {
            // Find placeholder (no candidate)
            const placeholder = enrichedLinks.find(l => l.mountain_no === mtNo);
            if (placeholder) {
                top1Queue.push(placeholder);
            }
        }
    }
    // Sort Top-1 by mountain_no
    top1Queue.sort((a, b) => a.mountain_no - b.mountain_no);

    // 5. Generate Top-3 Queue
    const top3Queue = [];
    for (const [mtNo, mtLinks] of linksByMountain) {
        const mtEnriched = enrichedLinks.filter(l => l.mountain_no === mtNo);
        const top3Candidates = mtEnriched.filter(l => l.location_refined_rank_for_mountain !== null && l.location_refined_rank_for_mountain <= 3);
        if (top3Candidates.length > 0) {
            top3Queue.push(...top3Candidates);
        } else {
            const placeholder = mtEnriched.find(l => l.summit_candidate_id === null || l.summit_candidate_id === '');
            if (placeholder) {
                top3Queue.push(placeholder);
            }
        }
    }
    // Sort Top-3 by mountain_no, then rank
    top3Queue.sort((a, b) => {
        if (a.mountain_no !== b.mountain_no) return a.mountain_no - b.mountain_no;
        const rankA = a.location_refined_rank_for_mountain || 999;
        const rankB = b.location_refined_rank_for_mountain || 999;
        return rankA - rankB;
    });

    // 6. Generate Conflict Queue
    const conflictQueue = enrichedLinks.filter(l => {
        const isConflict = l.review_bucket === 'resolve_conflict' || 
                           l.review_bucket === 'check_close_alternatives' || 
                           l.review_bucket === 'check_location_warning';
        return isConflict;
    });
    // Sort Conflict queue by mountain_no, then rank
    conflictQueue.sort((a, b) => {
        if (a.mountain_no !== b.mountain_no) return a.mountain_no - b.mountain_no;
        const rankA = a.location_refined_rank_for_mountain || 999;
        const rankB = b.location_refined_rank_for_mountain || 999;
        return rankA - rankB;
    });

    // 7. GPX-group conflict report
    const gpxGroups = new Map();
    for (const link of enrichedLinks) {
        const gpx = link.source_gpx_basename;
        if (!gpx) continue;
        if (!gpxGroups.has(gpx)) {
            gpxGroups.set(gpx, {
                source_gpx_basename: gpx,
                track_name: link.track_name || '',
                mountains: new Set(),
                candidates: new Set(),
                top1_link_count: 0,
                conflict_count: 0,
            });
        }
        const g = gpxGroups.get(gpx);
        g.mountains.add(link.mountain_no);
        if (link.summit_candidate_id) {
            g.candidates.add(link.summit_candidate_id);
            if (link.location_refined_rank_for_mountain === 1) {
                g.top1_link_count++;
            }
            if (link.review_bucket === 'resolve_conflict') {
                g.conflict_count++;
            }
        }
    }

    const gpxGroupRows = Array.from(gpxGroups.values()).map(g => {
        const mtList = Array.from(g.mountains).sort((a, b) => a - b);
        const mtNames = mtList.map(mNo => {
            const match = enrichedLinks.find(l => l.mountain_no === mNo);
            return match ? match.mountain_name : `Mountain #${mNo}`;
        }).join('|');

        return {
            source_gpx_basename: g.source_gpx_basename,
            track_name: g.track_name,
            mountain_count_in_group: g.mountains.size,
            summit_candidate_count_in_group: g.candidates.size,
            top1_link_count: g.top1_link_count,
            conflict_count: g.conflict_count,
            mountain_names: mtNames,
            summit_candidate_ids: Array.from(g.candidates).join('|'),
            suggested_review_order: 0, // set below
            notes: `mountains=${g.mountains.size}; candidates=${g.candidates.size}; conflicts=${g.conflict_count}`,
        };
    });

    // Sort GPX groups by conflict count desc, then mountain count desc, then basename
    gpxGroupRows.sort((a, b) => {
        if (b.conflict_count !== a.conflict_count) return b.conflict_count - a.conflict_count;
        if (b.mountain_count_in_group !== a.mountain_count_in_group) return b.mountain_count_in_group - a.mountain_count_in_group;
        return a.source_gpx_basename.localeCompare(b.source_gpx_basename);
    });

    for (let i = 0; i < gpxGroupRows.length; i++) {
        gpxGroupRows[i].suggested_review_order = i + 1;
    }

    // 8. Summit candidate conflict report
    const summitConflictRows = [];
    for (const [candId, candLinks] of linksByCandidate) {
        if (!candId) continue;
        const refLink = candLinks[0];

        const top1Mountains = candLinks.filter(l => l.location_refined_rank_for_mountain === 1);
        const top3Mountains = candLinks.filter(l => l.location_refined_rank_for_mountain !== null && l.location_refined_rank_for_mountain <= 3);

        const top1Nos = top1Mountains.map(l => l.mountain_no).sort((a, b) => a - b);
        const top1Names = top1Mountains.map(l => l.mountain_name).join('|');

        const top3Nos = top3Mountains.map(l => l.mountain_no).sort((a, b) => a - b);
        const top3Names = top3Mountains.map(l => l.mountain_name).join('|');

        const scores = candLinks.map(l => l.location_refined_candidate_score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const scoreSpread = Number((maxScore - minScore).toFixed(6));

        let suggestedBucket = 'check';
        if (top1Mountains.length > 1) {
            suggestedBucket = 'resolve_conflict';
        } else if (top1Mountains.length === 1) {
            suggestedBucket = 'accept';
        }

        summitConflictRows.push({
            summit_candidate_id: candId,
            source_gpx_basename: refLink.source_gpx_basename || '',
            track_name: refLink.track_name || '',
            candidate_lat: refLink.candidate_lat,
            candidate_lon: refLink.candidate_lon,
            candidate_ele_m: refLink.candidate_ele_m,
            top1_mountain_count: top1Mountains.length,
            top3_mountain_count: top3Mountains.length,
            top1_mountain_nos: top1Nos.join('|'),
            top1_mountain_names: top1Names,
            top3_mountain_nos: top3Nos.join('|'),
            top3_mountain_names: top3Names,
            max_score: maxScore,
            score_spread: scoreSpread,
            suggested_review_bucket: suggestedBucket,
            notes: `top1_count=${top1Mountains.length}; top3_count=${top3Mountains.length}; max_score=${maxScore}`,
        });
    }

    // Sort summit conflict rows by top1_mountain_count desc, then top3_mountain_count desc, then candidate id
    summitConflictRows.sort((a, b) => {
        if (b.top1_mountain_count !== a.top1_mountain_count) return b.top1_mountain_count - a.top1_mountain_count;
        if (b.top3_mountain_count !== a.top3_mountain_count) return b.top3_mountain_count - a.top3_mountain_count;
        return a.summit_candidate_id.localeCompare(b.summit_candidate_id);
    });

    return {
        enrichedLinks,
        top1Queue,
        top3Queue,
        conflictQueue,
        gpxGroupRows,
        summitConflictRows
    };
}

module.exports = {
    hasSevereWarnings,
    compressReviewQueues
};

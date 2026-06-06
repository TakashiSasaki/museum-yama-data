'use strict';

const { haversineDistance } = require('./geo_distance');

/**
 * Constants for grounding response refinement thresholds.
 */
const THRESHOLDS = {
    /** Distance within which two grounding coordinates are in the same cluster */
    CLUSTER_SAME_M: 100,
    /** Distance within which a candidate is strongly supported by grounding */
    STRONG_SUPPORT_M: 250,
    /** Distance within which a candidate is weakly supported (moderate match) */
    MODERATE_SUPPORT_M: 1000,
    /** Distance beyond which grounding actively weakens a candidate */
    WEAKEN_M: 2000,
};

/**
 * Load and deduplicate raw grounding responses.
 * Multiple response records for the same mountain_no are consolidated.
 * Returns a Map keyed by mountain_no.
 *
 * @param {Array<Object>} rawResponses - Array of raw grounding response records
 * @returns {Map<number, Object>} - Consolidated grounding evidence per mountain
 */
function consolidateGroundingResponses(rawResponses) {
    /** @type {Map<number, Array<Object>>} */
    const byMountainNo = new Map();

    for (const rec of rawResponses) {
        const no = rec.mountain_no;
        if (no == null) continue;
        if (!byMountainNo.has(no)) byMountainNo.set(no, []);
        byMountainNo.get(no).push(rec);
    }

    /** @type {Map<number, Object>} */
    const consolidated = new Map();

    for (const [mountainNo, records] of byMountainNo) {
        const coordRecords = records.filter(
            r => r.grounded_lat != null && r.grounded_lon != null &&
                 typeof r.grounded_lat === 'number' && typeof r.grounded_lon === 'number' &&
                 isFinite(r.grounded_lat) && isFinite(r.grounded_lon)
        );

        if (coordRecords.length === 0) {
            consolidated.set(mountainNo, {
                mountain_no: mountainNo,
                mountain_name: records[0].mountain_name || null,
                grounding_status: 'no_coordinates',
                coordinate_count: 0,
                coordinates: [],
                clusters: [],
                best_cluster: null,
                confidence_score: null,
                source_record_count: records.length,
                evidence_links: collectEvidenceLinks(records),
            });
            continue;
        }

        // Collect all coordinate points
        const points = coordRecords.map(r => ({
            lat: r.grounded_lat,
            lon: r.grounded_lon,
            ele: r.grounded_elevation_m,
            confidence: r.confidence_score || 0,
            status: r.grounding_status,
            municipality: r.grounded_municipality,
            source_document: r._source_document_safe_name || r._source_document || 'unknown',
        }));

        // Cluster the coordinates
        const clusters = clusterCoordinates(points, THRESHOLDS.CLUSTER_SAME_M);

        // Determine grounding consensus status
        const consensusStatus = determineConsensusStatus(clusters);

        // Pick best cluster (highest average confidence, then most points)
        const bestCluster = pickBestCluster(clusters);

        consolidated.set(mountainNo, {
            mountain_no: mountainNo,
            mountain_name: records[0].mountain_name || null,
            grounding_status: consensusStatus,
            coordinate_count: coordRecords.length,
            coordinates: points,
            clusters: clusters.map(c => ({
                center_lat: c.center_lat,
                center_lon: c.center_lon,
                point_count: c.points.length,
                avg_confidence: c.avg_confidence,
                max_elevation: c.max_elevation,
                diameter_m: c.diameter_m,
            })),
            best_cluster: bestCluster ? {
                center_lat: bestCluster.center_lat,
                center_lon: bestCluster.center_lon,
                point_count: bestCluster.points.length,
                avg_confidence: bestCluster.avg_confidence,
                max_elevation: bestCluster.max_elevation,
            } : null,
            confidence_score: bestCluster ? bestCluster.avg_confidence : null,
            source_record_count: records.length,
            evidence_links: collectEvidenceLinks(records),
        });
    }

    return consolidated;
}

/**
 * Collect all unique evidence links from a set of raw records.
 */
function collectEvidenceLinks(records) {
    const links = new Set();
    for (const r of records) {
        if (Array.isArray(r.evidence_links)) {
            for (const link of r.evidence_links) {
                if (link) links.add(link);
            }
        }
    }
    return Array.from(links);
}

/**
 * Simple greedy single-linkage clustering of coordinate points.
 * @param {Array<{lat:number, lon:number, confidence:number}>} points
 * @param {number} radiusM
 * @returns {Array<Object>} clusters
 */
function clusterCoordinates(points, radiusM) {
    const assigned = new Array(points.length).fill(false);
    const clusters = [];

    for (let i = 0; i < points.length; i++) {
        if (assigned[i]) continue;
        const cluster = [i];
        assigned[i] = true;

        // Expand cluster
        for (let j = i + 1; j < points.length; j++) {
            if (assigned[j]) continue;
            // Check distance to any point already in this cluster
            for (const ci of cluster) {
                const dist = haversineDistance(
                    points[ci].lat, points[ci].lon,
                    points[j].lat, points[j].lon
                );
                if (dist <= radiusM) {
                    cluster.push(j);
                    assigned[j] = true;
                    break;
                }
            }
        }

        const clusterPoints = cluster.map(idx => points[idx]);
        const centerLat = clusterPoints.reduce((s, p) => s + p.lat, 0) / clusterPoints.length;
        const centerLon = clusterPoints.reduce((s, p) => s + p.lon, 0) / clusterPoints.length;
        const avgConfidence = clusterPoints.reduce((s, p) => s + p.confidence, 0) / clusterPoints.length;
        const maxElevation = Math.max(...clusterPoints.map(p => p.ele).filter(e => e != null && isFinite(e)));

        // Compute diameter (max pairwise distance)
        let diameterM = 0;
        for (let a = 0; a < clusterPoints.length; a++) {
            for (let b = a + 1; b < clusterPoints.length; b++) {
                const d = haversineDistance(
                    clusterPoints[a].lat, clusterPoints[a].lon,
                    clusterPoints[b].lat, clusterPoints[b].lon
                );
                if (d > diameterM) diameterM = d;
            }
        }

        clusters.push({
            center_lat: centerLat,
            center_lon: centerLon,
            points: clusterPoints,
            avg_confidence: avgConfidence,
            max_elevation: isFinite(maxElevation) ? maxElevation : null,
            diameter_m: diameterM,
        });
    }

    return clusters;
}

/**
 * Determine consensus status from clusters.
 */
function determineConsensusStatus(clusters) {
    if (clusters.length === 0) return 'no_coordinates';
    if (clusters.length === 1) return 'single_cluster_consensus';
    // Multiple clusters: check if they are close enough to be considered "weak consensus"
    const clusterCenters = clusters.map(c => ({ lat: c.center_lat, lon: c.center_lon }));
    let maxDist = 0;
    for (let i = 0; i < clusterCenters.length; i++) {
        for (let j = i + 1; j < clusterCenters.length; j++) {
            const d = haversineDistance(
                clusterCenters[i].lat, clusterCenters[i].lon,
                clusterCenters[j].lat, clusterCenters[j].lon
            );
            if (d > maxDist) maxDist = d;
        }
    }
    if (maxDist <= THRESHOLDS.STRONG_SUPPORT_M) return 'weak_consensus_close_clusters';
    if (maxDist <= THRESHOLDS.MODERATE_SUPPORT_M) return 'weak_consensus_moderate_spread';
    return 'conflicting_clusters';
}

/**
 * Pick the best cluster: most points, then highest avg confidence.
 */
function pickBestCluster(clusters) {
    if (clusters.length === 0) return null;
    return clusters.slice().sort((a, b) => {
        if (b.points.length !== a.points.length) return b.points.length - a.points.length;
        return b.avg_confidence - a.avg_confidence;
    })[0];
}

/**
 * Compute grounding-based distance score for a single candidate link
 * relative to the consolidated grounding evidence.
 *
 * @param {Object} link - A candidate link with candidate_lat, candidate_lon
 * @param {Object|null} groundingEvidence - Consolidated grounding evidence for this mountain
 * @returns {Object} grounding score and metadata
 */
function computeGroundingScore(link, groundingEvidence) {
    if (!groundingEvidence || !groundingEvidence.best_cluster) {
        return {
            grounding_distance_m: null,
            grounding_distance_score: 0,
            grounding_bucket: 'grounding_neutral',
            grounding_consensus: groundingEvidence ? groundingEvidence.grounding_status : 'no_evidence',
            grounding_confidence: null,
            grounding_cluster_count: groundingEvidence ? groundingEvidence.clusters.length : 0,
            grounding_evidence_count: groundingEvidence ? groundingEvidence.source_record_count : 0,
        };
    }

    const candidateLat = link.candidate_lat;
    const candidateLon = link.candidate_lon;

    if (candidateLat == null || candidateLon == null) {
        return {
            grounding_distance_m: null,
            grounding_distance_score: 0,
            grounding_bucket: 'grounding_neutral',
            grounding_consensus: groundingEvidence.grounding_status,
            grounding_confidence: groundingEvidence.confidence_score,
            grounding_cluster_count: groundingEvidence.clusters.length,
            grounding_evidence_count: groundingEvidence.source_record_count,
        };
    }

    const bestCluster = groundingEvidence.best_cluster;
    const distM = haversineDistance(
        candidateLat, candidateLon,
        bestCluster.center_lat, bestCluster.center_lon
    );

    let distanceScore;
    let bucket;

    if (distM <= THRESHOLDS.STRONG_SUPPORT_M) {
        // Strong support: close to grounding cluster
        distanceScore = 1.0;
        bucket = 'grounding_supported';
    } else if (distM <= THRESHOLDS.MODERATE_SUPPORT_M) {
        // Moderate support: within 1km
        distanceScore = 0.5 * (1.0 - (distM - THRESHOLDS.STRONG_SUPPORT_M) / (THRESHOLDS.MODERATE_SUPPORT_M - THRESHOLDS.STRONG_SUPPORT_M));
        bucket = 'grounding_weakly_supported';
    } else if (distM <= THRESHOLDS.WEAKEN_M) {
        // Beyond moderate but not far — neutral
        distanceScore = 0;
        bucket = 'grounding_neutral';
    } else {
        // Far away — actively weakened
        distanceScore = -0.2;
        bucket = 'grounding_weakened';
    }

    // Adjust for consensus quality
    const consensusMultiplier = getConsensusMultiplier(groundingEvidence.grounding_status);
    const adjustedScore = distanceScore * consensusMultiplier;

    return {
        grounding_distance_m: Math.round(distM * 10) / 10,
        grounding_distance_score: Math.round(adjustedScore * 1000) / 1000,
        grounding_bucket: bucket,
        grounding_consensus: groundingEvidence.grounding_status,
        grounding_confidence: groundingEvidence.confidence_score,
        grounding_cluster_count: groundingEvidence.clusters.length,
        grounding_evidence_count: groundingEvidence.source_record_count,
    };
}

function getConsensusMultiplier(consensusStatus) {
    switch (consensusStatus) {
        case 'single_cluster_consensus': return 1.0;
        case 'weak_consensus_close_clusters': return 0.8;
        case 'weak_consensus_moderate_spread': return 0.5;
        case 'conflicting_clusters': return 0.3;
        default: return 0;
    }
}

/**
 * Apply grounding refinement to all candidate links.
 *
 * @param {Array<Object>} candidateLinks - Location-stability refined candidate links
 * @param {Map<number, Object>} groundingMap - Consolidated grounding evidence
 * @returns {Object} { refinedLinks, summary }
 */
function refineByGrounding(candidateLinks, groundingMap) {
    const refinedLinks = [];
    const summary = {
        total_input: candidateLinks.length,
        total_output: 0,
        mountains_with_grounding: 0,
        mountains_without_grounding: 0,
        grounding_supported: 0,
        grounding_weakly_supported: 0,
        grounding_neutral: 0,
        grounding_weakened: 0,
        upgraded_from_deprioritized: 0,
        downgraded_by_grounding: 0,
    };

    const seenMountainNos = new Set();

    for (const link of candidateLinks) {
        const mno = link.mountain_no;
        const groundingEvidence = groundingMap.get(mno) || null;

        if (!seenMountainNos.has(mno)) {
            seenMountainNos.add(mno);
            if (groundingEvidence && groundingEvidence.best_cluster) {
                summary.mountains_with_grounding++;
            } else {
                summary.mountains_without_grounding++;
            }
        }

        const groundingScore = computeGroundingScore(link, groundingEvidence);

        // Compute combined grounding-refined score
        const baseScore = link.location_stability_refined_candidate_score || link.combined_candidate_score || 0;
        const adjustment = groundingScore.grounding_distance_score;
        const combinedScore = Math.max(0, Math.min(1, baseScore + adjustment * 0.3));

        // Determine new review priority
        const prevPriority = link.location_stability_review_priority || 'high';
        let newPriority = prevPriority;

        if (groundingScore.grounding_bucket === 'grounding_supported' && combinedScore >= 0.5) {
            // Supported by grounding — can be deprioritized / auto-accepted-candidate
            if (prevPriority === 'high' || prevPriority === 'medium') {
                newPriority = 'low';
                summary.upgraded_from_deprioritized++;
            }
        } else if (groundingScore.grounding_bucket === 'grounding_weakened') {
            // Weakened by grounding
            if (prevPriority === 'low' || prevPriority === 'deprioritized') {
                // Already low: stays
            } else {
                newPriority = 'deprioritized';
                summary.downgraded_by_grounding++;
            }
        }

        summary[groundingScore.grounding_bucket]++;

        const refined = {
            ...link,
            grounding_refinement: true,
            grounding_distance_m: groundingScore.grounding_distance_m,
            grounding_distance_score: groundingScore.grounding_distance_score,
            grounding_bucket: groundingScore.grounding_bucket,
            grounding_consensus: groundingScore.grounding_consensus,
            grounding_confidence: groundingScore.grounding_confidence,
            grounding_cluster_count: groundingScore.grounding_cluster_count,
            grounding_evidence_count: groundingScore.grounding_evidence_count,
            grounding_refined_candidate_score: Math.round(combinedScore * 1000) / 1000,
            grounding_refined_review_priority: newPriority,
        };

        refinedLinks.push(refined);
    }

    // Recompute ranks per mountain using grounding_refined_candidate_score
    recomputeRanks(refinedLinks);

    summary.total_output = refinedLinks.length;
    return { refinedLinks, summary };
}

/**
 * Recompute per-mountain and per-summit-candidate ranks.
 */
function recomputeRanks(links) {
    // Group by mountain_no
    const byMountain = new Map();
    for (let i = 0; i < links.length; i++) {
        const mno = links[i].mountain_no;
        if (!byMountain.has(mno)) byMountain.set(mno, []);
        byMountain.get(mno).push(i);
    }

    for (const [_, indices] of byMountain) {
        indices.sort((a, b) => {
            const sa = links[a].grounding_refined_candidate_score;
            const sb = links[b].grounding_refined_candidate_score;
            return sb - sa;
        });
        for (let rank = 0; rank < indices.length; rank++) {
            links[indices[rank]].grounding_refined_rank_for_mountain = rank + 1;
        }
    }

    // Group by summit_candidate_id
    const byCandidate = new Map();
    for (let i = 0; i < links.length; i++) {
        const cid = links[i].summit_candidate_id;
        if (!byCandidate.has(cid)) byCandidate.set(cid, []);
        byCandidate.get(cid).push(i);
    }

    for (const [_, indices] of byCandidate) {
        indices.sort((a, b) => {
            const sa = links[a].grounding_refined_candidate_score;
            const sb = links[b].grounding_refined_candidate_score;
            return sb - sa;
        });
        for (let rank = 0; rank < indices.length; rank++) {
            links[indices[rank]].grounding_refined_rank_for_summit_candidate = rank + 1;
        }
    }
}

/**
 * Generate compact review queue CSV from grounding-refined links.
 * Top-1 per mountain view.
 */
function generateGroundingRefinedReviewCSV(refinedLinks) {
    // Get top-1 per mountain
    const top1Map = new Map();
    for (const link of refinedLinks) {
        if (link.grounding_refined_rank_for_mountain === 1) {
            top1Map.set(link.mountain_no, link);
        }
    }

    const headers = [
        'mountain_no', 'mountain_name', 'summit_candidate_id',
        'grounding_refined_score', 'grounding_bucket', 'grounding_distance_m',
        'grounding_consensus', 'grounding_confidence',
        'location_stability_bucket', 'location_stability_refined_score',
        'candidate_lat', 'candidate_lon', 'candidate_ele_m',
        'elevation_diff_m', 'name_tier',
        'grounding_refined_review_priority', 'track_name',
    ];

    const rows = [headers.join(',')];

    const sortedNos = Array.from(top1Map.keys()).sort((a, b) => a - b);
    for (const mno of sortedNos) {
        const link = top1Map.get(mno);
        const eleDiff = link.evidence && link.evidence.elevation ?
            link.evidence.elevation.diff_m : '';
        const nameTier = link.evidence && link.evidence.name ?
            link.evidence.name.name_tier : '';

        rows.push([
            link.mountain_no,
            `"${(link.mountain_name || '').replace(/"/g, '""')}"`,
            link.summit_candidate_id,
            link.grounding_refined_candidate_score,
            link.grounding_bucket,
            link.grounding_distance_m != null ? link.grounding_distance_m : '',
            link.grounding_consensus,
            link.grounding_confidence != null ? link.grounding_confidence : '',
            link.location_stability_bucket || '',
            link.location_stability_refined_candidate_score || '',
            link.candidate_lat,
            link.candidate_lon,
            link.candidate_ele_m != null ? Math.round(link.candidate_ele_m * 10) / 10 : '',
            eleDiff != null && eleDiff !== '' ? Math.round(eleDiff * 10) / 10 : '',
            nameTier,
            link.grounding_refined_review_priority,
            `"${(link.track_name || '').replace(/"/g, '""')}"`,
        ].join(','));
    }

    return rows.join('\n') + '\n';
}

/**
 * Count review-burden reduction statistics.
 */
function computeReviewBurdenReduction(refinedLinks) {
    let prevNeedsReview = 0;
    let nowNeedsReview = 0;

    const mountainPrevReview = new Set();
    const mountainNowReview = new Set();

    for (const link of refinedLinks) {
        const prevPri = link.location_stability_review_priority || 'high';
        const nowPri = link.grounding_refined_review_priority;

        if (prevPri === 'high' || prevPri === 'medium') {
            prevNeedsReview++;
            mountainPrevReview.add(link.mountain_no);
        }
        if (nowPri === 'high' || nowPri === 'medium') {
            nowNeedsReview++;
            mountainNowReview.add(link.mountain_no);
        }
    }

    // Top-1 analysis
    const top1Prev = new Map();
    const top1Now = new Map();
    for (const link of refinedLinks) {
        if (link.location_stability_refined_rank_for_mountain === 1) {
            top1Prev.set(link.mountain_no, link.location_stability_review_priority || 'high');
        }
        if (link.grounding_refined_rank_for_mountain === 1) {
            top1Now.set(link.mountain_no, link.grounding_refined_review_priority);
        }
    }

    let top1PrevHigh = 0, top1NowHigh = 0;
    for (const [_, pri] of top1Prev) {
        if (pri === 'high' || pri === 'medium') top1PrevHigh++;
    }
    for (const [_, pri] of top1Now) {
        if (pri === 'high' || pri === 'medium') top1NowHigh++;
    }

    return {
        link_review_before: prevNeedsReview,
        link_review_after: nowNeedsReview,
        link_review_reduction: prevNeedsReview - nowNeedsReview,
        mountain_review_before: mountainPrevReview.size,
        mountain_review_after: mountainNowReview.size,
        mountain_review_reduction: mountainPrevReview.size - mountainNowReview.size,
        top1_review_before: top1PrevHigh,
        top1_review_after: top1NowHigh,
        top1_review_reduction: top1PrevHigh - top1NowHigh,
    };
}

module.exports = {
    THRESHOLDS,
    consolidateGroundingResponses,
    clusterCoordinates,
    computeGroundingScore,
    refineByGrounding,
    recomputeRanks,
    generateGroundingRefinedReviewCSV,
    computeReviewBurdenReduction,
    collectEvidenceLinks,
    determineConsensusStatus,
    pickBestCluster,
    getConsensusMultiplier,
};

const { haversineDistance } = require('./geo_distance');
const { normalizeJapaneseText, calculateTokenContainment, jaccardSimilarity } = require('./text_similarity');

function evaluateNameEvidence(mountainName, trackName, yamapTitles, yamapMountainNames) {
    const normMountain = normalizeJapaneseText(mountainName);
    if (!normMountain) return { tier: 'none', score: 0.0 };

    // Very short names need exact match
    const isShortName = normMountain.length <= 2;

    let isExactSubstring = false;
    let explicitYamapMatch = false;

    if (trackName && normalizeJapaneseText(trackName).includes(normMountain)) {
        isExactSubstring = true;
    }

    if (yamapTitles && yamapTitles.length > 0) {
        for (const title of yamapTitles) {
            if (normalizeJapaneseText(title).includes(normMountain)) {
                isExactSubstring = true;
                break;
            }
        }
    }

    if (yamapMountainNames && yamapMountainNames.length > 0) {
        for (const name of yamapMountainNames) {
            if (normalizeJapaneseText(name) === normMountain) {
                explicitYamapMatch = true;
                break;
            }
        }
    }

    let bestContainment = 0.0;
    let bestSimilarity = 0.0;

    if (trackName) {
        bestContainment = Math.max(bestContainment, calculateTokenContainment(normMountain, trackName));
        bestSimilarity = Math.max(bestSimilarity, jaccardSimilarity(normMountain, trackName));
    }

    if (yamapTitles) {
        for (const title of yamapTitles) {
            bestContainment = Math.max(bestContainment, calculateTokenContainment(normMountain, title));
            bestSimilarity = Math.max(bestSimilarity, jaccardSimilarity(normMountain, title));
        }
    }

    if (isExactSubstring || explicitYamapMatch) {
        return { tier: 'strong', score: 1.0 };
    }

    if (!isShortName && bestContainment >= 0.85) {
        return { tier: 'strong', score: 0.9 };
    }

    if (!isShortName && bestSimilarity >= 0.75) {
        return { tier: 'medium', score: 0.75 };
    }

    if (!isShortName && bestSimilarity >= 0.50) {
        return { tier: 'weak', score: 0.50 };
    }

    return { tier: 'none', score: 0.0 };
}

function evaluateCsvCoordinate(csvLat, csvLon, candidateLat, candidateLon) {
    if (!csvLat || !csvLon || !candidateLat || !candidateLon) {
        return { distance: null, tier: 'none' };
    }
    const distance = haversineDistance(csvLat, csvLon, candidateLat, candidateLon);
    let tier = 'none';
    if (distance <= 100) tier = 'strong';
    else if (distance <= 300) tier = 'medium';
    else if (distance <= 1000) tier = 'weak';
    return { distance, tier };
}

function checkMunicipalityCompatibility(mountainMuni, candidateMuniInfo, adjacencies) {
    if (!mountainMuni) return { compatible: true, code: 'unknown', tier: 'compatible' };
    if (!candidateMuniInfo || !candidateMuniInfo.primary_municipality_name) return { compatible: true, code: 'unknown', tier: 'compatible' };

    const candidateMuni = candidateMuniInfo.primary_municipality_name;
    const isBoundaryAmbiguous = candidateMuniInfo.boundary_matches && candidateMuniInfo.boundary_matches.length > 1;

    if (mountainMuni === candidateMuni) {
        if (isBoundaryAmbiguous) return { compatible: true, code: 'municipality_boundary_ambiguous', tier: 'compatible' };
        return { compatible: true, code: 'same_municipality', tier: 'compatible' };
    }

    // Check adjacent
    let adjacent = false;
    if (adjacencies) {
        // Adjust this depending on actual format of adjacency data.
        // Format typically an array of pairs, or object
        // Assuming array of [m1, m2] for now.
        for (const [m1, m2] of adjacencies) {
            if ((m1 === mountainMuni && m2 === candidateMuni) || (m2 === mountainMuni && m1 === candidateMuni)) {
                adjacent = true;
                break;
            }
        }
    }

    if (adjacent) {
        return { compatible: true, code: 'adjacent_municipality', tier: 'weakly_compatible' };
    }

    const mountainPrefecture = mountainMuni.includes('県') ? mountainMuni.split('県')[0] + '県' : '愛媛県'; // Default context
    const candidatePrefecture = candidateMuniInfo.prefecture || '愛媛県';

    if (candidatePrefecture !== mountainPrefecture) {
        return { compatible: false, code: 'municipality_outside_prefecture', tier: 'incompatible' };
    }

    return { compatible: false, code: 'municipality_mismatch', tier: 'incompatible' };
}

function generateCandidateLinksV3(inputs) {
    const {
        mountains,
        summitCandidates,
        activityLinks,
        groundingReference,
        municipalityLookup,
        municipalityStability,
        municipalityAdjacency
    } = inputs;

    // Create lookup maps
    const summitMap = new Map();
    for (const s of summitCandidates) {
        summitMap.set(s.summit_candidate_id, s);
    }

    const activityLinkMap = new Map(); // by gpx_basename
    for (const a of activityLinks) {
        activityLinkMap.set(a.gpx_basename, a);
    }

    const groundingMap = new Map();
    for (const g of groundingReference) {
        groundingMap.set(g.mountain_no, g);
    }

    const muniLookupMap = new Map();
    for (const m of municipalityLookup) {
        muniLookupMap.set(m.source_record_id, m);
    }

    // adjacency might be an object containing pairs
    let adjacencyPairs = [];
    if (municipalityAdjacency && municipalityAdjacency.land_adjacency_edges) {
        for (const edge of municipalityAdjacency.land_adjacency_edges) {
            adjacencyPairs.push([edge.municipality_name_1, edge.municipality_name_2]);
        }
    }

    const links = [];

    for (const mountain of mountains) {
        const mountainNo = mountain.mountain_no;
        const csvLat = mountain.coordinates && mountain.coordinates.lat ? parseFloat(mountain.coordinates.lat) : null;
        const csvLon = mountain.coordinates && mountain.coordinates.lon ? parseFloat(mountain.coordinates.lon) : null;
        const mountainName = mountain.name;
        const mountainMuni = mountain.location && mountain.location.municipality ? mountain.location.municipality : null;

        const grounding = groundingMap.get(mountainNo);
        let groundingLat = null;
        let groundingLon = null;
        let hasUsableGrounding = false;
        let groundingStatus = grounding ? grounding.grounding_status : null;
        let groundingConflict = false;

        if (grounding) {
            if (grounding.selected_grounding_lat && grounding.selected_grounding_lon) {
                groundingLat = parseFloat(grounding.selected_grounding_lat);
                groundingLon = parseFloat(grounding.selected_grounding_lon);
                hasUsableGrounding = true;
            }
            if (grounding.has_conflicting_clusters) {
                groundingConflict = true;
            }
        }

        let mountainCandidatesFound = false;

        // Iterate over all summit candidates (max 496, so an inner loop is fine, but we prune by logic)
        for (const candidate of summitCandidates) {
            const candidateLat = parseFloat(candidate.candidate_lat);
            const candidateLon = parseFloat(candidate.candidate_lon);
            const candidateId = candidate.summit_candidate_id;

            const actLink = activityLinkMap.get(candidate.source_gpx_basename);
            const trackName = candidate.track_name || (actLink ? actLink.gpx_track_name : "");

            let yamapTitles = [];
            let yamapNames = []; // Not currently present in title_enriched, but we keep the parameter
            if (actLink && actLink.best_candidate) {
                if (actLink.best_candidate.title) yamapTitles.push(actLink.best_candidate.title);
            }

            const nameEvidence = evaluateNameEvidence(mountainName, trackName, yamapTitles, yamapNames);
            const csvEvidence = evaluateCsvCoordinate(csvLat, csvLon, candidateLat, candidateLon);

            const candidateMuniInfo = muniLookupMap.get(candidateId);
            const muniCompatibility = checkMunicipalityCompatibility(mountainMuni, candidateMuniInfo, adjacencyPairs);

            let candidateStrategy = null;
            let groundingDistance = null;
            let score = 0;
            let reviewReasons = new Set();
            let needsHumanReview = false;

            if (groundingConflict) reviewReasons.add("grounding_conflict");

            // Strategy 1: Grounding first
            if (hasUsableGrounding && !groundingConflict) {
                groundingDistance = haversineDistance(groundingLat, groundingLon, candidateLat, candidateLon);

                if (groundingDistance <= 50) {
                    candidateStrategy = "grounding_strict";
                    score = 0.95 + 0.05 * (1 - Math.min(1, Math.abs((mountain.elevation_m || 0) - candidate.candidate_ele_m) / 100));
                } else if (groundingDistance <= 250) {
                    candidateStrategy = "grounding_strong";
                    score = 0.80 + 0.05 * nameEvidence.score + 0.05 * (1 - Math.min(1, Math.abs((mountain.elevation_m || 0) - candidate.candidate_ele_m) / 100));
                } else if (groundingDistance <= 500) {
                    candidateStrategy = "grounding_weak";
                    score = 0.60 + 0.05 * nameEvidence.score + 0.05 * (1 - Math.min(1, Math.abs((mountain.elevation_m || 0) - candidate.candidate_ele_m) / 100));
                } else if (groundingDistance <= 1000) {
                    candidateStrategy = "grounding_exploratory";
                    score = 0.40;
                }

                if (candidateStrategy && muniCompatibility.tier === 'incompatible') {
                    reviewReasons.add("grounding_municipality_mismatch");
                    needsHumanReview = true;
                }
            }

            // Strategy 2: Fallback
            if (!candidateStrategy) {
                let validFallback = false;

                if (csvEvidence.tier === 'strong' || csvEvidence.tier === 'medium') {
                    candidateStrategy = "fallback_csv_coordinate";
                    score = (csvEvidence.tier === 'strong' ? 0.8 : 0.7) + 0.1 * nameEvidence.score;
                    validFallback = true;
                } else if (csvEvidence.tier === 'weak') {
                    candidateStrategy = "fallback_csv_coordinate";
                    score = 0.6 + 0.1 * nameEvidence.score;
                    validFallback = true;
                    if (nameEvidence.tier !== 'strong' && muniCompatibility.tier !== 'compatible') {
                        needsHumanReview = true;
                    }
                } else if (nameEvidence.tier === 'strong' && muniCompatibility.tier === 'compatible') {
                    candidateStrategy = "fallback_name_municipality";
                    score = 0.65;
                    validFallback = true;
                } else if (nameEvidence.tier === 'strong') {
                    candidateStrategy = "fallback_name_only_review";
                    score = 0.55;
                    validFallback = true;
                    needsHumanReview = true;
                }

                if (csvEvidence.distance !== null && csvEvidence.distance > 1000 && validFallback) {
                    reviewReasons.add("csv_coordinate_far");
                }
            }

            if (candidateStrategy) {
                mountainCandidatesFound = true;

                if (!hasUsableGrounding) reviewReasons.add("grounding_missing");

                if (muniCompatibility.code === 'municipality_boundary_ambiguous') reviewReasons.add("municipality_boundary_ambiguous");
                if (muniCompatibility.code === 'municipality_outside_prefecture') reviewReasons.add("municipality_outside_prefecture");
                if (muniCompatibility.tier === 'incompatible') {
                    reviewReasons.add("municipality_mismatch");
                    needsHumanReview = true;
                }

                if (nameEvidence.tier === 'weak' || nameEvidence.tier === 'none') {
                    reviewReasons.add("weak_name_evidence");
                }

                if (csvLat === null || csvLon === null) {
                    reviewReasons.add("missing_csv_coordinate");
                }

                if (actLink && actLink.timezone_sensitive) {
                    reviewReasons.add("timezone_sensitive_activity_link");
                }
                if (actLink && actLink.timezone_ambiguity && !actLink.timezone_sensitive) { // Propagate ambiguity as reason just in case
                    reviewReasons.add("timezone_ambiguity");
                }

                // Add link
                links.push({
                    mountain_no: mountainNo,
                    mountain_name: mountainName,
                    mountain_source_row_no: mountain.source_row_no,
                    summit_candidate_id: candidateId,
                    source_gpx_path: candidate.source_gpx_path,
                    source_gpx_basename: candidate.source_gpx_basename,
                    track_name: trackName,
                    candidate_lat: candidateLat,
                    candidate_lon: candidateLon,
                    candidate_ele_m: candidate.candidate_ele_m,
                    candidate_municipality: candidateMuniInfo ? candidateMuniInfo.primary_municipality_name : null,
                    mountain_csv_lat: csvLat,
                    mountain_csv_lon: csvLon,
                    mountain_elevation_m: mountain.elevation_m,
                    evidence: {
                        name: nameEvidence,
                        grounding: grounding,
                        grounding_status: groundingStatus,
                        csv_coordinate: csvEvidence,
                        summit_candidate_coordinate: { lat: candidateLat, lon: candidateLon },
                        elevation: candidate.candidate_ele_m,
                        municipality: candidateMuniInfo,
                        activity_link: actLink,
                        legacy_context: {}
                    },
                    combined_candidate_score: Math.max(0, Math.min(1, score)), // clamp [0,1]
                    candidate_generation_strategy: candidateStrategy,
                    needs_human_review: needsHumanReview || reviewReasons.size > 0,
                    review_reason_codes: Array.from(reviewReasons),
                    notes: ""
                });
            }
        }

        if (!mountainCandidatesFound) {
            links.push({
                mountain_no: mountainNo,
                mountain_name: mountainName,
                mountain_source_row_no: mountain.source_row_no,
                summit_candidate_id: null,
                source_gpx_path: null,
                source_gpx_basename: null,
                track_name: null,
                candidate_lat: null,
                candidate_lon: null,
                candidate_ele_m: null,
                candidate_municipality: null,
                mountain_csv_lat: csvLat,
                mountain_csv_lon: csvLon,
                mountain_elevation_m: mountain.elevation_m,
                evidence: {
                    name: null,
                    grounding: grounding,
                    csv_coordinate: null,
                    summit_candidate_coordinate: null,
                    elevation: null,
                    municipality: null,
                    activity_link: null,
                    legacy_context: {}
                },
                combined_candidate_score: 0,
                candidate_generation_strategy: "no_candidate_marker",
                match_status: "v3_no_candidate",
                confidence: "none",
                needs_human_review: true,
                review_reason_codes: ["no_candidate_for_mountain"],
                notes: ""
            });
        }
    }

    // Compute ranks and final statuses
    // Group by mountain
    const linksByMountain = new Map();
    for (const link of links) {
        if (!linksByMountain.has(link.mountain_no)) linksByMountain.set(link.mountain_no, []);
        linksByMountain.get(link.mountain_no).push(link);
    }

    for (const [mNo, mLinks] of linksByMountain.entries()) {
        mLinks.sort((a, b) => b.combined_candidate_score - a.combined_candidate_score || (a.summit_candidate_id || "").localeCompare(b.summit_candidate_id || ""));
        let rank = 1;
        for (const link of mLinks) {
            if (link.summit_candidate_id) {
                link.candidate_rank_for_mountain = rank++;
            } else {
                link.candidate_rank_for_mountain = null;
            }
        }
    }

    // Group by candidate to find multi-mountain candidates
    const linksByCandidate = new Map();
    for (const link of links) {
        if (!link.summit_candidate_id) continue;
        if (!linksByCandidate.has(link.summit_candidate_id)) linksByCandidate.set(link.summit_candidate_id, []);
        linksByCandidate.get(link.summit_candidate_id).push(link);
    }

    for (const [cId, cLinks] of linksByCandidate.entries()) {
        cLinks.sort((a, b) => b.combined_candidate_score - a.combined_candidate_score || a.mountain_no - b.mountain_no);
        let rank = 1;
        for (const link of cLinks) {
            link.candidate_rank_for_summit_candidate = rank++;
        }

        if (cLinks.length > 1) {
            for (const link of cLinks) {
                if (!link.review_reason_codes.includes("multiple_mountains_for_candidate")) {
                    link.review_reason_codes.push("multiple_mountains_for_candidate");
                }
                link.needs_human_review = true;
            }
        }
    }

    // Assign final match_status and confidence
    for (const [mNo, mLinks] of linksByMountain.entries()) {
        const topLink = mLinks[0];

        if (topLink.candidate_generation_strategy === "no_candidate_marker") {
            // Already set
            continue;
        }

        const isConflict = mLinks.some(l => l.review_reason_codes.includes("grounding_conflict") || l.review_reason_codes.includes("multiple_mountains_for_candidate") || l.review_reason_codes.includes("grounding_name_mismatch") || l.review_reason_codes.includes("grounding_municipality_mismatch"));

        const hasNearTie = mLinks.length > 1 && (mLinks[0].combined_candidate_score - mLinks[1].combined_candidate_score <= 0.05);

        if (hasNearTie) {
            for (const link of mLinks) {
                if (!link.review_reason_codes.includes("near_tie_candidates_for_mountain")) link.review_reason_codes.push("near_tie_candidates_for_mountain");
            }
        }

        let mountainConflict = isConflict || hasNearTie;

        for (const link of mLinks) {
            if (link.combined_candidate_score >= 0.8) link.confidence = "high";
            else if (link.combined_candidate_score >= 0.6) link.confidence = "medium";
            else link.confidence = "low";

            if (mountainConflict) {
                link.match_status = "v3_conflict_case";
                link.needs_human_review = true;
            } else if (link.needs_human_review || link.review_reason_codes.length > 0) {
                link.match_status = "v3_candidate_review_required";
            } else if (link.combined_candidate_score >= 0.8) {
                link.match_status = "v3_candidate_auto_supported_not_canonical";
            } else {
                link.match_status = "v3_candidate_review_deferred";
            }
        }
    }

    return links;
}

module.exports = {
    evaluateNameEvidence,
    evaluateCsvCoordinate,
    checkMunicipalityCompatibility,
    generateCandidateLinksV3
};

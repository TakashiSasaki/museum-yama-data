'use strict';

const { haversineDistance } = require('./geo_distance');
const { normalizeText, computeTitleSimilarity } = require('./text_similarity');
const {
    computeNameEvidence,
    computeElevationEvidence,
    computeCsvCoordinateEvidence,
    computeLocationEvidence,
    computeActivityLinkEvidence,
    computeCombinedScore,
    deriveReviewReasonCodes,
    deriveCandidateStatus,
} = require('./mountain_summit_candidate_linking');

// ─── Thresholds ──────────────────────────────────────────────────────────────

const GROUNDING_THRESHOLDS = {
    CLUSTER_RADIUS_M: 100,
    CONFLICT_DISTANCE_M: 250,
    STRICT_DISTANCE_M: 50,
    STRONG_DISTANCE_M: 100,
    WEAK_DISTANCE_M: 250,
    FAR_DISTANCE_M: 500,
    STRICT_ELEVATION_M: 10,
    DUPLICATE_TOLERANCE_M: 5,
    SPATIAL_SEARCH_RADIUS_M: 500,
};

// ─── Grounding Response Normalization ────────────────────────────────────────

/**
 * Normalize raw Gemini grounding responses into a per-mountain reference index.
 *
 * @param {Array<Object>} rawResponses - Raw Gemini JSON records
 * @param {Array<Object>} mountains - Mountain source records
 * @returns {{ referenceIndex: Array<Object>, summary: Object }}
 */
function normalizeGroundingResponses(rawResponses, mountains) {
    const mountainMap = new Map();
    for (const m of mountains) {
        mountainMap.set(m.mountain_no, m);
    }

    // Group raw responses by mountain_no
    const byMountainNo = new Map();
    for (const rec of rawResponses) {
        if (rec.mountain_no == null) continue;
        if (!byMountainNo.has(rec.mountain_no)) byMountainNo.set(rec.mountain_no, []);
        byMountainNo.get(rec.mountain_no).push(rec);
    }

    const referenceIndex = [];
    const summary = {
        total_mountains: mountains.length,
        mountains_with_grounding: 0,
        mountains_without_grounding: 0,
        mountains_with_usable_coordinate: 0,
        mountains_without_usable_coordinate: 0,
        single_cluster: 0,
        coordinate_conflict: 0,
        name_exact: 0,
        name_normalized_exact: 0,
        name_mismatch: 0,
        municipality_exact: 0,
        municipality_normalized_exact: 0,
        municipality_mismatch: 0,
        insufficient_evidence: 0,
    };

    for (const mountain of mountains) {
        const mno = mountain.mountain_no;
        const records = byMountainNo.get(mno) || [];

        if (records.length === 0) {
            summary.mountains_without_grounding++;
            referenceIndex.push(buildNoGroundingRef(mountain));
            continue;
        }

        summary.mountains_with_grounding++;

        // Extract usable coordinate records
        const coordRecords = records.filter(r =>
            r.grounded_lat != null && r.grounded_lon != null &&
            typeof r.grounded_lat === 'number' && typeof r.grounded_lon === 'number' &&
            isFinite(r.grounded_lat) && isFinite(r.grounded_lon) &&
            r.grounding_status !== 'insufficient_evidence'
        );

        // Name matching
        const groundingNames = [...new Set(records.map(r => r.mountain_name).filter(Boolean))];
        const nameMatchStatus = computeNameMatchStatus(mountain.name, groundingNames);

        // Municipality matching
        const groundingMunicipalities = [...new Set(records.map(r => r.grounded_municipality).filter(Boolean))];
        const sourceMunicipality = mountain.location ? (mountain.location.municipality || mountain.location.municipality_or_island) : null;
        const municipalityMatchStatus = computeMunicipalityMatchStatus(sourceMunicipality, groundingMunicipalities);

        // Collect evidence links
        const evidenceLinks = [];
        for (const r of records) {
            if (Array.isArray(r.evidence_links)) {
                for (const link of r.evidence_links) {
                    if (link && !evidenceLinks.includes(link)) evidenceLinks.push(link);
                }
            }
        }

        // Raw response refs for provenance
        const rawResponseRefs = records.map(r => ({
            source_document: r._source_document_safe_name || r._source_document || 'unknown',
            json_block_index: r._json_block_index,
            lat_lon_status: r._lat_lon_status,
            grounding_status: r.grounding_status,
        }));

        // Grounding statuses
        const groundingStatuses = [...new Set(records.map(r => r.grounding_status))];

        if (coordRecords.length === 0) {
            summary.mountains_without_usable_coordinate++;
            if (records.every(r => r.grounding_status === 'insufficient_evidence')) {
                summary.insufficient_evidence++;
            }
            referenceIndex.push({
                mountain_no: mno,
                mountain_name: mountain.name,
                source_mountain_name: mountain.name,
                source_municipality: sourceMunicipality,
                grounding_record_count: records.length,
                grounding_statuses: groundingStatuses,
                has_usable_coordinate: false,
                usable_coordinate_record_count: 0,
                coordinate_cluster_count: 0,
                coordinate_conflict: false,
                selected_grounding_lat: null,
                selected_grounding_lon: null,
                selected_grounding_elevation_m: null,
                selected_grounding_municipality: null,
                selected_grounding_confidence_score: null,
                name_match_status: nameMatchStatus,
                municipality_match_status: municipalityMatchStatus,
                raw_response_refs: rawResponseRefs,
                evidence_links: evidenceLinks,
                grounding_reference_status: 'no_usable_coordinate',
                review_reason_codes: ['grounding_no_coordinate'],
                notes: `${records.length} raw record(s), none with usable coordinates`,
            });
            countNameMunicipalitySummary(nameMatchStatus, municipalityMatchStatus, summary);
            continue;
        }

        summary.mountains_with_usable_coordinate++;

        // Cluster coordinates
        const points = coordRecords.map(r => ({
            lat: r.grounded_lat,
            lon: r.grounded_lon,
            ele: r.grounded_elevation_m,
            confidence: r.confidence_score || 0,
            municipality: r.grounded_municipality,
        }));

        const clusters = clusterPoints(points, GROUNDING_THRESHOLDS.CLUSTER_RADIUS_M);
        const hasConflict = checkConflict(clusters, GROUNDING_THRESHOLDS.CONFLICT_DISTANCE_M);

        if (hasConflict) {
            summary.coordinate_conflict++;
        } else {
            summary.single_cluster++;
        }

        // Select best cluster (most points, then highest avg confidence)
        const bestCluster = selectBestCluster(clusters);

        const reviewReasonCodes = [];
        let refStatus = 'usable';
        if (hasConflict) {
            reviewReasonCodes.push('grounding_coordinate_conflict');
            refStatus = 'coordinate_conflict';
        }
        if (nameMatchStatus === 'mismatch') {
            reviewReasonCodes.push('grounding_name_mismatch');
        }
        if (municipalityMatchStatus === 'mismatch') {
            reviewReasonCodes.push('grounding_municipality_mismatch');
        }

        referenceIndex.push({
            mountain_no: mno,
            mountain_name: mountain.name,
            source_mountain_name: mountain.name,
            source_municipality: sourceMunicipality,
            grounding_record_count: records.length,
            grounding_statuses: groundingStatuses,
            has_usable_coordinate: true,
            usable_coordinate_record_count: coordRecords.length,
            coordinate_cluster_count: clusters.length,
            coordinate_conflict: hasConflict,
            selected_grounding_lat: bestCluster.centerLat,
            selected_grounding_lon: bestCluster.centerLon,
            selected_grounding_elevation_m: bestCluster.maxEle,
            selected_grounding_municipality: bestCluster.municipality,
            selected_grounding_confidence_score: bestCluster.avgConfidence,
            name_match_status: nameMatchStatus,
            municipality_match_status: municipalityMatchStatus,
            raw_response_refs: rawResponseRefs,
            evidence_links: evidenceLinks,
            grounding_reference_status: refStatus,
            review_reason_codes: reviewReasonCodes,
            notes: `${coordRecords.length} usable coord(s), ${clusters.length} cluster(s)${hasConflict ? ', CONFLICT' : ''}`,
        });
        countNameMunicipalitySummary(nameMatchStatus, municipalityMatchStatus, summary);
    }

    return { referenceIndex, summary };
}

function buildNoGroundingRef(mountain) {
    const sourceMunicipality = mountain.location ? (mountain.location.municipality || mountain.location.municipality_or_island) : null;
    return {
        mountain_no: mountain.mountain_no,
        mountain_name: mountain.name,
        source_mountain_name: mountain.name,
        source_municipality: sourceMunicipality,
        grounding_record_count: 0,
        grounding_statuses: [],
        has_usable_coordinate: false,
        usable_coordinate_record_count: 0,
        coordinate_cluster_count: 0,
        coordinate_conflict: false,
        selected_grounding_lat: null,
        selected_grounding_lon: null,
        selected_grounding_elevation_m: null,
        selected_grounding_municipality: null,
        selected_grounding_confidence_score: null,
        name_match_status: 'unknown',
        municipality_match_status: 'unknown',
        raw_response_refs: [],
        evidence_links: [],
        grounding_reference_status: 'no_grounding_response',
        review_reason_codes: ['no_grounding_response'],
        notes: 'No grounding response available for this mountain',
    };
}

function countNameMunicipalitySummary(nameMatch, munMatch, summary) {
    switch (nameMatch) {
        case 'exact': summary.name_exact++; break;
        case 'normalized_exact': summary.name_normalized_exact++; break;
        case 'mismatch': summary.name_mismatch++; break;
    }
    switch (munMatch) {
        case 'exact': summary.municipality_exact++; break;
        case 'normalized_exact': summary.municipality_normalized_exact++; break;
        case 'mismatch': summary.municipality_mismatch++; break;
    }
}

// ─── Name/Municipality Matching ──────────────────────────────────────────────

function computeNameMatchStatus(sourceName, groundingNames) {
    if (!sourceName || groundingNames.length === 0) return 'unknown';
    for (const gn of groundingNames) {
        if (sourceName === gn) return 'exact';
    }
    const normSource = normalizeText(sourceName);
    for (const gn of groundingNames) {
        if (normalizeText(gn) === normSource) return 'normalized_exact';
    }
    // Check containment
    for (const gn of groundingNames) {
        const normGn = normalizeText(gn);
        if (normSource.includes(normGn) || normGn.includes(normSource)) {
            return 'alias_or_containment';
        }
    }
    return 'mismatch';
}

function computeMunicipalityMatchStatus(sourceMunicipality, groundingMunicipalities) {
    if (!sourceMunicipality || groundingMunicipalities.length === 0) return 'unknown';
    const cleanSource = cleanMunicipalityName(sourceMunicipality);
    for (const gm of groundingMunicipalities) {
        if (cleanMunicipalityName(gm) === cleanSource) return 'exact';
    }
    const normSource = normalizeText(sourceMunicipality);
    for (const gm of groundingMunicipalities) {
        if (normalizeText(gm) === normSource) return 'normalized_exact';
    }
    // Check partial/boundary match
    for (const gm of groundingMunicipalities) {
        const normGm = normalizeText(gm);
        if (normSource.includes(normGm) || normGm.includes(normSource)) {
            return 'boundary_or_ambiguous';
        }
    }
    return 'mismatch';
}

function cleanMunicipalityName(name) {
    if (!name) return '';
    return name.normalize('NFKC').trim()
        .replace(/\s+/g, '')
        .replace(/[市町村区郡]+$/g, match => match); // keep suffixes for now
}

// ─── Coordinate Clustering ───────────────────────────────────────────────────

function clusterPoints(points, radiusM) {
    const assigned = new Array(points.length).fill(false);
    const clusters = [];
    for (let i = 0; i < points.length; i++) {
        if (assigned[i]) continue;
        const indices = [i];
        assigned[i] = true;
        for (let j = i + 1; j < points.length; j++) {
            if (assigned[j]) continue;
            for (const ci of indices) {
                if (haversineDistance(points[ci].lat, points[ci].lon, points[j].lat, points[j].lon) <= radiusM) {
                    indices.push(j);
                    assigned[j] = true;
                    break;
                }
            }
        }
        const clusterPts = indices.map(idx => points[idx]);
        const centerLat = clusterPts.reduce((s, p) => s + p.lat, 0) / clusterPts.length;
        const centerLon = clusterPts.reduce((s, p) => s + p.lon, 0) / clusterPts.length;
        const avgConfidence = clusterPts.reduce((s, p) => s + p.confidence, 0) / clusterPts.length;
        const eles = clusterPts.map(p => p.ele).filter(e => e != null && isFinite(e));
        const maxEle = eles.length > 0 ? Math.max(...eles) : null;
        const municipalities = [...new Set(clusterPts.map(p => p.municipality).filter(Boolean))];
        clusters.push({
            centerLat, centerLon, avgConfidence, maxEle,
            municipality: municipalities[0] || null,
            points: clusterPts,
        });
    }
    return clusters;
}

function checkConflict(clusters, conflictDistM) {
    if (clusters.length <= 1) return false;
    for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
            const d = haversineDistance(
                clusters[i].centerLat, clusters[i].centerLon,
                clusters[j].centerLat, clusters[j].centerLon
            );
            if (d > conflictDistM) return true;
        }
    }
    return false;
}

function selectBestCluster(clusters) {
    if (clusters.length === 0) return null;
    return clusters.slice().sort((a, b) => {
        if (b.points.length !== a.points.length) return b.points.length - a.points.length;
        return b.avgConfidence - a.avgConfidence;
    })[0];
}

// ─── Grounding-Assisted Candidate Link Generation ────────────────────────────

/**
 * Generate grounding-assisted candidate links.
 *
 * @param {Object} params
 * @param {Array<Object>} params.mountains
 * @param {Array<Object>} params.summitCandidates
 * @param {Map<number, Object>} params.groundingRefMap - mountain_no → grounding reference record
 * @param {Map<string, Object>} params.locationEvidenceMap - summit_candidate_id → location evidence
 * @param {Map<string, Object>} params.activityLinkMap - gpx_basename → activity link
 * @returns {{ candidateLinks: Array, prunedLog: Array, summary: Object }}
 */
function generateGroundingAssistedLinks(params) {
    const { mountains, summitCandidates, groundingRefMap, locationEvidenceMap, activityLinkMap } = params;

    const candidateLinks = [];
    const prunedLog = [];
    const summary = {
        total_mountains: mountains.length,
        total_summit_candidates: summitCandidates.length,
        grounded_spatial_search: 0,
        strict_grounding_match: 0,
        strong_grounding_nearby: 0,
        weak_grounding_nearby: 0,
        far_grounding_candidate: 0,
        grounding_contradicted_or_unrelated: 0,
        grounding_unavailable_fallback: 0,
        grounding_coordinate_conflict: 0,
        grounding_no_coordinate: 0,
        no_grounding_response: 0,
        total_links_generated: 0,
        total_links_pruned: 0,
        mountains_auto_supported: 0,
        mountains_with_candidates: 0,
        mountains_without_candidates: 0,
    };

    // Build spatial index for summit candidates
    const candidateArray = Array.from(summitCandidates);

    for (const mountain of mountains) {
        const mno = mountain.mountain_no;
        const gRef = groundingRefMap.get(mno) || null;

        let mountainLinks;
        let generationStatus;

        if (gRef && gRef.has_usable_coordinate && !gRef.coordinate_conflict) {
            // GROUNDED PATH: spatial search around grounding coordinate
            summary.grounded_spatial_search++;
            const result = generateGroundedCandidateLinks(mountain, candidateArray, gRef, locationEvidenceMap, activityLinkMap);
            mountainLinks = result.links;
            generationStatus = result.generationStatus;
            prunedLog.push(...result.pruned);
            summary.total_links_pruned += result.pruned.length;

            // Count match tiers
            for (const link of mountainLinks) {
                const tier = link.grounding_distance_tier;
                if (summary[tier] !== undefined) summary[tier]++;
            }

            if (result.hasStrictMatch) {
                summary.mountains_auto_supported++;
            }
        } else if (gRef && gRef.coordinate_conflict) {
            // CONFLICT PATH: use broad search but mark as conflict
            summary.grounding_coordinate_conflict++;
            generationStatus = 'grounding_coordinate_conflict';
            mountainLinks = generateFallbackCandidateLinks(mountain, candidateArray, locationEvidenceMap, activityLinkMap, 'grounding_coordinate_conflict');
        } else if (gRef && !gRef.has_usable_coordinate) {
            // NO COORDINATE PATH
            summary.grounding_no_coordinate++;
            generationStatus = 'grounding_no_coordinate';
            mountainLinks = generateFallbackCandidateLinks(mountain, candidateArray, locationEvidenceMap, activityLinkMap, 'grounding_response_without_coordinate');
        } else {
            // NO GROUNDING RESPONSE
            summary.no_grounding_response++;
            generationStatus = 'no_grounding_response';
            mountainLinks = generateFallbackCandidateLinks(mountain, candidateArray, locationEvidenceMap, activityLinkMap, 'no_grounding_response_fallback');
        }

        // Apply generation status
        for (const link of mountainLinks) {
            link.grounding_assisted_generation_status = generationStatus;
        }

        // Rank by grounding_assisted_candidate_score
        mountainLinks.sort((a, b) =>
            b.grounding_assisted_candidate_score - a.grounding_assisted_candidate_score ||
            a.summit_candidate_id.localeCompare(b.summit_candidate_id)
        );
        for (let i = 0; i < mountainLinks.length; i++) {
            mountainLinks[i].candidate_rank_for_mountain = i + 1;
        }

        if (mountainLinks.length > 0) {
            summary.mountains_with_candidates++;
        } else {
            summary.mountains_without_candidates++;
        }

        candidateLinks.push(...mountainLinks);
    }

    // Assign rank_for_summit_candidate
    const bySummit = new Map();
    for (const link of candidateLinks) {
        if (!bySummit.has(link.summit_candidate_id)) bySummit.set(link.summit_candidate_id, []);
        bySummit.get(link.summit_candidate_id).push(link);
    }
    for (const [, group] of bySummit) {
        group.sort((a, b) =>
            b.grounding_assisted_candidate_score - a.grounding_assisted_candidate_score ||
            String(a.mountain_no).localeCompare(String(b.mountain_no))
        );
        for (let i = 0; i < group.length; i++) {
            group[i].candidate_rank_for_summit_candidate = i + 1;
        }
    }

    // Add no-candidate marker rows for mountains with zero links
    const linkedMountainNos = new Set(candidateLinks.map(l => l.mountain_no));
    for (const mountain of mountains) {
        if (!linkedMountainNos.has(mountain.mountain_no)) {
            const gRef = groundingRefMap.get(mountain.mountain_no) || null;
            let genStatus = 'no_grounding_response';
            if (gRef && gRef.has_usable_coordinate) genStatus = 'grounding_no_nearby_candidates';
            else if (gRef && gRef.coordinate_conflict) genStatus = 'grounding_coordinate_conflict';
            else if (gRef && !gRef.has_usable_coordinate) genStatus = 'grounding_no_coordinate';

            candidateLinks.push({
                mountain_no: mountain.mountain_no,
                mountain_name: mountain.name,
                mountain_source_row_no: mountain.source_row_no,
                summit_candidate_id: null,
                source_gpx_path: null,
                source_gpx_basename: null,
                summit_candidate_gpx_path: null,
                track_name: null,
                candidate_lat: null,
                candidate_lon: null,
                candidate_ele_m: null,
                mountain_csv_lat: mountain.coordinates ? mountain.coordinates.lat : null,
                mountain_csv_lon: mountain.coordinates ? mountain.coordinates.lon : null,
                mountain_elevation_m: mountain.elevation_m,
                evidence: { name: null, elevation: null, csv_coordinate: null, location: null, activity_link: null, grounding: null },
                grounding_assisted_generation_status: genStatus,
                grounding_match_status: 'no_candidate',
                grounding_distance_m: null,
                grounding_distance_tier: 'no_candidate',
                grounding_elevation_diff_m: null,
                grounding_elevation_tier: null,
                grounding_name_match_status: gRef ? gRef.name_match_status : null,
                grounding_municipality_match_status: gRef ? gRef.municipality_match_status : null,
                grounding_reference_status: gRef ? gRef.grounding_reference_status : null,
                grounding_assisted_candidate_score: 0,
                grounding_review_reduction_class: 'fallback_review_required',
                grounding_reason_codes: ['no_candidate_for_mountain'],
                combined_candidate_score: 0,
                candidate_rank_for_mountain: null,
                candidate_rank_for_summit_candidate: null,
                match_status: 'no_candidate',
                confidence: 'none',
                needs_human_review: true,
                review_reason_codes: ['no_candidate_for_mountain'],
                notes: `mountain=${mountain.name}(#${mountain.mountain_no}); no summit candidates found`,
            });
        }
    }

    summary.total_links_generated = candidateLinks.length;
    return { candidateLinks, prunedLog, summary };
}

/**
 * Generate candidate links for a grounded mountain using spatial search.
 */
function generateGroundedCandidateLinks(mountain, candidates, gRef, locationEvidenceMap, activityLinkMap) {
    const gLat = gRef.selected_grounding_lat;
    const gLon = gRef.selected_grounding_lon;
    const gEle = gRef.selected_grounding_elevation_m;

    // Find all candidates within spatial search radius
    const nearbyCandidates = [];
    const farCandidates = [];

    for (const candidate of candidates) {
        const dist = haversineDistance(gLat, gLon, candidate.lat, candidate.lon);
        if (dist <= GROUNDING_THRESHOLDS.SPATIAL_SEARCH_RADIUS_M) {
            nearbyCandidates.push({ candidate, dist });
        } else {
            farCandidates.push({ candidate, dist });
        }
    }

    const links = [];
    const pruned = [];
    let hasStrictMatch = false;
    let strictMatchId = null;

    // Check for strict matches
    const strictCandidates = [];
    for (const { candidate, dist } of nearbyCandidates) {
        if (dist <= GROUNDING_THRESHOLDS.STRICT_DISTANCE_M) {
            const eleDiff = gEle != null && candidate.ele_m != null ? Math.abs(gEle - candidate.ele_m) : null;
            const eleOk = eleDiff === null || eleDiff <= GROUNDING_THRESHOLDS.STRICT_ELEVATION_M;
            const nameOk = gRef.name_match_status === 'exact' || gRef.name_match_status === 'normalized_exact';
            const munOk = gRef.municipality_match_status !== 'mismatch';

            if (eleOk && nameOk && munOk) {
                strictCandidates.push({ candidate, dist, eleDiff });
            }
        }
    }

    // Check uniqueness for strict match
    if (strictCandidates.length === 1) {
        hasStrictMatch = true;
        strictMatchId = strictCandidates[0].candidate.summit_candidate_id;
    } else if (strictCandidates.length > 1) {
        // Check if all strict candidates are coordinate duplicates (within 5m)
        let allDuplicates = true;
        for (let i = 1; i < strictCandidates.length; i++) {
            const d = haversineDistance(
                strictCandidates[0].candidate.lat, strictCandidates[0].candidate.lon,
                strictCandidates[i].candidate.lat, strictCandidates[i].candidate.lon
            );
            if (d > GROUNDING_THRESHOLDS.DUPLICATE_TOLERANCE_M) {
                allDuplicates = false;
                break;
            }
        }
        if (allDuplicates) {
            // Pick the one with closest elevation
            strictCandidates.sort((a, b) => (a.eleDiff || 0) - (b.eleDiff || 0));
            hasStrictMatch = true;
            strictMatchId = strictCandidates[0].candidate.summit_candidate_id;
        }
        // If not all duplicates, no strict match — force review of the multiple candidates
    }

    // Build links for nearby candidates
    for (const { candidate, dist } of nearbyCandidates) {
        const tier = classifyDistanceTier(dist);
        const eleDiff = gEle != null && candidate.ele_m != null ? Math.abs(gEle - candidate.ele_m) : null;
        const isStrict = hasStrictMatch && candidate.summit_candidate_id === strictMatchId;
        const matchStatus = isStrict ? 'strict_grounding_match' : tier;

        const activityLink = activityLinkMap.get(candidate.source_gpx_basename) || null;
        const locEvidence = locationEvidenceMap.get(candidate.summit_candidate_id) || null;

        // Compute existing evidence signals
        const nameEvidence = computeNameEvidence(mountain.name, candidate.track_name, activityLink);
        const elevationEvidence = computeElevationEvidence(mountain.elevation_m, candidate.ele_m);
        const csvCoordEvidence = computeCsvCoordinateEvidence(
            mountain.coordinates ? mountain.coordinates.lat : null,
            mountain.coordinates ? mountain.coordinates.lon : null,
            candidate.lat, candidate.lon
        );
        const locationEvidence = computeLocationEvidence(mountain.location, locEvidence);
        const activityEvidence = computeActivityLinkEvidence(activityLink);
        const existingBlend = computeCombinedScore(nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence);

        const score = computeGroundingAssistedScore(matchStatus, dist, eleDiff, existingBlend, nameEvidence.name_score);
        const reviewClass = deriveReviewReductionClass(matchStatus, score, hasStrictMatch, isStrict);

        const reviewCodes = [];
        if (!isStrict && hasStrictMatch) reviewCodes.push('outranked_by_strict_match');
        if (matchStatus === 'strict_grounding_match') reviewCodes.push('strict_grounding_match');
        if (gRef.municipality_match_status === 'mismatch') reviewCodes.push('grounding_municipality_mismatch');

        links.push(buildCandidateLink(mountain, candidate, {
            nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence,
            existingBlend, score, matchStatus, dist, eleDiff,
            reviewClass, gRef,
            groundingReasonCodes: reviewCodes,
        }));
    }

    // If strict match found, prune far candidates with log
    if (hasStrictMatch) {
        // Also prune nearby candidates that aren't the strict match from the links
        // (keep them but they'll be low-ranked)
        // Prune only truly far candidates
        for (const { candidate, dist } of farCandidates) {
            pruned.push({
                mountain_no: mountain.mountain_no,
                mountain_name: mountain.name,
                summit_candidate_id: candidate.summit_candidate_id,
                candidate_lat: candidate.lat,
                candidate_lon: candidate.lon,
                candidate_ele_m: candidate.ele_m,
                grounding_distance_m: Math.round(dist * 10) / 10,
                pruning_reason: 'strict_grounding_match_found',
                strict_match_id: strictMatchId,
                track_name: candidate.track_name,
            });
        }
    } else {
        // No strict match: include fallback evidence-based candidates from far away
        // but only if they pass the meaningful signal filter
        const fallbackFar = generateFallbackForFarCandidates(mountain, farCandidates, locationEvidenceMap, activityLinkMap);
        links.push(...fallbackFar);
    }

    let generationStatus;
    if (hasStrictMatch) generationStatus = 'grounding_strict_supported';
    else if (nearbyCandidates.length > 0) generationStatus = 'grounding_spatial_search';
    else generationStatus = 'grounding_no_nearby_candidates';

    return { links, pruned, hasStrictMatch, generationStatus };
}

/**
 * Fallback: generate candidate links using existing broad evidence-based search.
 */
function generateFallbackCandidateLinks(mountain, candidates, locationEvidenceMap, activityLinkMap, reviewReductionClass) {
    const links = [];

    for (const candidate of candidates) {
        const activityLink = activityLinkMap.get(candidate.source_gpx_basename) || null;
        const locEvidence = locationEvidenceMap.get(candidate.summit_candidate_id) || null;

        const nameEvidence = computeNameEvidence(mountain.name, candidate.track_name, activityLink);
        const elevationEvidence = computeElevationEvidence(mountain.elevation_m, candidate.ele_m);
        const csvCoordEvidence = computeCsvCoordinateEvidence(
            mountain.coordinates ? mountain.coordinates.lat : null,
            mountain.coordinates ? mountain.coordinates.lon : null,
            candidate.lat, candidate.lon
        );
        const locationEvidence = computeLocationEvidence(mountain.location, locEvidence);
        const activityEvidence = computeActivityLinkEvidence(activityLink);
        const existingBlend = computeCombinedScore(nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence);

        // Apply meaningful signal filter (same as baseline Stage 9)
        const hasMeaningfulNameSignal = nameEvidence.name_score >= 0.3;
        const hasCloseCoordinate = csvCoordEvidence.csv_coordinate_tier !== 'unavailable' &&
            csvCoordEvidence.csv_coordinate_tier !== 'warning';
        const hasGoodElevation = elevationEvidence.elevation_tier === 'strong' ||
            elevationEvidence.elevation_tier === 'medium';

        if (!hasMeaningfulNameSignal && !hasCloseCoordinate && !hasGoodElevation) continue;

        const score = existingBlend; // No grounding adjustment for fallback

        links.push(buildCandidateLink(mountain, candidate, {
            nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence,
            existingBlend, score,
            matchStatus: 'grounding_unavailable',
            dist: null, eleDiff: null,
            reviewClass: reviewReductionClass,
            gRef: null,
            groundingReasonCodes: [reviewReductionClass],
        }));
    }

    return links;
}

/**
 * For far candidates from a grounded mountain that didn't get a strict match.
 */
function generateFallbackForFarCandidates(mountain, farCandidates, locationEvidenceMap, activityLinkMap) {
    const links = [];
    for (const { candidate, dist } of farCandidates) {
        const activityLink = activityLinkMap.get(candidate.source_gpx_basename) || null;
        const locEvidence = locationEvidenceMap.get(candidate.summit_candidate_id) || null;

        const nameEvidence = computeNameEvidence(mountain.name, candidate.track_name, activityLink);
        const elevationEvidence = computeElevationEvidence(mountain.elevation_m, candidate.ele_m);
        const csvCoordEvidence = computeCsvCoordinateEvidence(
            mountain.coordinates ? mountain.coordinates.lat : null,
            mountain.coordinates ? mountain.coordinates.lon : null,
            candidate.lat, candidate.lon
        );
        const locationEvidence = computeLocationEvidence(mountain.location, locEvidence);
        const activityEvidence = computeActivityLinkEvidence(activityLink);
        const existingBlend = computeCombinedScore(nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence);

        // Only include if meaningful signal exists AND score is decent
        const hasMeaningfulNameSignal = nameEvidence.name_score >= 0.3;
        const hasCloseCoordinate = csvCoordEvidence.csv_coordinate_tier !== 'unavailable' &&
            csvCoordEvidence.csv_coordinate_tier !== 'warning';

        if (!hasMeaningfulNameSignal && !hasCloseCoordinate) continue;

        const gEle = null; // no elevation comparison for far candidates
        const score = computeGroundingAssistedScore('grounding_contradicted_or_unrelated', dist, gEle, existingBlend, nameEvidence.name_score);

        links.push(buildCandidateLink(mountain, candidate, {
            nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence,
            existingBlend, score,
            matchStatus: 'grounding_contradicted_or_unrelated',
            dist, eleDiff: null,
            reviewClass: 'fallback_review_required',
            gRef: null,
            groundingReasonCodes: ['grounding_far_from_candidate'],
        }));
    }
    return links;
}

function buildCandidateLink(mountain, candidate, opts) {
    const {
        nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence,
        existingBlend, score, matchStatus, dist, eleDiff,
        reviewClass, gRef, groundingReasonCodes,
    } = opts;

    const activityLink = activityEvidence;

    return {
        mountain_no: mountain.mountain_no,
        mountain_name: mountain.name,
        mountain_source_row_no: mountain.source_row_no,
        summit_candidate_id: candidate.summit_candidate_id,
        source_gpx_path: candidate.source_gpx_path,
        source_gpx_basename: candidate.source_gpx_basename,
        summit_candidate_gpx_path: candidate.summit_candidate_gpx_path,
        track_name: candidate.track_name,
        candidate_lat: candidate.lat,
        candidate_lon: candidate.lon,
        candidate_ele_m: candidate.ele_m,
        mountain_csv_lat: mountain.coordinates ? mountain.coordinates.lat : null,
        mountain_csv_lon: mountain.coordinates ? mountain.coordinates.lon : null,
        mountain_elevation_m: mountain.elevation_m,
        evidence: {
            name: nameEvidence,
            elevation: elevationEvidence,
            csv_coordinate: csvCoordEvidence,
            location: locationEvidence,
            activity_link: activityEvidence,
            grounding: gRef ? {
                grounding_lat: gRef.selected_grounding_lat,
                grounding_lon: gRef.selected_grounding_lon,
                grounding_elevation_m: gRef.selected_grounding_elevation_m,
                grounding_municipality: gRef.selected_grounding_municipality,
                grounding_confidence: gRef.selected_grounding_confidence_score,
                name_match_status: gRef.name_match_status,
                municipality_match_status: gRef.municipality_match_status,
                coordinate_conflict: gRef.coordinate_conflict,
                grounding_reference_status: gRef.grounding_reference_status,
            } : null,
        },
        grounding_assisted_generation_status: null, // filled by caller
        grounding_match_status: matchStatus,
        grounding_distance_m: dist != null ? Math.round(dist * 10) / 10 : null,
        grounding_distance_tier: matchStatus,
        grounding_elevation_diff_m: eleDiff != null ? Math.round(eleDiff * 10) / 10 : null,
        grounding_elevation_tier: eleDiff != null ? (eleDiff <= 10 ? 'strong' : eleDiff <= 30 ? 'medium' : eleDiff <= 50 ? 'weak' : 'warning') : null,
        grounding_name_match_status: gRef ? gRef.name_match_status : null,
        grounding_municipality_match_status: gRef ? gRef.municipality_match_status : null,
        grounding_reference_status: gRef ? gRef.grounding_reference_status : null,
        grounding_assisted_candidate_score: score,
        grounding_review_reduction_class: reviewClass,
        grounding_reason_codes: groundingReasonCodes,
        combined_candidate_score: existingBlend,
        candidate_rank_for_mountain: null, // filled by caller
        candidate_rank_for_summit_candidate: null, // filled by caller
        match_status: null,
        confidence: null,
        needs_human_review: reviewClass !== 'auto_supported_strict_grounding_match',
        review_reason_codes: groundingReasonCodes,
        notes: `mountain=${mountain.name}(#${mountain.mountain_no}); candidate=${candidate.summit_candidate_id}; grounding_match=${matchStatus}; score=${score}`,
    };
}

// ─── Distance Tier Classification ────────────────────────────────────────────

function classifyDistanceTier(distM) {
    if (distM <= GROUNDING_THRESHOLDS.STRICT_DISTANCE_M) return 'strict_grounding_match';
    if (distM <= GROUNDING_THRESHOLDS.STRONG_DISTANCE_M) return 'strong_grounding_nearby';
    if (distM <= GROUNDING_THRESHOLDS.WEAK_DISTANCE_M) return 'weak_grounding_nearby';
    if (distM <= GROUNDING_THRESHOLDS.FAR_DISTANCE_M) return 'far_grounding_candidate';
    return 'grounding_contradicted_or_unrelated';
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function computeGroundingAssistedScore(matchStatus, distM, eleDiffM, existingBlend, nameScore) {
    const eleCloseness = eleDiffM != null ? Math.max(0, 1 - eleDiffM / 50) : 0.5;
    const ns = nameScore || 0;

    let score;
    switch (matchStatus) {
        case 'strict_grounding_match':
            score = 0.95 + 0.05 * eleCloseness;
            break;
        case 'strong_grounding_nearby':
            score = 0.80 + 0.05 * ns + 0.05 * eleCloseness;
            break;
        case 'weak_grounding_nearby':
            score = 0.60 + 0.05 * ns + 0.05 * eleCloseness;
            break;
        case 'far_grounding_candidate':
            score = 0.40 + existingBlend * 0.6;
            break;
        case 'grounding_contradicted_or_unrelated':
            score = existingBlend * 0.8;
            break;
        case 'grounding_unavailable':
        default:
            score = existingBlend;
            break;
    }
    return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}

// ─── Review Reduction Classification ─────────────────────────────────────────

function deriveReviewReductionClass(matchStatus, score, hasStrictMatch, isStrictCandidate) {
    if (isStrictCandidate && matchStatus === 'strict_grounding_match') {
        return 'auto_supported_strict_grounding_match';
    }
    if (matchStatus === 'strong_grounding_nearby') {
        return 'grounding_supported_but_map_check_recommended';
    }
    if (matchStatus === 'weak_grounding_nearby') {
        return 'grounding_ambiguous_multiple_candidates';
    }
    return 'fallback_review_required';
}

// ─── Review Queue Generation ─────────────────────────────────────────────────

/**
 * Generate review queue outputs from grounding-assisted candidate links.
 * @param {Array<Object>} candidateLinks
 * @param {number} totalMountains
 * @returns {Object}
 */
function generateReviewQueues(candidateLinks, totalMountains, stage21Map = new Map()) {
    const autoSupported = [];
    const reviewRequiredMountains = new Map(); // mountain_no → best link
    const reviewRequiredCandidates = [];
    const groundingConflicts = [];

    // Group by mountain
    const byMountain = new Map();
    for (const link of candidateLinks) {
        if (!byMountain.has(link.mountain_no)) byMountain.set(link.mountain_no, []);
        byMountain.get(link.mountain_no).push(link);
    }

    const mountainClassifications = new Map();

    for (const [mno, links] of byMountain) {
        const top = links[0]; // already sorted by score
        const hasStrict = links.some(l => l.grounding_match_status === 'strict_grounding_match' && l.grounding_review_reduction_class === 'auto_supported_strict_grounding_match');

        let classification;

        // Stage 21 Support Carry Forward
        const s21 = stage21Map.get(mno);
        if (s21 && s21.status === 'grounding_supported') {
            classification = 'stage21_grounding_supported_deferred';

            // Mark the links with stage21_review_status
            for (const link of links) {
                link.stage21_review_status = s21.status;
                link.stage21_top_candidate_id = s21.top_candidate_id;
            }

            // Push to auto supported, meaning it defers manual review
            autoSupported.push(links.find(l => l.summit_candidate_id === s21.top_candidate_id) || top);
        } else if (hasStrict) {
            const strictLink = links.find(l => l.grounding_review_reduction_class === 'auto_supported_strict_grounding_match');
            classification = 'auto_supported_strict_grounding_match';
            autoSupported.push(strictLink);
        } else if (top.grounding_assisted_generation_status === 'grounding_coordinate_conflict') {
            classification = 'grounding_coordinate_conflict';
            groundingConflicts.push(top);
            reviewRequiredMountains.set(mno, top);
            reviewRequiredCandidates.push(...links);
        } else if (top.grounding_match_status === 'strong_grounding_nearby') {
            classification = 'grounding_supported_but_map_check_recommended';
            reviewRequiredMountains.set(mno, top);
            reviewRequiredCandidates.push(...links);
        } else if (top.grounding_assisted_generation_status === 'grounding_no_nearby_candidates') {
            classification = 'grounding_far_from_all_candidates';
            reviewRequiredMountains.set(mno, top);
            reviewRequiredCandidates.push(...links);
        } else if (top.grounding_match_status === 'grounding_unavailable') {
            const genStatus = top.grounding_assisted_generation_status;
            if (genStatus === 'no_grounding_response') {
                classification = 'no_grounding_response_fallback';
            } else if (genStatus === 'grounding_no_coordinate') {
                classification = 'grounding_response_without_coordinate';
            } else {
                classification = 'fallback_review_required';
            }
            reviewRequiredMountains.set(mno, top);
            reviewRequiredCandidates.push(...links);
        } else {
            classification = 'fallback_review_required';
            reviewRequiredMountains.set(mno, top);
            reviewRequiredCandidates.push(...links);
        }

        mountainClassifications.set(mno, classification);
    }

    // Check coverage
    const coveredMountains = new Set([...byMountain.keys()]);

    const reviewSummary = {
        total_mountains: totalMountains,
        mountains_covered: coveredMountains.size,
        auto_supported_count: autoSupported.length,
        review_required_count: reviewRequiredMountains.size,
        grounding_conflict_count: groundingConflicts.length,
        review_candidate_links: reviewRequiredCandidates.length,
        coverage_gap: totalMountains - coveredMountains.size,
    };

    return {
        autoSupported,
        reviewRequiredMountains: Array.from(reviewRequiredMountains.values()),
        reviewRequiredCandidates,
        groundingConflicts,
        mountainClassifications,
        reviewSummary,
    };
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function csvEscape(val) {
    if (val == null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function buildAutoSupportedCSV(links) {
    const headers = ['mountain_no', 'mountain_name', 'summit_candidate_id', 'grounding_assisted_candidate_score',
        'grounding_distance_m', 'grounding_elevation_diff_m', 'candidate_lat', 'candidate_lon', 'candidate_ele_m',
        'mountain_elevation_m', 'grounding_match_status', 'grounding_review_reduction_class', 'track_name'];
    const rows = [headers.join(',')];
    for (const l of links) {
        rows.push(headers.map(h => csvEscape(l[h])).join(','));
    }
    return rows.join('\n') + '\n';
}

function buildReviewRequiredMountainsCSV(links, classifications) {
    const headers = ['mountain_no', 'mountain_name', 'classification', 'summit_candidate_id',
        'grounding_assisted_candidate_score', 'grounding_distance_m', 'grounding_match_status',
        'candidate_lat', 'candidate_lon', 'candidate_ele_m', 'mountain_elevation_m', 'track_name',
        'grounding_reason_codes'];
    const rows = [headers.join(',')];
    for (const l of links) {
        const cls = classifications.get(l.mountain_no) || '';
        const row = { ...l, classification: cls, grounding_reason_codes: (l.grounding_reason_codes || []).join('|') };
        rows.push(headers.map(h => csvEscape(row[h])).join(','));
    }
    return rows.join('\n') + '\n';
}

function buildReviewRequiredCandidatesCSV(links) {
    const headers = ['mountain_no', 'mountain_name', 'summit_candidate_id',
        'grounding_assisted_candidate_score', 'grounding_match_status', 'grounding_distance_m',
        'grounding_elevation_diff_m', 'candidate_lat', 'candidate_lon', 'candidate_ele_m',
        'mountain_elevation_m', 'candidate_rank_for_mountain', 'track_name', 'grounding_reason_codes'];
    const rows = [headers.join(',')];
    for (const l of links) {
        const row = { ...l, grounding_reason_codes: (l.grounding_reason_codes || []).join('|') };
        rows.push(headers.map(h => csvEscape(row[h])).join(','));
    }
    return rows.join('\n') + '\n';
}

function buildGroundingConflictsCSV(links) {
    const headers = ['mountain_no', 'mountain_name', 'grounding_assisted_generation_status',
        'grounding_match_status', 'summit_candidate_id', 'grounding_assisted_candidate_score',
        'candidate_lat', 'candidate_lon', 'track_name'];
    const rows = [headers.join(',')];
    for (const l of links) {
        rows.push(headers.map(h => csvEscape(l[h])).join(','));
    }
    return rows.join('\n') + '\n';
}

function buildReviewSummaryMd(reviewSummary, linkSummary) {
    return `# Grounding-Assisted Review Queue Summary

## Mountain Coverage

| Metric | Count |
|---|---|
| Total mountains | ${reviewSummary.total_mountains} |
| Mountains covered by candidate links | ${reviewSummary.mountains_covered} |
| Coverage gap | ${reviewSummary.coverage_gap} |
| Auto-supported (strict grounding match) | ${reviewSummary.auto_supported_count} |
| Review required | ${reviewSummary.review_required_count} |
| Grounding conflicts | ${reviewSummary.grounding_conflict_count} |

## Candidate Link Statistics

| Metric | Count |
|---|---|
| Total candidate links | ${linkSummary.total_links_generated} |
| Strict grounding matches | ${linkSummary.strict_grounding_match} |
| Strong grounding nearby | ${linkSummary.strong_grounding_nearby} |
| Weak grounding nearby | ${linkSummary.weak_grounding_nearby} |
| Far grounding candidate | ${linkSummary.far_grounding_candidate} |
| Grounding contradicted | ${linkSummary.grounding_contradicted_or_unrelated} |
| Grounding unavailable (fallback) | ${linkSummary.grounding_unavailable_fallback} |
| Pruned candidates | ${linkSummary.total_links_pruned} |

## Review Burden Reduction

| Metric | Baseline | Grounding-Assisted | Reduction |
|---|---|---|---|
| Total candidate links | 11,372 | ${linkSummary.total_links_generated} | ${11372 - linkSummary.total_links_generated} |
| Mountains needing review | 531 | ${reviewSummary.review_required_count} | ${531 - reviewSummary.review_required_count} |

## Review Files

- \`auto_supported_candidates.csv\` — ${reviewSummary.auto_supported_count} mountains excluded from review
- \`review_required_mountains.csv\` — ${reviewSummary.review_required_count} mountains for human review
- \`review_required_candidates.csv\` — ${reviewSummary.review_candidate_links} candidate links for review
- \`grounding_conflicts.csv\` — ${reviewSummary.grounding_conflict_count} mountains with conflicting grounding

## Policy Notes

- Grounding evidence is auxiliary, not canonical
- Auto-supported candidates are not final accepted coordinates
- Missing Gemini coordinates are handled as unavailable evidence
- Duplicate Gemini records are consolidated by clustering
`;
}

module.exports = {
    GROUNDING_THRESHOLDS,
    normalizeGroundingResponses,
    generateGroundingAssistedLinks,
    generateReviewQueues,
    computeNameMatchStatus,
    computeMunicipalityMatchStatus,
    cleanMunicipalityName,
    clusterPoints,
    checkConflict,
    selectBestCluster,
    classifyDistanceTier,
    computeGroundingAssistedScore,
    deriveReviewReductionClass,
    csvEscape,
    buildAutoSupportedCSV,
    buildReviewRequiredMountainsCSV,
    buildReviewRequiredCandidatesCSV,
    buildGroundingConflictsCSV,
    buildReviewSummaryMd,
};

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { haversineDistance } = require('./geo_distance');
const { computeTitleSimilarity } = require('./text_similarity');

/**
 * Parses a JSONL file into an array of objects.
 */
async function parseJsonl(filePath) {
    const records = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    for await (const line of rl) {
        if (line.trim()) {
            records.push(JSON.parse(line));
        }
    }
    return records;
}

/**
 * Checks if two municipalities are adjacent based on the land adjacency reference.
 */
function areAdjacent(muni1, muni2, adjacencyData) {
    if (!muni1 || !muni2) return false;
    if (muni1 === muni2) return true;
    const list = adjacencyData.land_adjacent[muni1];
    return list ? list.includes(muni2) : false;
}

/**
 * Executes the Gemini-grounded mountain summit assignment logic.
 */
async function performAssignment(inputs) {
    // 1. Load datasets
    const mountains = JSON.parse(fs.readFileSync(inputs.mountains, 'utf8'));
    const summitCandidates = await parseJsonl(inputs.summitCandidates);
    const groundingIndex = await parseJsonl(inputs.groundingReference);
    const municipalityLookup = await parseJsonl(inputs.municipalityLookup);
    const municipalityStability = await parseJsonl(inputs.municipalityStability);
    const adjacencyData = JSON.parse(fs.readFileSync(inputs.municipalityAdjacency, 'utf8'));

    // Create indexes for efficient joining
    const groundingMap = new Map();
    groundingIndex.forEach(g => groundingMap.set(g.mountain_no, g));

    const mLookupMap = new Map();
    municipalityLookup.forEach(m => mLookupMap.set(m.source_record_id, m));

    const mStabilityMap = new Map();
    municipalityStability.forEach(s => mStabilityMap.set(s.summit_candidate_id, s));

    const proposedAssignments = [];
    const candidateSupportLinks = [];
    const prunedLog = [];

    // Helper to determine GPX support tier
    function getSupportTier(dist) {
        if (dist <= 50) return 'strict_gpx_support';
        if (dist <= 150) return 'strong_gpx_support';
        if (dist <= 300) return 'medium_gpx_support';
        if (dist <= 500) return 'weak_gpx_support';
        if (dist <= 1000) return 'distant_gpx_support';
        return 'no_gpx_support';
    }

    // Process each mountain
    for (const m of mountains) {
        const mountainNo = m.mountain_no;
        const mountainName = m.name;
        const sourceRowNo = m.source_row_no;

        const csvLat = m.coordinates ? m.coordinates.lat : null;
        const csvLon = m.coordinates ? m.coordinates.lon : null;
        const csvEle = m.elevation_m || null;

        const grounding = groundingMap.get(mountainNo);

        // Evidence structures
        const evidenceCsv = {
            lat: csvLat,
            lon: csvLon,
            raw: m.coordinates ? m.coordinates.raw : '',
            source: m.coordinates ? m.coordinates.source : ''
        };
        const evidenceName = {
            mountain_name: mountainName
        };
        const evidenceMunicipality = {
            expected_municipality: m.location ? m.location.municipality : null,
            expected_municipality_or_island: m.location ? m.location.municipality_or_island : null,
            expected_island: m.location ? m.location.island : null
        };
        const evidenceElevation = {
            csv_elevation_m: csvEle
        };
        const evidenceGemini = grounding ? {
            lat: grounding.selected_grounding_lat,
            lon: grounding.selected_grounding_lon,
            elevation_m: grounding.selected_grounding_elevation_m,
            municipality: grounding.selected_grounding_municipality,
            confidence: grounding.selected_grounding_confidence_score,
            links: grounding.evidence_links,
            raw_response_refs: grounding.raw_response_refs
        } : null;

        // Default outputs
        let proposedLat = null;
        let proposedLon = null;
        let proposedEle = null;
        let proposedSource = null;
        let proposedCandidateId = null;
        let sourceGpxBasename = null;
        let sourceGpxPath = null;
        let distGeminiToProposed = null;
        let distCsvToProposed = null;
        let eleDiffCsvToProposed = null;
        let confidence = 0.0;
        let needsReview = true;
        let reviewCategory = 'no_assignment';
        let status = 'unassigned';
        const reasonCodes = [];
        let evidenceGpx = null;
        let notes = '';

        if (grounding && grounding.coordinate_conflict) {
            // Case 5: Gemini grounding coordinate conflict
            reviewCategory = 'conflict_case';
            needsReview = true;
            reasonCodes.push('gemini_coordinate_conflict');
            notes = 'Gemini grounding index indicates a coordinate conflict across raw responses. Proposing no coordinate to avoid false consensus.';
            // Preserving grounding evidence but keeping proposed coords null
        } else if (grounding && grounding.has_usable_coordinate) {
            // Usable grounding coordinates present
            const gLat = grounding.selected_grounding_lat;
            const gLon = grounding.selected_grounding_lon;
            const gEle = grounding.selected_grounding_elevation_m;

            // Search GPX summit candidates within 1000m
            const closeCandidates = [];

            for (const c of summitCandidates) {
                const dist = haversineDistance(gLat, gLon, c.lat, c.lon);
                if (dist <= 1000) {
                    // Score components:
                    // 1. Gemini grounding quality (selected_grounding_confidence_score)
                    const scoreGrounding = grounding.selected_grounding_confidence_score || 0.5;

                    // 2. Spatial support
                    let scoreSpatial = 0.0;
                    if (dist <= 50) scoreSpatial = 1.0;
                    else if (dist <= 150) scoreSpatial = 0.8;
                    else if (dist <= 300) scoreSpatial = 0.6;
                    else if (dist <= 500) scoreSpatial = 0.4;
                    else scoreSpatial = 0.2;

                    // 3. Name compatibility
                    const sim = computeTitleSimilarity(mountainName, c.track_name);
                    const scoreName = sim.score;

                    // 4. Municipality compatibility
                    let scoreMuni = 0.0;
                    const cLookup = mLookupMap.get(c.summit_candidate_id);
                    const cMuni = cLookup ? cLookup.primary_municipality_name : null;
                    const expectedMuni = m.location ? m.location.municipality : null;

                    if (!expectedMuni) {
                        scoreMuni = 0.5;
                    } else if (expectedMuni === cMuni) {
                        scoreMuni = 1.0;
                    } else if (areAdjacent(expectedMuni, cMuni, adjacencyData)) {
                        scoreMuni = 0.5;
                    } else {
                        scoreMuni = 0.0;
                    }

                    // 5. Elevation compatibility
                    let scoreEle = 0.0;
                    if (csvEle && c.ele_m) {
                        const eleDiff = Math.abs(csvEle - c.ele_m);
                        if (eleDiff <= 10) scoreEle = 1.0;
                        else if (eleDiff <= 50) scoreEle = 0.8;
                        else if (eleDiff <= 100) scoreEle = 0.5;
                        else if (eleDiff <= 200) scoreEle = 0.2;
                    } else {
                        scoreEle = 0.5;
                    }

                    // 6. CSV coordinate compatibility
                    let scoreCsv = 0.5;
                    if (csvLat && csvLon) {
                        const distToCsv = haversineDistance(csvLat, csvLon, c.lat, c.lon);
                        if (distToCsv <= 100) scoreCsv = 1.0;
                        else if (distToCsv <= 500) scoreCsv = 0.8;
                        else if (distToCsv <= 1000) scoreCsv = 0.6;
                        else if (distToCsv <= 2000) scoreCsv = 0.3;
                        else scoreCsv = 0.0;
                    }

                    // Calculate combined score
                    const combinedScore = (
                        0.45 * scoreGrounding +
                        0.25 * scoreSpatial +
                        0.10 * scoreName +
                        0.10 * scoreMuni +
                        0.05 * scoreEle +
                        0.05 * scoreCsv
                    );

                    closeCandidates.push({
                        candidate: c,
                        distance: dist,
                        tier: getSupportTier(dist),
                        scoreGrounding,
                        scoreSpatial,
                        scoreName,
                        scoreMuni,
                        scoreCsv,
                        scoreEle,
                        score: Number(combinedScore.toFixed(4)),
                        cMuni,
                        nameSimilarity: sim
                    });
                } else {
                    prunedLog.push({
                        mountain_no: mountainNo,
                        mountain_name: mountainName,
                        summit_candidate_id: c.summit_candidate_id,
                        reason_code: 'outside_1000m_from_gemini_anchor',
                        distance_m: Number(dist.toFixed(1))
                    });
                }
            }

            // Group closeCandidates and links
            closeCandidates.forEach(cc => {
                candidateSupportLinks.push({
                    mountain_no: mountainNo,
                    mountain_name: mountainName,
                    summit_candidate_id: cc.candidate.summit_candidate_id,
                    source_gpx_basename: cc.candidate.source_gpx_basename,
                    track_name: cc.candidate.track_name,
                    candidate_lat: cc.candidate.lat,
                    candidate_lon: cc.candidate.lon,
                    candidate_ele_m: cc.candidate.ele_m,
                    distance_gemini_to_candidate_m: Number(cc.distance.toFixed(1)),
                    gpx_support_tier: cc.tier,
                    name_compatibility: cc.scoreName,
                    municipality_compatibility: cc.scoreMuni,
                    elevation_compatibility: cc.scoreEle,
                    csv_coordinate_compatibility: cc.scoreCsv,
                    support_score: cc.score,
                    selected_for_assignment: false,
                    review_reason_codes: [] // will fill if needed
                });
            });

            if (closeCandidates.length > 0) {
                // Propose closest or highest-scoring GPX candidate
                // Sort by combined support score descending, tie-breaker: closest distance
                closeCandidates.sort((a, b) => {
                    if (Math.abs(a.score - b.score) > 0.0001) {
                        return b.score - a.score;
                    }
                    return a.distance - b.distance;
                });

                const best = closeCandidates[0];
                best.selectedForAssignment = true;

                // Update selected flag in links
                const selectedLink = candidateSupportLinks.find(l => l.mountain_no === mountainNo && l.summit_candidate_id === best.candidate.summit_candidate_id);
                if (selectedLink) selectedLink.selected_for_assignment = true;

                // Log other candidates as weaker
                closeCandidates.slice(1).forEach(cc => {
                    prunedLog.push({
                        mountain_no: mountainNo,
                        mountain_name: mountainName,
                        summit_candidate_id: cc.candidate.summit_candidate_id,
                        reason_code: 'weaker_than_selected_candidate',
                        score: cc.score,
                        best_score: best.score
                    });
                });

                // Set outputs
                proposedLat = best.candidate.lat;
                proposedLon = best.candidate.lon;
                proposedEle = best.candidate.ele_m;
                proposedSource = 'gpx_summit_candidate';
                proposedCandidateId = best.candidate.summit_candidate_id;
                sourceGpxBasename = best.candidate.source_gpx_basename;
                sourceGpxPath = best.candidate.source_gpx_path;
                distGeminiToProposed = Number(best.distance.toFixed(1));
                confidence = best.score;
                status = 'assigned';

                // Distance from CSV to proposed
                if (csvLat && csvLon) {
                    distCsvToProposed = Number(haversineDistance(csvLat, csvLon, proposedLat, proposedLon).toFixed(1));
                    if (distCsvToProposed > 2000) {
                        reasonCodes.push('csv_coordinate_mismatch');
                    }
                }

                // Elevation difference
                if (csvEle && proposedEle) {
                    eleDiffCsvToProposed = Number((csvEle - proposedEle).toFixed(1));
                    if (Math.abs(eleDiffCsvToProposed) > 100) {
                        reasonCodes.push('csv_elevation_mismatch');
                    }
                }

                // Municipality checks
                const cLookup = mLookupMap.get(proposedCandidateId);
                const cStability = mStabilityMap.get(proposedCandidateId);
                const expectedMuni = m.location ? m.location.municipality : null;
                const cMuni = best.cMuni;

                evidenceGpx = {
                    id: proposedCandidateId,
                    lat: proposedLat,
                    lon: proposedLon,
                    ele_m: proposedEle,
                    gpx_basename: sourceGpxBasename,
                    gpx_path: sourceGpxPath,
                    track_name: best.candidate.track_name
                };

                if (cLookup) {
                    evidenceMunicipality.candidate_lookup = {
                        primary_name: cLookup.primary_municipality_name,
                        primary_code: cLookup.primary_municipality_code,
                        matches: cLookup.municipality_matches
                    };
                }

                if (cStability) {
                    evidenceMunicipality.candidate_stability = {
                        stability: cStability.municipality_stability,
                        reason_codes: cStability.municipality_stability_reason_codes,
                        boundary_distance_m: cStability.center_distance_to_boundary_m
                    };
                }

                if (expectedMuni) {
                    if (expectedMuni !== cMuni) {
                        if (areAdjacent(expectedMuni, cMuni, adjacencyData)) {
                            reasonCodes.push('municipality_adjacent_warning');
                        } else {
                            reasonCodes.push('municipality_mismatch');
                        }
                    }
                } else {
                    reasonCodes.push('missing_expected_municipality');
                }

                // Check for name match status
                if (best.scoreName < 0.3) {
                    reasonCodes.push('name_compatibility_warning');
                }

                // Check for multiple candidates of similar strength (score within 0.05)
                const closeComp = closeCandidates.slice(1).filter(cc => best.score - cc.score <= 0.05);
                if (closeComp.length > 0) {
                    reasonCodes.push('multiple_strong_candidates_conflict');
                }

                // Classify Category
                if (reasonCodes.includes('municipality_mismatch') || reasonCodes.includes('multiple_strong_candidates_conflict')) {
                    reviewCategory = 'conflict_case';
                    needsReview = true;
                } else if (best.distance > 500) {
                    reviewCategory = 'manual_review_required';
                    needsReview = true;
                    reasonCodes.push('gpx_distant_support');
                } else if (best.distance > 150 || reasonCodes.includes('municipality_adjacent_warning') || reasonCodes.includes('name_compatibility_warning') || reasonCodes.includes('csv_coordinate_mismatch') || reasonCodes.includes('csv_elevation_mismatch')) {
                    reviewCategory = 'quick_review_recommended';
                    needsReview = true;
                } else {
                    reviewCategory = 'auto_supported_not_canonical';
                    needsReview = false;
                }
            } else {
                // Propose Gemini directly (Case 4: Usable Gemini but no GPX candidate within 1000m)
                proposedLat = gLat;
                proposedLon = gLon;
                proposedEle = gEle;
                proposedSource = 'gemini_only';
                status = 'assigned';
                distGeminiToProposed = 0.0;
                confidence = grounding.selected_grounding_confidence_score || 0.5;

                reviewCategory = 'gemini_only_coordinate_review';
                needsReview = true;
                reasonCodes.push('gemini_only_coordinate');
                notes = 'No GPX summit candidate found within 1000m. Proposing Gemini grounding coordinate directly.';

                if (csvLat && csvLon) {
                    distCsvToProposed = Number(haversineDistance(csvLat, csvLon, proposedLat, proposedLon).toFixed(1));
                    if (distCsvToProposed > 2000) {
                        reasonCodes.push('csv_coordinate_mismatch');
                    }
                }
                if (csvEle && proposedEle) {
                    eleDiffCsvToProposed = Number((csvEle - proposedEle).toFixed(1));
                }
            }
        } else {
            // Case 6: Gemini grounding is missing or insufficient (no_grounding_response or similar)
            if (!grounding) {
                reasonCodes.push('no_grounding_reference');
                notes = 'No grounding reference record found for this mountain.';
            }
            // Perform fallback check using CSV coordinate
            let fallbackSuccess = false;

            if (csvLat && csvLon) {
                const csvCloseCandidates = [];
                for (const c of summitCandidates) {
                    const dist = haversineDistance(csvLat, csvLon, c.lat, c.lon);
                    if (dist <= 500) {
                        const sim = computeTitleSimilarity(mountainName, c.track_name);
                        const cLookup = mLookupMap.get(c.summit_candidate_id);
                        const cMuni = cLookup ? cLookup.primary_municipality_name : null;
                        const expectedMuni = m.location ? m.location.municipality : null;

                        const muniMatch = expectedMuni && cMuni && (expectedMuni === cMuni || areAdjacent(expectedMuni, cMuni, adjacencyData));

                        if (sim.score >= 0.5 && muniMatch) {
                            csvCloseCandidates.push({
                                candidate: c,
                                distance: dist,
                                scoreName: sim.score,
                                cMuni
                            });
                        }
                    }
                }

                if (csvCloseCandidates.length > 0) {
                    // Sort by name similarity descending, then closest distance
                    csvCloseCandidates.sort((a, b) => {
                        if (Math.abs(a.scoreName - b.scoreName) > 0.001) {
                            return b.scoreName - a.scoreName;
                        }
                        return a.distance - b.distance;
                    });

                    const fallback = csvCloseCandidates[0];
                    proposedLat = fallback.candidate.lat;
                    proposedLon = fallback.candidate.lon;
                    proposedEle = fallback.candidate.ele_m;
                    proposedSource = 'gpx_summit_candidate';
                    proposedCandidateId = fallback.candidate.summit_candidate_id;
                    sourceGpxBasename = fallback.candidate.source_gpx_basename;
                    sourceGpxPath = fallback.candidate.source_gpx_path;
                    status = 'assigned';
                    distCsvToProposed = Number(fallback.distance.toFixed(1));
                    confidence = 0.35 + 0.15 * fallback.scoreName; // fallback confidence scale
                    needsReview = true;
                    reviewCategory = 'manual_review_required';
                    reasonCodes.push('csv_fallback_assignment');
                    notes = `Gemini grounding unavailable. Fell back to GPX candidate supported by name similarity and expected municipality (within 500m of CSV coordinates).`;
                    fallbackSuccess = true;

                    const cLookup = mLookupMap.get(proposedCandidateId);
                    const cStability = mStabilityMap.get(proposedCandidateId);

                    evidenceGpx = {
                        id: proposedCandidateId,
                        lat: proposedLat,
                        lon: proposedLon,
                        ele_m: proposedEle,
                        gpx_basename: sourceGpxBasename,
                        gpx_path: sourceGpxPath,
                        track_name: fallback.candidate.track_name
                    };

                    if (cLookup) {
                        evidenceMunicipality.candidate_lookup = {
                            primary_name: cLookup.primary_municipality_name,
                            primary_code: cLookup.primary_municipality_code,
                            matches: cLookup.municipality_matches
                        };
                    }

                    if (cStability) {
                        evidenceMunicipality.candidate_stability = {
                            stability: cStability.municipality_stability,
                            reason_codes: cStability.municipality_stability_reason_codes,
                            boundary_distance_m: cStability.center_distance_to_boundary_m
                        };
                    }
                }
            }

            if (!fallbackSuccess) {
                reviewCategory = 'no_assignment';
                needsReview = true;
                reasonCodes.push('no_usable_grounding');
                notes = 'No usable Gemini coordinates and no strong fallback candidate available.';
            }
        }

        proposedAssignments.push({
            mountain_no: mountainNo,
            mountain_name: mountainName,
            mountain_source_row_no: sourceRowNo,
            assignment_status: status,
            review_category: reviewCategory,
            proposed_lat: proposedLat,
            proposed_lon: proposedLon,
            proposed_ele_m: proposedEle,
            proposed_coordinate_source: proposedSource,
            proposed_summit_candidate_id: proposedCandidateId,
            source_gpx_basename: sourceGpxBasename,
            source_gpx_path: sourceGpxPath,
            distance_gemini_to_gpx_candidate_m: distGeminiToProposed,
            distance_csv_to_proposed_m: distCsvToProposed,
            elevation_diff_csv_to_proposed_m: eleDiffCsvToProposed,
            confidence: Number(confidence.toFixed(4)),
            needs_human_review: needsReview,
            review_reason_codes: reasonCodes,
            evidence: {
                gemini_grounding: evidenceGemini,
                gpx_summit_candidate: evidenceGpx,
                csv_coordinate: evidenceCsv,
                elevation: evidenceElevation,
                name: evidenceName,
                municipality: evidenceMunicipality,
                legacy_candidate_links: {} // Reserved empty for now
            },
            notes: notes || null
        });
    }

    return {
        proposedAssignments,
        candidateSupportLinks,
        prunedLog
    };
}

module.exports = {
    performAssignment
};

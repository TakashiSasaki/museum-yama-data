const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { haversineDistance } = require('./geo_distance');
const { normalizeText, tokenize, computeTitleSimilarity } = require('./text_similarity');

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
 * Classifies municipality compatibility.
 */
function classifyMunicipalityCompatibility(expectedMuni, cLookup, adjacencyData) {
    if (!expectedMuni || !cLookup) {
        return 'municipality_unknown';
    }
    if (cLookup.lookup_status === 'outside_prefecture') {
        return 'municipality_outside_prefecture';
    }
    if (expectedMuni === cLookup.primary_municipality_name) {
        return 'municipality_exact';
    }
    if (cLookup.municipality_matches && cLookup.municipality_matches.some(m => m.name === expectedMuni)) {
        return 'municipality_boundary_compatible';
    }
    if (cLookup.primary_municipality_name && areAdjacent(expectedMuni, cLookup.primary_municipality_name, adjacencyData)) {
        return 'municipality_adjacent';
    }
    return 'municipality_mismatch';
}

/**
 * Checks if mountainName matches targetText, handling Japanese short name safeguards.
 */
function isNameMatch(mountainName, targetText) {
    if (!mountainName || !targetText) return false;
    const normM = normalizeText(mountainName);
    const normText = normalizeText(targetText);
    
    if (normText.includes(normM)) {
        if (normM.length > 2) return true;
        // For short names (length <= 2), verify it's not an accidental substring of a different word.
        const tokens = tokenize(normText);
        if (tokens.includes(normM)) return true;
        
        const suffixes = ['山', '岳', '峯', '峰', '山頂', '山脈', '森', '峠', '寺', '島'];
        for (const token of tokens) {
            if (token === normM) return true;
            for (const suff of suffixes) {
                if (token === normM + suff || token === suff + normM) return true;
            }
        }
    }
    return false;
}

/**
 * Classifies name evidence.
 */
function classifyNameEvidence(mountainName, candidate, activityTitles) {
    const normM = normalizeText(mountainName);
    
    if (isNameMatch(mountainName, candidate.track_name)) {
        return { tier: 'name_exact_track_contains', sources: ['gpx_track_name'] };
    }
    
    if (activityTitles && activityTitles.some(t => isNameMatch(mountainName, t))) {
        return { tier: 'name_exact_activity_title_contains', sources: ['yamap_activity_title'] };
    }
    
    if (isNameMatch(mountainName, candidate.waypoint_name) || isNameMatch(mountainName, candidate.waypoint_desc)) {
        return { tier: 'name_explicit_activity_mountain_names', sources: ['gpx_waypoint'] };
    }
    
    // Fallback to token similarity score
    const simTrack = computeTitleSimilarity(mountainName, candidate.track_name);
    let maxScore = simTrack.score;
    let maxSource = 'gpx_track_name';
    
    if (activityTitles) {
        activityTitles.forEach(t => {
            const sim = computeTitleSimilarity(mountainName, t);
            if (sim.score > maxScore) {
                maxScore = sim.score;
                maxSource = 'yamap_activity_title';
            }
        });
    }
    
    if (maxScore >= 0.4) {
        return { tier: 'name_token_containment_strong', sources: [maxSource] };
    }
    
    if (maxScore >= 0.15) {
        return { tier: 'name_weak', sources: [maxSource] };
    }
    
    return { tier: 'name_missing', sources: [] };
}

/**
 * Executes the Gemini-grounded balanced mountain summit assignment logic.
 */
async function performAssignment(inputs) {
    // 1. Load datasets
    const mountains = JSON.parse(fs.readFileSync(inputs.mountains, 'utf8'));
    const summitCandidates = await parseJsonl(inputs.summitCandidates);
    const groundingIndex = await parseJsonl(inputs.groundingReference);
    const municipalityLookup = await parseJsonl(inputs.municipalityLookup);
    const municipalityStability = await parseJsonl(inputs.municipalityStability);
    const adjacencyData = JSON.parse(fs.readFileSync(inputs.municipalityAdjacency, 'utf8'));
    
    // Load optional activity title links
    let activityLinksMap = new Map();
    if (inputs.activityLinks && fs.existsSync(inputs.activityLinks)) {
        const activityLinks = await parseJsonl(inputs.activityLinks);
        activityLinks.forEach(link => {
            activityLinksMap.set(link.gpx_basename, link);
        });
    }

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
            mountain_name: mountainName,
            name_evidence_tier: 'name_missing',
            name_evidence_sources: []
        };
        const evidenceMunicipality = {
            expected_municipality: m.location ? m.location.municipality : null,
            expected_municipality_or_island: m.location ? m.location.municipality_or_island : null,
            expected_island: m.location ? m.location.island : null,
            compatibility: 'municipality_unknown'
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
        const evidenceActivityLink = {
            best_title: null,
            titles: []
        };

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
            reviewCategory = 'conflict_case';
            needsReview = true;
            reasonCodes.push('gemini_coordinate_conflict');
            notes = 'Gemini grounding index indicates a coordinate conflict across raw responses. Proposing no coordinate to avoid false consensus.';
        } else if (grounding && grounding.has_usable_coordinate) {
            const gLat = grounding.selected_grounding_lat;
            const gLon = grounding.selected_grounding_lon;

            // Search GPX summit candidates within 1000m
            const closeCandidates = [];

            for (const c of summitCandidates) {
                const dist = haversineDistance(gLat, gLon, c.lat, c.lon);
                if (dist <= 1000) {
                    const scoreGrounding = grounding.selected_grounding_confidence_score || 0.5;

                    let scoreSpatial = 0.0;
                    if (dist <= 50) scoreSpatial = 1.0;
                    else if (dist <= 150) scoreSpatial = 0.8;
                    else if (dist <= 300) scoreSpatial = 0.6;
                    else if (dist <= 500) scoreSpatial = 0.4;
                    else scoreSpatial = 0.2;

                    // Load activity titles for this GPX
                    const actLink = activityLinksMap.get(c.source_gpx_basename);
                    const titles = [];
                    if (actLink) {
                        if (actLink.best_candidate && actLink.best_candidate.title) {
                            titles.push(actLink.best_candidate.title);
                        }
                        if (actLink.title_enriched_candidate_activities) {
                            actLink.title_enriched_candidate_activities.forEach(act => {
                                if (act.title) titles.push(act.title);
                            });
                        }
                    }
                    const uniqueTitles = Array.from(new Set(titles));

                    // Name evidence
                    const nameClassifier = classifyNameEvidence(mountainName, c, uniqueTitles);
                    let scoreName = 0.0;
                    if (['name_exact_track_contains', 'name_exact_activity_title_contains', 'name_explicit_activity_mountain_names'].includes(nameClassifier.tier)) {
                        scoreName = 1.0;
                    } else if (nameClassifier.tier === 'name_token_containment_strong') {
                        scoreName = 0.8;
                    } else if (nameClassifier.tier === 'name_weak') {
                        scoreName = 0.3;
                    }

                    // Municipality evidence
                    const cLookup = mLookupMap.get(c.summit_candidate_id);
                    const expectedMuni = m.location ? m.location.municipality : null;
                    const muniComp = classifyMunicipalityCompatibility(expectedMuni, cLookup, adjacencyData);
                    
                    let scoreMuni = 0.0;
                    if (muniComp === 'municipality_exact') scoreMuni = 1.0;
                    else if (muniComp === 'municipality_boundary_compatible') scoreMuni = 0.9;
                    else if (muniComp === 'municipality_adjacent') scoreMuni = 0.5;
                    else if (muniComp === 'municipality_unknown') scoreMuni = 0.5;

                    // Elevation evidence
                    let scoreEle = 0.5;
                    if (csvEle && c.ele_m) {
                        const eleDiff = Math.abs(csvEle - c.ele_m);
                        if (eleDiff <= 10) scoreEle = 1.0;
                        else if (eleDiff <= 50) scoreEle = 0.8;
                        else if (eleDiff <= 100) scoreEle = 0.5;
                        else if (eleDiff <= 200) scoreEle = 0.2;
                        else scoreEle = 0.0;
                    }

                    // CSV coordinate compatibility
                    let scoreCsv = 0.5;
                    if (csvLat && csvLon) {
                        const distToCsv = haversineDistance(csvLat, csvLon, c.lat, c.lon);
                        if (distToCsv <= 100) scoreCsv = 1.0;
                        else if (distToCsv <= 500) scoreCsv = 0.8;
                        else if (distToCsv <= 1000) scoreCsv = 0.6;
                        else if (distToCsv <= 2000) scoreCsv = 0.3;
                        else scoreCsv = 0.0;
                    }

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
                        muniComp,
                        nameClassifier,
                        uniqueTitles,
                        cLookup
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
                    review_reason_codes: []
                });
            });

            if (closeCandidates.length > 0) {
                // Sort by combined score descending, then closest distance
                closeCandidates.sort((a, b) => {
                    if (Math.abs(a.score - b.score) > 0.0001) {
                        return b.score - a.score;
                    }
                    return a.distance - b.distance;
                });

                const best = closeCandidates[0];
                best.selectedForAssignment = true;

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

                // Distance checks
                if (csvLat && csvLon) {
                    distCsvToProposed = Number(haversineDistance(csvLat, csvLon, proposedLat, proposedLon).toFixed(1));
                    if (distCsvToProposed > 2000) {
                        reasonCodes.push('csv_coordinate_mismatch');
                    }
                }

                // Elevation checks
                if (csvEle && proposedEle) {
                    eleDiffCsvToProposed = Number((csvEle - proposedEle).toFixed(1));
                    if (Math.abs(eleDiffCsvToProposed) > 200) {
                        reasonCodes.push('csv_elevation_mismatch');
                    }
                }

                // Populate evidence
                evidenceGpx = {
                    id: proposedCandidateId,
                    lat: proposedLat,
                    lon: proposedLon,
                    ele_m: proposedEle,
                    gpx_basename: sourceGpxBasename,
                    gpx_path: sourceGpxPath,
                    track_name: best.candidate.track_name
                };

                evidenceName.name_evidence_tier = best.nameClassifier.tier;
                evidenceName.name_evidence_sources = best.nameClassifier.sources;

                evidenceMunicipality.compatibility = best.muniComp;
                if (best.cLookup) {
                    evidenceMunicipality.candidate_lookup = {
                        primary_name: best.cLookup.primary_municipality_name,
                        primary_code: best.cLookup.primary_municipality_code,
                        matches: best.cLookup.municipality_matches
                    };
                }

                const cStability = mStabilityMap.get(proposedCandidateId);
                if (cStability) {
                    evidenceMunicipality.candidate_stability = {
                        stability: cStability.municipality_stability,
                        reason_codes: cStability.municipality_stability_reason_codes,
                        boundary_distance_m: cStability.center_distance_to_boundary_m
                    };
                }

                const actLink = activityLinksMap.get(sourceGpxBasename);
                if (actLink) {
                    evidenceActivityLink.best_title = actLink.best_candidate ? actLink.best_candidate.title : null;
                    evidenceActivityLink.titles = best.uniqueTitles;
                }

                // Compatibility classification
                const isNameStrong = ['name_exact_track_contains', 'name_exact_activity_title_contains', 'name_explicit_activity_mountain_names', 'name_token_containment_strong'].includes(best.nameClassifier.tier);
                
                if (best.nameClassifier.tier === 'name_missing' || best.nameClassifier.tier === 'name_contradiction') {
                    reasonCodes.push('name_mismatch');
                } else if (best.nameClassifier.tier === 'name_weak') {
                    reasonCodes.push('name_compatibility_warning');
                }

                if (best.muniComp === 'municipality_mismatch') {
                    reasonCodes.push('municipality_mismatch');
                } else if (best.muniComp === 'municipality_outside_prefecture') {
                    reasonCodes.push('municipality_outside_prefecture');
                } else if (best.muniComp === 'municipality_adjacent') {
                    reasonCodes.push('municipality_adjacent_warning');
                }

                // Check for strict near-tie
                let nearTieConflict = false;
                if (closeCandidates.length > 1) {
                    const second = closeCandidates[1];
                    const scoreDiff = best.score - second.score;
                    
                    const sameSupportTier = (best.tier === second.tier);
                    const bothNear = (best.distance <= 150 && second.distance <= 150);
                    const secondStrongName = ['name_exact_track_contains', 'name_exact_activity_title_contains', 'name_explicit_activity_mountain_names', 'name_token_containment_strong'].includes(second.nameClassifier.tier);
                    
                    if (scoreDiff <= 0.03 && sameSupportTier) {
                        nearTieConflict = true;
                    } else if (bothNear && isNameStrong && secondStrongName) {
                        nearTieConflict = true;
                    } else if (second.distance <= best.distance + 50 && secondStrongName) {
                        // second candidate is very close and has strong name evidence
                        nearTieConflict = true;
                    }
                }

                if (nearTieConflict) {
                    reasonCodes.push('multiple_strong_candidates_conflict');
                }

                // Bounds check
                const outsidePrefecture = (proposedLat < 32.0 || proposedLat > 34.5 || proposedLon < 132.0 || proposedLon > 133.8);

                // Category Classification
                if (reasonCodes.includes('multiple_strong_candidates_conflict') || reasonCodes.includes('municipality_mismatch') || reasonCodes.includes('municipality_outside_prefecture') || outsidePrefecture) {
                    reviewCategory = 'conflict_case';
                    needsReview = true;
                } else if (best.distance <= 150 && !grounding.coordinate_conflict && (best.muniComp === 'municipality_exact' || best.muniComp === 'municipality_boundary_compatible' || (best.muniComp === 'municipality_adjacent' && isNameStrong)) && isNameStrong && !reasonCodes.includes('csv_coordinate_mismatch') && !reasonCodes.includes('csv_elevation_mismatch') && !reasonCodes.includes('name_mismatch') && !reasonCodes.includes('name_compatibility_warning')) {
                    reviewCategory = 'auto_supported_not_canonical';
                    needsReview = false;
                } else if (best.distance <= 500 && (best.muniComp === 'municipality_exact' || best.muniComp === 'municipality_boundary_compatible' || best.muniComp === 'municipality_adjacent' || best.muniComp === 'municipality_unknown') && (isNameStrong || best.nameClassifier.tier === 'name_weak') && !reasonCodes.includes('csv_coordinate_mismatch') && !reasonCodes.includes('csv_elevation_mismatch')) {
                    reviewCategory = 'quick_review_recommended';
                    needsReview = true;
                } else {
                    reviewCategory = 'manual_review_required';
                    needsReview = true;
                    if (best.distance > 500) {
                        reasonCodes.push('gpx_distant_support');
                    }
                }
            } else {
                // Propose Gemini directly
                proposedLat = gLat;
                proposedLon = gLon;
                proposedEle = grounding.selected_grounding_elevation_m;
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
            // Fallback checking
            if (!grounding) {
                reasonCodes.push('no_grounding_reference');
                notes = 'No grounding reference record found for this mountain.';
            }
            let fallbackSuccess = false;
            if (csvLat && csvLon) {
                const csvCloseCandidates = [];
                for (const c of summitCandidates) {
                    const dist = haversineDistance(csvLat, csvLon, c.lat, c.lon);
                    if (dist <= 500) {
                        const cLookup = mLookupMap.get(c.summit_candidate_id);
                        const expectedMuni = m.location ? m.location.municipality : null;
                        const muniComp = classifyMunicipalityCompatibility(expectedMuni, cLookup, adjacencyData);
                        const muniMatch = ['municipality_exact', 'municipality_boundary_compatible', 'municipality_adjacent'].includes(muniComp);

                        // Load activity titles for this GPX
                        const actLink = activityLinksMap.get(c.source_gpx_basename);
                        const titles = [];
                        if (actLink) {
                            if (actLink.best_candidate && actLink.best_candidate.title) {
                                titles.push(actLink.best_candidate.title);
                            }
                            if (actLink.title_enriched_candidate_activities) {
                                actLink.title_enriched_candidate_activities.forEach(act => {
                                    if (act.title) titles.push(act.title);
                                });
                            }
                        }
                        const uniqueTitles = Array.from(new Set(titles));

                        const nameClassifier = classifyNameEvidence(mountainName, c, uniqueTitles);
                        const nameMatch = ['name_exact_track_contains', 'name_exact_activity_title_contains', 'name_explicit_activity_mountain_names', 'name_token_containment_strong'].includes(nameClassifier.tier);

                        if (nameMatch && muniMatch) {
                            csvCloseCandidates.push({
                                candidate: c,
                                distance: dist,
                                nameClassifier,
                                muniComp,
                                cLookup,
                                uniqueTitles
                            });
                        }
                    }
                }

                if (csvCloseCandidates.length > 0) {
                    csvCloseCandidates.sort((a, b) => a.distance - b.distance);
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
                    confidence = 0.35;
                    needsReview = true;
                    reviewCategory = 'manual_review_required';
                    reasonCodes.push('csv_fallback_assignment');
                    notes = 'Gemini grounding unavailable. Fell back to GPX candidate supported by name similarity and expected municipality.';

                    evidenceGpx = {
                        id: proposedCandidateId,
                        lat: proposedLat,
                        lon: proposedLon,
                        ele_m: proposedEle,
                        gpx_basename: sourceGpxBasename,
                        gpx_path: sourceGpxPath,
                        track_name: fallback.candidate.track_name
                    };

                    evidenceName.name_evidence_tier = fallback.nameClassifier.tier;
                    evidenceName.name_evidence_sources = fallback.nameClassifier.sources;

                    evidenceMunicipality.compatibility = fallback.muniComp;
                    if (fallback.cLookup) {
                        evidenceMunicipality.candidate_lookup = {
                            primary_name: fallback.cLookup.primary_municipality_name,
                            primary_code: fallback.cLookup.primary_municipality_code,
                            matches: fallback.cLookup.municipality_matches
                        };
                    }

                    const cStability = mStabilityMap.get(proposedCandidateId);
                    if (cStability) {
                        evidenceMunicipality.candidate_stability = {
                            stability: cStability.municipality_stability,
                            reason_codes: cStability.municipality_stability_reason_codes,
                            boundary_distance_m: cStability.center_distance_to_boundary_m
                        };
                    }

                    const actLink = activityLinksMap.get(sourceGpxBasename);
                    if (actLink) {
                        evidenceActivityLink.best_title = actLink.best_candidate ? actLink.best_candidate.title : null;
                        evidenceActivityLink.titles = fallback.uniqueTitles;
                    }

                    fallbackSuccess = true;
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
                activity_link: evidenceActivityLink,
                legacy_candidate_links: {}
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
    performAssignment,
    classifyMunicipalityCompatibility,
    classifyNameEvidence
};

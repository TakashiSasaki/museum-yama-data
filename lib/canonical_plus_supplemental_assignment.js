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
 * Normalizes a path to be repository-relative.
 */
function toRepoRelative(p, workspaceRoot = '.') {
    if (!p) return p;
    let clean = p.replace(/\\/g, '/');
    const marker = 'museum-yama-data/';
    const index = clean.indexOf(marker);
    if (index !== -1) {
        return clean.slice(index + marker.length);
    }
    if (path.isAbsolute(p)) {
        const resolvedRoot = path.resolve(workspaceRoot);
        const resolvedPath = path.resolve(p);
        if (resolvedPath.startsWith(resolvedRoot)) {
            return path.relative(resolvedRoot, resolvedPath).replace(/\\/g, '/');
        }
    }
    return clean;
}

/**
 * Main entry point for Stage 31 Downstream Assignment experiment.
 */
async function performAssignment(inputs) {
    const workspaceRoot = inputs.workspaceRoot || '.';
    
    // 1. Load datasets
    const mountains = JSON.parse(fs.readFileSync(inputs.mountains, 'utf8'));
    const canonicalCandidates = await parseJsonl(inputs.canonicalSummitCandidates);
    const supplementalCandidates = await parseJsonl(inputs.supplementalCandidates);
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

    // Load optional Stage 28 balanced assignments for comparison/evidence
    let stage28AssignmentsMap = new Map();
    if (inputs.stage28Assignments && fs.existsSync(inputs.stage28Assignments)) {
        const stage28 = await parseJsonl(inputs.stage28Assignments);
        stage28.forEach(a => {
            stage28AssignmentsMap.set(a.mountain_no, a);
        });
    }

    // Load optional Stage 28 candidate support links
    let stage28CandidateSupportMap = new Map();
    if (inputs.stage28CandidateSupport && fs.existsSync(inputs.stage28CandidateSupport)) {
        const support = await parseJsonl(inputs.stage28CandidateSupport);
        support.forEach(s => {
            stage28CandidateSupportMap.set(`${s.mountain_no}_${s.summit_candidate_id}`, s);
        });
    }

    // Create maps for efficient joining
    const groundingMap = new Map();
    groundingIndex.forEach(g => groundingMap.set(g.mountain_no, g));

    const mLookupMap = new Map();
    municipalityLookup.forEach(m => mLookupMap.set(m.source_record_id, m));

    const mStabilityMap = new Map();
    municipalityStability.forEach(s => mStabilityMap.set(s.summit_candidate_id, s));

    const supplementalMap = new Map();
    supplementalCandidates.forEach(sc => {
        supplementalMap.set(sc.mountain_no, sc);
    });

    // 2. Precompute Duplicate Check for all supplemental candidates (30m duplicate policy)
    // Checks supplemental candidate coordinates against ALL canonical candidates.
    const supplementalDuplicateMap = new Map();
    supplementalCandidates.forEach(sc => {
        let minDistance = null;
        let closestCcId = null;
        for (const cc of canonicalCandidates) {
            const d = haversineDistance(sc.nearest_trackpoint_lat, sc.nearest_trackpoint_lon, cc.lat, cc.lon);
            if (minDistance === null || d < minDistance) {
                minDistance = d;
                closestCcId = cc.summit_candidate_id;
            }
        }
        const isDuplicate = (minDistance !== null && minDistance <= 30.0);
        supplementalDuplicateMap.set(sc.supplemental_candidate_id, {
            isDuplicate,
            duplicateCanonicalId: isDuplicate ? closestCcId : null,
            distance: minDistance
        });
    });

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
        const stage28Assign = stage28AssignmentsMap.get(mountainNo);

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
        const evidenceActivityTitle = {
            best_title: null,
            titles: []
        };

        const evidenceStage28 = stage28Assign ? {
            proposed_lat: stage28Assign.proposed_lat,
            proposed_lon: stage28Assign.proposed_lon,
            proposed_ele_m: stage28Assign.proposed_ele_m,
            proposed_coordinate_source: stage28Assign.proposed_coordinate_source,
            proposed_candidate_id: stage28Assign.proposed_summit_candidate_id,
            review_category: stage28Assign.review_category,
            needs_human_review: stage28Assign.needs_human_review,
            review_reason_codes: stage28Assign.review_reason_codes
        } : null;

        // Default outputs
        let proposedLat = null;
        let proposedLon = null;
        let proposedEle = null;
        let proposedSource = null;
        let proposedCandidateId = null;
        let proposedCandidateType = null;
        let canonicalSummitCandidateId = null;
        let supplementalCandidateId = null;
        let supplementalDuplicateOfCanonicalCandidateId = null;
        let distanceSupplementalToCanonicalM = null;
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
        let evidenceCanonical = null;
        let evidenceSupplemental = null;
        let evidenceDuplicateResolution = {
            classification: 'no_supplemental_candidate',
            supplemental_candidate_id: null,
            canonical_candidate_id: null,
            distance_supplemental_to_canonical_m: null
        };
        let evidenceStage30 = null;
        let notes = '';

        // Check if supplemental candidate exists for this mountain
        const sc = supplementalMap.get(mountainNo);
        if (sc) {
            const dupInfo = supplementalDuplicateMap.get(sc.supplemental_candidate_id);
            supplementalCandidateId = sc.supplemental_candidate_id;
            
            // Populate supplemental evidence metadata
            evidenceStage30 = {
                local_peak_like_score: sc.local_peak_like_score,
                candidate_generation_reason_codes: sc.candidate_generation_reason_codes,
                local_window_trackpoint_count: sc.local_window_trackpoint_count,
                local_window_max_ele_m: sc.local_window_max_ele_m,
                local_window_min_ele_m: sc.local_window_min_ele_m,
                local_window_ele_range_m: sc.local_window_ele_range_m,
                local_window_distance_radius_m: sc.local_window_distance_radius_m
            };

            evidenceDuplicateResolution = {
                classification: dupInfo.isDuplicate ? 'duplicate_of_canonical' : 'non_duplicate',
                supplemental_candidate_id: sc.supplemental_candidate_id,
                canonical_candidate_id: dupInfo.duplicateCanonicalId,
                distance_supplemental_to_canonical_m: dupInfo.distance !== null ? Number(dupInfo.distance.toFixed(3)) : null
            };

            if (dupInfo.isDuplicate) {
                // Duplicate supplemental candidate -> prefer canonical candidate
                const cc = canonicalCandidates.find(c => c.summit_candidate_id === dupInfo.duplicateCanonicalId);
                if (cc) {
                    proposedLat = cc.lat;
                    proposedLon = cc.lon;
                    proposedEle = cc.ele_m;
                    proposedSource = 'gpx_summit_candidate';
                    proposedCandidateId = cc.summit_candidate_id;
                    proposedCandidateType = 'canonical_summit_candidate';
                    canonicalSummitCandidateId = cc.summit_candidate_id;
                    supplementalDuplicateOfCanonicalCandidateId = cc.summit_candidate_id;
                    distanceSupplementalToCanonicalM = Number(dupInfo.distance.toFixed(3));
                    sourceGpxBasename = cc.source_gpx_basename;
                    sourceGpxPath = toRepoRelative(cc.source_gpx_path, workspaceRoot);
                    if (grounding && grounding.has_usable_coordinate) {
                        distGeminiToProposed = Number(haversineDistance(grounding.selected_grounding_lat, grounding.selected_grounding_lon, proposedLat, proposedLon).toFixed(1));
                    }
                    status = 'assigned';
                    reviewCategory = 'canonical_preferred_over_duplicate_supplemental';
                    needsReview = true;
                    reasonCodes.push('supplemental_duplicate');
                    notes = `Preferred canonical candidate ${cc.summit_candidate_id} over duplicate supplemental candidate within 30m (distance: ${distanceSupplementalToCanonicalM}m).`;
                    
                    evidenceCanonical = {
                        id: cc.summit_candidate_id,
                        lat: cc.lat,
                        lon: cc.lon,
                        ele_m: cc.ele_m,
                        gpx_basename: cc.source_gpx_basename,
                        gpx_path: toRepoRelative(cc.source_gpx_path, workspaceRoot),
                        track_name: cc.track_name
                    };

                    // Name evidence
                    const actLink = activityLinksMap.get(cc.source_gpx_basename);
                    const titles = [];
                    if (actLink) {
                        if (actLink.best_candidate && actLink.best_candidate.title) titles.push(actLink.best_candidate.title);
                        if (actLink.title_enriched_candidate_activities) {
                            actLink.title_enriched_candidate_activities.forEach(act => {
                                if (act.title) titles.push(act.title);
                            });
                        }
                    }
                    const uniqueTitles = Array.from(new Set(titles));
                    const nameClassifier = classifyNameEvidence(mountainName, cc, uniqueTitles);
                    evidenceName.name_evidence_tier = nameClassifier.tier;
                    evidenceName.name_evidence_sources = nameClassifier.sources;

                    // Muni compatibility
                    const cLookup = mLookupMap.get(cc.summit_candidate_id);
                    const expectedMuni = m.location ? m.location.municipality : null;
                    const muniComp = classifyMunicipalityCompatibility(expectedMuni, cLookup, adjacencyData);
                    evidenceMunicipality.compatibility = muniComp;

                    // Stage 28 balanced confidence approximation
                    confidence = 0.8; 
                }
            } else {
                // Non-duplicate supplemental candidate -> fallback proposal
                proposedLat = sc.nearest_trackpoint_lat;
                proposedLon = sc.nearest_trackpoint_lon;
                proposedEle = sc.nearest_trackpoint_ele_m;
                proposedSource = 'supplemental_gemini_near_gpx_point';
                proposedCandidateId = sc.supplemental_candidate_id;
                proposedCandidateType = 'supplemental_gemini_near_gpx_point';
                canonicalSummitCandidateId = null;
                supplementalDuplicateOfCanonicalCandidateId = null;
                distanceSupplementalToCanonicalM = Number(dupInfo.distance.toFixed(3));
                sourceGpxBasename = sc.source_gpx_basename;
                sourceGpxPath = toRepoRelative(sc.source_gpx_path, workspaceRoot);
                if (grounding && grounding.has_usable_coordinate) {
                    distGeminiToProposed = Number(haversineDistance(grounding.selected_grounding_lat, grounding.selected_grounding_lon, proposedLat, proposedLon).toFixed(1));
                }
                status = 'assigned';
                reviewCategory = 'supplemental_fallback_review_required';
                needsReview = true;
                reasonCodes.push('supplemental_unverified');
                notes = 'Proposing non-canonical supplemental candidate as fallback coordinate source.';
                
                evidenceSupplemental = {
                    id: sc.supplemental_candidate_id,
                    lat: sc.nearest_trackpoint_lat,
                    lon: sc.nearest_trackpoint_lon,
                    ele_m: sc.nearest_trackpoint_ele_m,
                    gpx_basename: sc.source_gpx_basename,
                    gpx_path: toRepoRelative(sc.source_gpx_path, workspaceRoot)
                };

                confidence = sc.gemini_grounding_confidence || 0.5;
            }
        } else {
            // No supplemental candidate -> fallback to balanced assignment logic
            if (!grounding) {
                reasonCodes.push('no_grounding_reference');
                notes = 'No grounding reference record found for this mountain.';
            } else if (grounding.coordinate_conflict) {
                reviewCategory = 'conflict_case';
                needsReview = true;
                reasonCodes.push('gemini_coordinate_conflict');
                notes = 'Gemini grounding index indicates a coordinate conflict across raw responses. Proposing no coordinate to avoid false consensus.';
            } else if (grounding.has_usable_coordinate) {
                const gLat = grounding.selected_grounding_lat;
                const gLon = grounding.selected_grounding_lon;

                // Search GPX summit candidates within 1000m
                const closeCandidates = [];

                for (const c of canonicalCandidates) {
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
                            if (actLink.best_candidate && actLink.best_candidate.title) titles.push(actLink.best_candidate.title);
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

                // Add to support links list
                closeCandidates.forEach(cc => {
                    candidateSupportLinks.push({
                        mountain_no: mountainNo,
                        mountain_name: mountainName,
                        summit_candidate_id: cc.candidate.summit_candidate_id,
                        candidate_type: 'canonical_summit_candidate',
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
                    proposedCandidateType = 'canonical_summit_candidate';
                    canonicalSummitCandidateId = best.candidate.summit_candidate_id;
                    sourceGpxBasename = best.candidate.source_gpx_basename;
                    sourceGpxPath = toRepoRelative(best.candidate.source_gpx_path, workspaceRoot);
                    distGeminiToProposed = Number(best.distance.toFixed(1));
                    confidence = best.score;
                    status = 'assigned';

                    if (csvLat && csvLon) {
                        distCsvToProposed = Number(haversineDistance(csvLat, csvLon, proposedLat, proposedLon).toFixed(1));
                        if (distCsvToProposed > 2000) reasonCodes.push('csv_coordinate_mismatch');
                    }
                    if (csvEle && proposedEle) {
                        eleDiffCsvToProposed = Number((csvEle - proposedEle).toFixed(1));
                        if (Math.abs(eleDiffCsvToProposed) > 200) reasonCodes.push('csv_elevation_mismatch');
                    }

                    evidenceCanonical = {
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
                        evidenceActivityTitle.best_title = actLink.best_candidate ? actLink.best_candidate.title : null;
                        evidenceActivityTitle.titles = best.uniqueTitles;
                    }

                    const isNameStrong = ['name_exact_track_contains', 'name_exact_activity_title_contains', 'name_explicit_activity_mountain_names', 'name_token_containment_strong'].includes(best.nameClassifier.tier);
                    if (best.nameClassifier.tier === 'name_missing') {
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
                            nearTieConflict = true;
                        }
                    }

                    if (nearTieConflict) reasonCodes.push('multiple_strong_candidates_conflict');

                    const outsidePrefecture = (proposedLat < 32.0 || proposedLat > 34.5 || proposedLon < 132.0 || proposedLon > 133.8);

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
                        if (best.distance > 500) reasonCodes.push('gpx_distant_support');
                    }
                } else {
                    // Gemini only fallback
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
                        if (distCsvToProposed > 2000) reasonCodes.push('csv_coordinate_mismatch');
                    }
                    if (csvEle && proposedEle) {
                        eleDiffCsvToProposed = Number((csvEle - proposedEle).toFixed(1));
                    }
                }
            } else {
                // CSV fallback assignment
                let fallbackSuccess = false;
                if (csvLat && csvLon) {
                    const csvCloseCandidates = [];
                    for (const c of canonicalCandidates) {
                        const dist = haversineDistance(csvLat, csvLon, c.lat, c.lon);
                        if (dist <= 500) {
                            const cLookup = mLookupMap.get(c.summit_candidate_id);
                            const expectedMuni = m.location ? m.location.municipality : null;
                            const muniComp = classifyMunicipalityCompatibility(expectedMuni, cLookup, adjacencyData);
                            const muniMatch = ['municipality_exact', 'municipality_boundary_compatible', 'municipality_adjacent'].includes(muniComp);

                            const actLink = activityLinksMap.get(c.source_gpx_basename);
                            const titles = [];
                            if (actLink) {
                                if (actLink.best_candidate && actLink.best_candidate.title) titles.push(actLink.best_candidate.title);
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
                        proposedCandidateType = 'canonical_summit_candidate';
                        canonicalSummitCandidateId = fallback.candidate.summit_candidate_id;
                        sourceGpxBasename = fallback.candidate.source_gpx_basename;
                        sourceGpxPath = toRepoRelative(fallback.candidate.source_gpx_path, workspaceRoot);
                        status = 'assigned';
                        distCsvToProposed = Number(fallback.distance.toFixed(1));
                        confidence = 0.35;
                        needsReview = true;
                        reviewCategory = 'manual_review_required';
                        reasonCodes.push('csv_fallback_assignment');
                        notes = 'Gemini grounding unavailable. Fell back to GPX candidate supported by name similarity and expected municipality.';

                        evidenceCanonical = {
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
                            evidenceActivityTitle.best_title = actLink.best_candidate ? actLink.best_candidate.title : null;
                            evidenceActivityTitle.titles = fallback.uniqueTitles;
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
        }

        // CSV coordinate difference safety checks for any coordinate assignment
        if (proposedLat !== null && csvLat !== null) {
            distCsvToProposed = Number(haversineDistance(csvLat, csvLon, proposedLat, proposedLon).toFixed(1));
        }
        if (proposedEle !== null && csvEle !== null) {
            eleDiffCsvToProposed = Number((csvEle - proposedEle).toFixed(1));
        }

        // Add to main proposed assignments list
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
            proposed_candidate_id: proposedCandidateId,
            proposed_candidate_type: proposedCandidateType,
            canonical_summit_candidate_id: canonicalSummitCandidateId,
            supplemental_candidate_id: supplementalCandidateId,
            supplemental_duplicate_of_canonical_candidate_id: supplementalDuplicateOfCanonicalCandidateId,
            distance_supplemental_to_canonical_m: distanceSupplementalToCanonicalM,
            source_gpx_basename: sourceGpxBasename,
            source_gpx_path: sourceGpxPath,
            distance_gemini_to_proposed_m: distGeminiToProposed,
            distance_csv_to_proposed_m: distCsvToProposed,
            elevation_diff_csv_to_proposed_m: eleDiffCsvToProposed,
            confidence: Number(confidence.toFixed(4)),
            needs_human_review: needsReview,
            review_reason_codes: reasonCodes,
            evidence: {
                gemini_grounding: evidenceGemini,
                canonical_summit_candidate: evidenceCanonical,
                supplemental_candidate: evidenceSupplemental,
                candidate_duplicate_resolution: evidenceDuplicateResolution,
                csv_coordinate: evidenceCsv,
                elevation: evidenceElevation,
                name: evidenceName,
                municipality: evidenceMunicipality,
                activity_title: evidenceActivityTitle,
                stage28_balanced_assignment: evidenceStage28,
                stage30_supplemental_generation: evidenceStage30
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
    classifyNameEvidence,
    toRepoRelative
};

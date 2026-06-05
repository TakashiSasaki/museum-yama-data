'use strict';
/**
 * lib/mountain_summit_candidate_location_refinement.js
 *
 * Logic for municipality/island-based refinement of mountain-to-summit candidate links.
 */

const { normalizeText } = require('./text_similarity');

function cleanPlaceName(name) {
    if (!name) return '';
    // Normalize unicode, lowercase, and remove all whitespace
    let clean = name.normalize('NFKC').trim().toLowerCase();
    clean = clean.replace(/\s+/g, '');
    return clean;
}

function stripPlaceSuffix(name) {
    if (!name) return '';
    // Strip trailing Japanese administrative place type suffixes
    return name.replace(/(市|町|村|郡|島)$/, '');
}

function extractAddressValues(address) {
    if (!address || typeof address !== 'object') return [];
    const values = [];
    const keys = ['city', 'town', 'village', 'county', 'municipality', 'quarter', 'suburb', 'city_district', 'local', 'island'];
    for (const k of keys) {
        if (address[k] && typeof address[k] === 'string') {
            values.push(cleanPlaceName(address[k]));
        }
    }
    return values;
}

function getGeocodingDetails(evidence) {
    if (!evidence) return null;

    const cities = (evidence.city_candidates || []).map(cleanPlaceName).filter(Boolean);
    const counties = (evidence.county_candidates || []).map(cleanPlaceName).filter(Boolean);
    const towns = (evidence.town_candidates || []).map(cleanPlaceName).filter(Boolean);
    const villages = (evidence.village_candidates || []).map(cleanPlaceName).filter(Boolean);
    const islands = (evidence.island_candidates || []).map(cleanPlaceName).filter(Boolean);
    const locals = (evidence.local_candidates || []).map(cleanPlaceName).filter(Boolean);
    const locationNames = (evidence.location_candidates || []).map(c => cleanPlaceName(c.location_name)).filter(Boolean);

    const nearestDisplay = cleanPlaceName(evidence.nearest_display_name);
    const nearestAddressVals = extractAddressValues(evidence.nearest_address);

    const nearbyPoints = evidence.nearby_reverse_geocoded_points || [];
    const nearbyMunicipalityTexts = [];
    const nearbyIslandTexts = [];
    const nearbyLocalTexts = [];
    const nearbyDisplayAndAddressTexts = [];

    for (const pt of nearbyPoints) {
        if (pt.city) nearbyMunicipalityTexts.push(cleanPlaceName(pt.city));
        if (pt.town) nearbyMunicipalityTexts.push(cleanPlaceName(pt.town));
        if (pt.village) nearbyMunicipalityTexts.push(cleanPlaceName(pt.village));
        if (pt.county) nearbyMunicipalityTexts.push(cleanPlaceName(pt.county));
        
        if (pt.island) nearbyIslandTexts.push(cleanPlaceName(pt.island));
        if (pt.local) nearbyLocalTexts.push(cleanPlaceName(pt.local));
        if (pt.display_name) nearbyDisplayAndAddressTexts.push(cleanPlaceName(pt.display_name));
        
        const ptAddrVals = extractAddressValues(pt.address);
        nearbyDisplayAndAddressTexts.push(...ptAddrVals);
    }

    return {
        cities, counties, towns, villages, islands, locals, locationNames,
        nearestDisplay, nearestAddressVals,
        nearbyMunicipalityTexts, nearbyIslandTexts, nearbyLocalTexts, nearbyDisplayAndAddressTexts
    };
}

function computeLocationRefinement(mountain, evidence) {
    const csvLocationRaw = mountain.location ? mountain.location.municipality_or_island : null;
    const csvMunicipalityRaw = mountain.location ? mountain.location.municipality : null;
    const csvIslandRaw = mountain.location ? mountain.location.island : null;

    const csvMunOrIsland = cleanPlaceName(csvLocationRaw);
    const csvMun = cleanPlaceName(csvMunicipalityRaw);
    const csvIsland = cleanPlaceName(csvIslandRaw);

    const evidenceDetails = getGeocodingDetails(evidence);

    let exactMunicipalityMatch = false;
    let nearbyMunicipalityMatch = false;
    let islandTextMatch = false;
    let localTextMatch = false;
    let weakAdminMatch = false;
    let boundaryToleratedMismatch = false;

    const matchedTerms = [];

    const reverse_geocoding_location_texts = evidenceDetails ? [
        evidenceDetails.nearestDisplay,
        ...evidenceDetails.nearestAddressVals,
        ...evidenceDetails.nearbyDisplayAndAddressTexts
    ].filter((v, i, self) => v && self.indexOf(v) === i) : [];

    const reverse_geocoding_municipality_candidates = evidenceDetails ? [
        ...evidenceDetails.cities,
        ...evidenceDetails.towns,
        ...evidenceDetails.villages,
        ...evidenceDetails.counties,
        ...evidenceDetails.locationNames,
        ...evidenceDetails.nearbyMunicipalityTexts
    ].filter((v, i, self) => v && self.indexOf(v) === i) : [];

    const reverse_geocoding_island_text_candidates = evidenceDetails ? [
        ...evidenceDetails.islands,
        ...evidenceDetails.nearbyIslandTexts
    ].filter((v, i, self) => v && self.indexOf(v) === i) : [];

    if (evidenceDetails) {
        const {
            cities, counties, towns, villages, islands, locals, locationNames,
            nearestDisplay, nearestAddressVals,
            nearbyMunicipalityTexts, nearbyIslandTexts, nearbyLocalTexts, nearbyDisplayAndAddressTexts
        } = evidenceDetails;

        const exactGeoMunCandidates = [...cities, ...towns, ...villages, ...counties, ...locationNames, ...nearestAddressVals];
        const exactGeoMunCandidatesStripped = exactGeoMunCandidates.map(stripPlaceSuffix);
        const csvMunStripped = stripPlaceSuffix(csvMun);

        // 1. exact_municipality_match
        if (csvMun) {
            if (exactGeoMunCandidates.includes(csvMun)) {
                exactMunicipalityMatch = true;
                matchedTerms.push(csvMun);
            } else if (csvMunStripped && exactGeoMunCandidatesStripped.includes(csvMunStripped)) {
                exactMunicipalityMatch = true;
                matchedTerms.push(csvMunStripped);
            }
        }

        // 2. island_text_match
        if (csvIsland) {
            const csvIslandStripped = stripPlaceSuffix(csvIsland);
            const allIslandTargets = [...islands, ...locals, nearestDisplay, ...nearestAddressVals, ...nearbyIslandTexts, ...nearbyLocalTexts, ...nearbyDisplayAndAddressTexts];
            
            for (const target of allIslandTargets) {
                if (!target) continue;
                if (target === csvIsland || target.includes(csvIsland)) {
                    islandTextMatch = true;
                    matchedTerms.push(csvIsland);
                    break;
                } else if (csvIslandStripped && (target === csvIslandStripped || target.includes(csvIslandStripped))) {
                    islandTextMatch = true;
                    matchedTerms.push(csvIslandStripped);
                    break;
                }
            }
        }

        // 3. nearby_municipality_match
        if (csvMun && !exactMunicipalityMatch) {
            if (nearbyMunicipalityTexts.includes(csvMun)) {
                nearbyMunicipalityMatch = true;
                matchedTerms.push(csvMun);
            } else if (csvMunStripped && nearbyMunicipalityTexts.map(stripPlaceSuffix).includes(csvMunStripped)) {
                nearbyMunicipalityMatch = true;
                matchedTerms.push(csvMunStripped);
            }
        }

        // 4. local_text_match
        if (csvMunOrIsland && !exactMunicipalityMatch && !islandTextMatch && !nearbyMunicipalityMatch) {
            const csvMunOrIslandStripped = stripPlaceSuffix(csvMunOrIsland);
            const allLocalTargets = [...locals, nearestDisplay, ...nearestAddressVals, ...nearbyLocalTexts, ...nearbyDisplayAndAddressTexts];
            
            for (const target of allLocalTargets) {
                if (!target) continue;
                if (target === csvMunOrIsland || target.includes(csvMunOrIsland)) {
                    localTextMatch = true;
                    matchedTerms.push(csvMunOrIsland);
                    break;
                } else if (csvMunOrIslandStripped && (target === csvMunOrIslandStripped || target.includes(csvMunOrIslandStripped))) {
                    localTextMatch = true;
                    matchedTerms.push(csvMunOrIslandStripped);
                    break;
                }
            }
        }

        // 5. weak_admin_match
        if (csvMun && !exactMunicipalityMatch && !nearbyMunicipalityMatch && !localTextMatch) {
            const weakGeoCandidates = [...counties, ...towns, ...villages, ...locals, ...locationNames];
            const csvMunStripped = stripPlaceSuffix(csvMun);

            for (const target of weakGeoCandidates) {
                if (!target) continue;
                const targetStripped = stripPlaceSuffix(target);
                if (target.includes(csvMun) || csvMun.includes(target) ||
                    (csvMunStripped && (target.includes(csvMunStripped) || csvMunStripped.includes(targetStripped)))) {
                    weakAdminMatch = true;
                    matchedTerms.push(target);
                    break;
                }
            }
        }

        // 6. boundary_tolerated_mismatch
        const hasCsvSearchTerms = !!(csvMun || csvIsland || csvMunOrIsland);
        const hasGeocodingData = (evidence.location_evidence_status !== 'unavailable' && exactGeoMunCandidates.length > 0);
        if (hasCsvSearchTerms && hasGeocodingData && 
            !exactMunicipalityMatch && !islandTextMatch && !nearbyMunicipalityMatch && !localTextMatch && !weakAdminMatch) {
            boundaryToleratedMismatch = true;
        }
    }

    let score = 0.00;
    let level = 'unavailable';
    const reasonCodes = [];

    if (!evidence || !(csvMun || csvIsland || csvMunOrIsland)) {
        level = 'unavailable';
        score = 0.00;
        reasonCodes.push('location_unavailable');
    } else if (exactMunicipalityMatch) {
        level = 'exact_municipality_match';
        score = 1.00;
        reasonCodes.push('exact_municipality_match');
    } else if (islandTextMatch) {
        level = 'island_text_match';
        score = 0.90;
        reasonCodes.push('island_text_match');
    } else if (nearbyMunicipalityMatch) {
        level = 'nearby_municipality_match';
        score = 0.75;
        reasonCodes.push('nearby_municipality_match');
    } else if (localTextMatch) {
        level = 'local_text_match';
        score = 0.55;
        reasonCodes.push('local_text_match');
    } else if (weakAdminMatch) {
        level = 'weak_admin_match';
        score = 0.40;
        reasonCodes.push('weak_admin_match');
    } else if (boundaryToleratedMismatch) {
        level = 'boundary_tolerated_mismatch';
        score = 0.20;
        reasonCodes.push('municipality_mismatch_warning');
    } else {
        level = 'unavailable';
        score = 0.00;
        reasonCodes.push('location_unavailable');
    }

    return {
        csv_location_raw: csvLocationRaw,
        csv_municipality_raw: csvMunicipalityRaw,
        csv_island_raw: csvIslandRaw,
        csv_location_normalized: csvMunOrIsland,
        csv_municipality_normalized: csvMun,
        csv_island_normalized: csvIsland,
        reverse_geocoding_location_texts,
        reverse_geocoding_municipality_candidates,
        reverse_geocoding_island_text_candidates,
        exact_municipality_match: exactMunicipalityMatch,
        nearby_municipality_match: nearbyMunicipalityMatch,
        island_text_match: islandTextMatch,
        local_text_match: localTextMatch,
        weak_admin_match: weakAdminMatch,
        boundary_tolerated_mismatch: boundaryToleratedMismatch,
        location_refinement_score: score,
        location_refinement_level: level,
        location_refinement_reason_codes: reasonCodes,
        matched_terms: matchedTerms,
        nearest_display_name: evidence ? evidence.nearest_display_name : null,
        nearest_address: evidence ? evidence.nearest_address : null,
    };
}

function refineScoresAndRanks(links, mountains, locationEvidences) {
    const mountainMap = new Map();
    for (const m of mountains) {
        mountainMap.set(m.mountain_no, m);
    }

    const evidenceMap = new Map();
    for (const ev of locationEvidences) {
        evidenceMap.set(ev.summit_candidate_id, ev);
    }

    const refinedLinks = [];

    // 1. Compute refinement objects and scores
    for (const link of links) {
        const mountain = mountainMap.get(link.mountain_no);
        const evidence = link.summit_candidate_id ? evidenceMap.get(link.summit_candidate_id) : null;

        if (!mountain) {
            throw new Error(`Link references unknown mountain_no: ${link.mountain_no}`);
        }

        const refined = { ...link };

        if (!refined.summit_candidate_id) {
            refined.location_refinement = {
                csv_location_raw: mountain.location ? mountain.location.municipality_or_island : null,
                csv_municipality_raw: mountain.location ? mountain.location.municipality : null,
                csv_island_raw: mountain.location ? mountain.location.island : null,
                csv_location_normalized: '',
                csv_municipality_normalized: '',
                csv_island_normalized: '',
                reverse_geocoding_location_texts: [],
                reverse_geocoding_municipality_candidates: [],
                reverse_geocoding_island_text_candidates: [],
                exact_municipality_match: false,
                nearby_municipality_match: false,
                island_text_match: false,
                local_text_match: false,
                weak_admin_match: false,
                boundary_tolerated_mismatch: false,
                location_refinement_score: 0.00,
                location_refinement_level: 'unavailable',
                location_refinement_reason_codes: ['location_unavailable'],
                matched_terms: [],
                nearest_display_name: null,
                nearest_address: null,
            };
            refined.location_refined_candidate_score = 0.00;
            refined.location_refined_rank_for_mountain = null;
            refined.location_refined_rank_for_summit_candidate = null;
            refined.review_priority = 'high';
            refined.review_priority_reason_codes = ['no_candidate_for_mountain'];
            refinedLinks.push(refined);
            continue;
        }

        const refinementObj = computeLocationRefinement(mountain, evidence);
        refined.location_refinement = refinementObj;
        refined.location_refined_candidate_score = Number((0.85 * refined.combined_candidate_score + 0.15 * refinementObj.location_refinement_score).toFixed(6));
        
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
            const scoreDiff = b.location_refined_candidate_score - a.location_refined_candidate_score;
            if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
            // Alphabetical tie-break
            return a.summit_candidate_id.localeCompare(b.summit_candidate_id);
        });
        for (let i = 0; i < group.length; i++) {
            group[i].location_refined_rank_for_mountain = i + 1;
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
            const scoreDiff = b.location_refined_candidate_score - a.location_refined_candidate_score;
            if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
            // Numerical tie-break by mountain_no
            return a.mountain_no - b.mountain_no;
        });
        for (let i = 0; i < group.length; i++) {
            group[i].location_refined_rank_for_summit_candidate = i + 1;
        }
    }

    // 4. Precalculate top-ranked count per candidate (for top-ranked for multiple mountains check)
    const topRankedMountainCountPerCandidate = new Map();
    for (const link of refinedLinks) {
        if (link.location_refined_rank_for_mountain === 1 && link.summit_candidate_id) {
            const prev = topRankedMountainCountPerCandidate.get(link.summit_candidate_id) || 0;
            topRankedMountainCountPerCandidate.set(link.summit_candidate_id, prev + 1);
        }
    }

    // 5. Assign priorities
    const candidateCountPerMountain = new Map();
    for (const link of refinedLinks) {
        if (link.summit_candidate_id) {
            const prev = candidateCountPerMountain.get(link.mountain_no) || 0;
            candidateCountPerMountain.set(link.mountain_no, prev + 1);
        }
    }

    const mountainCountPerCandidate = new Map();
    for (const link of refinedLinks) {
        if (link.summit_candidate_id) {
            const prev = mountainCountPerCandidate.get(link.summit_candidate_id) || 0;
            mountainCountPerCandidate.set(link.summit_candidate_id, prev + 1);
        }
    }

    for (const link of refinedLinks) {
        if (!link.summit_candidate_id) {
            continue;
        }

        const mountainNo = link.mountain_no;
        const candidateId = link.summit_candidate_id;

        const candidateCountForMountain = candidateCountPerMountain.get(mountainNo) || 0;
        const rankForMountain = link.location_refined_rank_for_mountain;

        const originalNameTier = link.evidence?.name?.name_tier || 'none';
        const originalElevationTier = link.evidence?.elevation?.elevation_tier || 'unavailable';
        const locationRefinementLevel = link.location_refinement.location_refinement_level;
        const locationRefinementScore = link.location_refinement.location_refinement_score;

        const isAmbiguousTop1 = (rankForMountain === 1 && candidateCountForMountain > 1);
        
        const hasStrongNameOrElevation = (originalNameTier === 'strong' || 
                                          originalElevationTier === 'strong' || 
                                          originalElevationTier === 'medium');
        const hasMismatch = (locationRefinementLevel === 'boundary_tolerated_mismatch');
        const isStrongEvidenceWithMismatch = (hasStrongNameOrElevation && hasMismatch);

        const isTopRankedForMultiple = ((topRankedMountainCountPerCandidate.get(candidateId) || 0) > 1);

        let priority = 'low';
        const priorityReasonCodes = [];

        // Check High Priority
        if (isAmbiguousTop1) {
            priority = 'high';
            priorityReasonCodes.push('top_1_but_ambiguous');
        }
        if (isStrongEvidenceWithMismatch) {
            priority = 'high';
            priorityReasonCodes.push('strong_evidence_with_mismatch');
        }
        if (isTopRankedForMultiple) {
            priority = 'high';
            priorityReasonCodes.push('top_candidate_for_multiple_mountains');
        }

        // Check Medium Priority (if not already high)
        if (priority !== 'high') {
            const isTop3 = (rankForMountain <= 3);
            const hasUsefulEvidence = (originalNameTier !== 'none' || 
                                       (originalElevationTier !== 'warning' && originalElevationTier !== 'unavailable') || 
                                       locationRefinementScore >= 0.4);
            if (isTop3 && hasUsefulEvidence) {
                priority = 'medium';
                priorityReasonCodes.push('top_3_with_evidence');
            }
        }

        // Check Deprioritized (if not high/medium)
        if (priority !== 'high' && priority !== 'medium') {
            const isLowOriginalScore = (link.combined_candidate_score < 0.4 || link.confidence === 'low' || link.confidence === 'none');
            const noLocationSupport = (locationRefinementScore <= 0.2);
            const weakName = (originalNameTier === 'none' || originalNameTier === 'weak');
            const notTop3 = (rankForMountain > 3);

            if (isLowOriginalScore && noLocationSupport && weakName && notTop3) {
                priority = 'deprioritized';
                priorityReasonCodes.push('deprioritized_no_support');
            }
        }

        // Default to low if not classified as high, medium, or deprioritized
        if (priority !== 'high' && priority !== 'medium' && priority !== 'deprioritized') {
            priority = 'low';
            priorityReasonCodes.push('weak_confidence_no_strong_evidence');
        }

        link.review_priority = priority;
        link.review_priority_reason_codes = priorityReasonCodes;

        // Propagate / update needs_human_review:
        // A link needs review if it's high or medium priority, or if it had a warning in original linking
        link.needs_human_review = (priority === 'high' || priority === 'medium' || link.needs_human_review);

        // Update notes
        const notesParts = [
            `mountain=${link.mountain_name}(#${link.mountain_no})`,
            `candidate=${link.summit_candidate_id}`,
            `ref_score=${link.location_refined_candidate_score}`,
            `ref_rank=${link.location_refined_rank_for_mountain}`,
            `loc_level=${locationRefinementLevel}`,
            `priority=${priority}`,
        ];
        if (priorityReasonCodes.length > 0) {
            notesParts.push(`priority_reasons=${priorityReasonCodes.join(',')}`);
        }
        link.notes = notesParts.join('; ');
    }

    return refinedLinks;
}

module.exports = {
    cleanPlaceName,
    stripPlaceSuffix,
    extractAddressValues,
    getGeocodingDetails,
    computeLocationRefinement,
    refineScoresAndRanks,
};

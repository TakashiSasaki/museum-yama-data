'use strict';
/**
 * mountain_summit_candidate_linking.js
 *
 * Library for generating mountain_no ↔ summit_candidate candidate links.
 *
 * Scoring formula (all weights sum to 1.0):
 *   combined = w_name * name_score
 *            + w_ele  * elevation_score
 *            + w_coord * csv_coordinate_score
 *            + w_loc  * location_score
 *            + w_act  * activity_link_score
 *
 * Weights:
 *   name               : 0.35
 *   elevation          : 0.20
 *   csv_coordinate     : 0.20
 *   location           : 0.10
 *   activity_link      : 0.15
 *
 * This module does not assign final summit coordinates or identities.
 * Candidate links are evidence for human review, not final truth.
 */

const { normalizeText, tokenize, computeTitleSimilarity } = require('./text_similarity');
const { haversineDistance } = require('./geo_distance');

// ─── Weights ────────────────────────────────────────────────────────────────
const WEIGHTS = {
    name: 0.35,
    elevation: 0.20,
    csv_coordinate: 0.20,
    location: 0.10,
    activity_link: 0.15,
};

// ─── Elevation tier thresholds (metres) ─────────────────────────────────────
const ELE_TIERS = [
    { max: 10, tier: 'strong', score: 1.0 },
    { max: 30, tier: 'medium', score: 0.7 },
    { max: 50, tier: 'weak',   score: 0.4 },
    { max: Infinity, tier: 'warning', score: 0.1 },
];

// ─── CSV coordinate tier thresholds (metres) ─────────────────────────────────
const COORD_TIERS = [
    { max: 100,      tier: 'strong',  score: 1.0 },
    { max: 300,      tier: 'medium',  score: 0.7 },
    { max: 1000,     tier: 'weak',    score: 0.4 },
    { max: Infinity, tier: 'warning', score: 0.1 },
];

// ─── Activity link confidence → score ────────────────────────────────────────
const ACT_CONFIDENCE_SCORE = { high: 0.8, medium: 0.5, low: 0.2, none: 0.0 };

// ─── Location score tiers ────────────────────────────────────────────────────
// returned by computeLocationEvidence()
const LOC_SCORE = {
    strong_overlap: 0.8,
    weak_overlap: 0.4,
    island_only: 0.3,
    mismatch_warning: 0.1,
    unavailable: 0.0,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function tierFromDiff(diff, tiers) {
    for (const t of tiers) {
        if (diff < t.max) return { tier: t.tier, score: t.score };
    }
    return { tier: 'warning', score: 0.1 };
}

// ─── Name evidence ───────────────────────────────────────────────────────────
/**
 * Compute name evidence between a mountain name and a summit candidate.
 *
 * Signals:
 *   1. Mountain name token containment in GPX track name
 *   2. Mountain name similarity to YAMAP best candidate title
 *   3. Mountain name similarity to any title in candidate activities
 *
 * The final name_score is max(gpx_signal, yamap_best_signal, yamap_any_signal).
 */
function computeNameEvidence(mountainName, trackName, activityLink) {
    const normMountain = normalizeText(mountainName || '');
    const normTrack = normalizeText(trackName || '');

    // --- GPX track name containment ---
    let gpxContainmentScore = 0;
    let gpxSharedTokens = [];
    let gpxTrackTokens = [];
    let gpxMtnTokens = [];
    if (normMountain && normTrack) {
        const sim = computeTitleSimilarity(normMountain, normTrack);
        gpxContainmentScore = sim.containment; // token-level containment
        // Also try string-level containment (mountain name substring of track)
        const stringSub = normTrack.includes(normMountain) ? 1.0 : (normMountain.includes(normTrack) ? 0.8 : 0);
        gpxContainmentScore = Math.max(gpxContainmentScore, stringSub, sim.score);
        gpxSharedTokens = sim.shared_tokens;
        gpxTrackTokens = tokenize(normTrack);
        gpxMtnTokens = tokenize(normMountain);
    }

    // --- YAMAP best candidate title ---
    let yamapBestScore = 0;
    let yamapBestTitle = null;
    let yamapBestSim = null;
    if (activityLink && activityLink.best_candidate && activityLink.best_candidate.title) {
        yamapBestTitle = activityLink.best_candidate.title;
        yamapBestSim = computeTitleSimilarity(normMountain, normalizeText(yamapBestTitle));
        yamapBestScore = yamapBestSim.score;
    }

    // --- Any YAMAP candidate title ---
    let yamapAnyScore = 0;
    const yamapCandidateTitles = [];
    if (activityLink && Array.isArray(activityLink.title_enriched_candidate_activities)) {
        for (const act of activityLink.title_enriched_candidate_activities) {
            if (act.title) {
                yamapCandidateTitles.push(act.title);
                const sim = computeTitleSimilarity(normMountain, normalizeText(act.title));
                if (sim.score > yamapAnyScore) yamapAnyScore = sim.score;
            }
        }
    }

    const nameScore = clamp01(Math.max(gpxContainmentScore, yamapBestScore, yamapAnyScore));

    // Determine tier for readability
    let nameTier;
    if (nameScore >= 0.9) nameTier = 'strong';
    else if (nameScore >= 0.6) nameTier = 'medium';
    else if (nameScore > 0.2) nameTier = 'weak';
    else nameTier = 'none';

    return {
        name_score: Number(nameScore.toFixed(4)),
        name_tier: nameTier,
        gpx_track_containment: Number(gpxContainmentScore.toFixed(4)),
        gpx_shared_tokens: gpxSharedTokens,
        gpx_mountain_tokens: gpxMtnTokens,
        gpx_track_tokens: gpxTrackTokens,
        yamap_best_title: yamapBestTitle,
        yamap_best_title_score: yamapBestSim ? Number(yamapBestSim.score.toFixed(4)) : null,
        yamap_any_title_max_score: Number(yamapAnyScore.toFixed(4)),
    };
}

// ─── Elevation evidence ──────────────────────────────────────────────────────
function computeElevationEvidence(mountainEleM, candidateEleM) {
    if (mountainEleM == null || candidateEleM == null) {
        return {
            elevation_score: 0.0,
            elevation_tier: 'unavailable',
            mountain_ele_m: mountainEleM,
            candidate_ele_m: candidateEleM,
            diff_m: null,
        };
    }
    const diff = Math.abs(mountainEleM - candidateEleM);
    const { tier, score } = tierFromDiff(diff, ELE_TIERS);
    return {
        elevation_score: score,
        elevation_tier: tier,
        mountain_ele_m: mountainEleM,
        candidate_ele_m: candidateEleM,
        diff_m: Number(diff.toFixed(2)),
    };
}

// ─── CSV coordinate evidence ─────────────────────────────────────────────────
function computeCsvCoordinateEvidence(mountainLat, mountainLon, candidateLat, candidateLon) {
    if (mountainLat == null || mountainLon == null) {
        return {
            csv_coordinate_score: 0.0,
            csv_coordinate_tier: 'unavailable',
            mountain_lat: mountainLat,
            mountain_lon: mountainLon,
            candidate_lat: candidateLat,
            candidate_lon: candidateLon,
            distance_m: null,
        };
    }
    const dist = haversineDistance(mountainLat, mountainLon, candidateLat, candidateLon);
    const { tier, score } = tierFromDiff(dist, COORD_TIERS);
    return {
        csv_coordinate_score: score,
        csv_coordinate_tier: tier,
        mountain_lat: mountainLat,
        mountain_lon: mountainLon,
        candidate_lat: candidateLat,
        candidate_lon: candidateLon,
        distance_m: Number(dist.toFixed(2)),
    };
}

// ─── Location evidence ───────────────────────────────────────────────────────
/**
 * Compare mountain source location fields against geocoded location_candidates
 * in the summit_candidate_location_evidence record.
 *
 * Mountain location fields: municipality_or_island, municipality, island
 * Location evidence candidates: location_candidates[] { location_name, location_type }
 *
 * Returns a score and summary of matched/mismatched fields.
 */
function computeLocationEvidence(mountainLocation, locationEvidence) {
    const locCandidates = locationEvidence ? (locationEvidence.location_candidates || []) : [];
    const locNames = new Set(locCandidates.map(c => normalizeText(c.location_name)).filter(Boolean));
    const locTypes = {};
    for (const c of locCandidates) {
        const norm = normalizeText(c.location_name);
        if (norm) locTypes[norm] = c.location_type;
    }

    const mun = normalizeText(mountainLocation ? mountainLocation.municipality : '');
    const island = normalizeText(mountainLocation ? mountainLocation.island : '');
    const munOrIsland = normalizeText(mountainLocation ? mountainLocation.municipality_or_island : '');

    const matchedMunicipality = mun && locNames.has(mun);
    const matchedIsland = island && locNames.has(island);
    const matchedMunOrIsland = munOrIsland && locNames.has(munOrIsland);

    const anyMunicipalityMatch = matchedMunicipality || matchedMunOrIsland;
    const hasIsland = !!island;

    let locScore;
    let locTier;
    let locMatchSummary;

    if (anyMunicipalityMatch && (hasIsland ? matchedIsland : true)) {
        locScore = LOC_SCORE.strong_overlap;
        locTier = 'strong_overlap';
        locMatchSummary = 'municipality and island matched';
    } else if (anyMunicipalityMatch) {
        locScore = LOC_SCORE.strong_overlap;
        locTier = 'strong_overlap';
        locMatchSummary = 'municipality matched';
    } else if (matchedIsland) {
        locScore = LOC_SCORE.island_only;
        locTier = 'island_only';
        locMatchSummary = 'island matched only';
    } else if (locNames.size === 0) {
        locScore = LOC_SCORE.unavailable;
        locTier = 'unavailable';
        locMatchSummary = 'no geocoding candidates';
    } else {
        // Both available but no match → mismatch warning
        locScore = LOC_SCORE.mismatch_warning;
        locTier = 'mismatch_warning';
        locMatchSummary = `no overlap; mountain=${munOrIsland || mun}; candidate areas=${Array.from(locNames).slice(0,5).join(',')}`;
    }

    return {
        location_score: locScore,
        location_tier: locTier,
        matched_municipality: matchedMunicipality,
        matched_island: matchedIsland,
        matched_municipality_or_island: matchedMunOrIsland,
        mountain_municipality: mun || null,
        mountain_island: island || null,
        mountain_municipality_or_island: munOrIsland || null,
        geocoded_location_names: Array.from(locNames).slice(0, 10),
        location_match_summary: locMatchSummary,
    };
}

// ─── Activity link evidence ──────────────────────────────────────────────────
/**
 * Derive activity-link evidence from an activity link record (may be null).
 */
function computeActivityLinkEvidence(activityLink) {
    if (!activityLink) {
        return {
            activity_link_score: 0.0,
            activity_link_confidence: 'none',
            activity_link_match_status: 'no_activity_link',
            activity_link_needs_review: false,
            activity_link_review_reason_codes: [],
            activity_link_timezone_ambiguity: null,
            activity_link_timezone_sensitive: null,
            activity_link_date_candidate_count: null,
            activity_link_combined_score: null,
        };
    }

    const confidence = activityLink.enriched_confidence || 'none';
    const score = ACT_CONFIDENCE_SCORE[confidence] != null ? ACT_CONFIDENCE_SCORE[confidence]
        : (activityLink.combined_activity_link_score != null ? clamp01(activityLink.combined_activity_link_score) : 0);

    return {
        activity_link_score: score,
        activity_link_confidence: confidence,
        activity_link_match_status: activityLink.enriched_match_status || 'unknown',
        activity_link_needs_review: !!activityLink.needs_review,
        activity_link_review_reason_codes: Array.isArray(activityLink.review_reason_codes) ? activityLink.review_reason_codes : [],
        activity_link_timezone_ambiguity: activityLink.timezone_ambiguity != null ? activityLink.timezone_ambiguity : null,
        activity_link_timezone_sensitive: activityLink.timezone_sensitive != null ? activityLink.timezone_sensitive : null,
        activity_link_date_candidate_count: activityLink.date_candidate_count != null ? activityLink.date_candidate_count : null,
        activity_link_combined_score: activityLink.combined_activity_link_score != null ? activityLink.combined_activity_link_score : null,
    };
}

// ─── Combined score ──────────────────────────────────────────────────────────
function computeCombinedScore(nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence) {
    const s = WEIGHTS.name * nameEvidence.name_score
            + WEIGHTS.elevation * elevationEvidence.elevation_score
            + WEIGHTS.csv_coordinate * csvCoordEvidence.csv_coordinate_score
            + WEIGHTS.location * locationEvidence.location_score
            + WEIGHTS.activity_link * activityEvidence.activity_link_score;
    return Number(clamp01(s).toFixed(6));
}

// ─── Review reasons ──────────────────────────────────────────────────────────
function deriveReviewReasonCodes(opts) {
    const codes = [];
    const { nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence,
            candidateCountForMountain, mountainCountForCandidate, isNoCandidateMarker } = opts;

    if (isNoCandidateMarker) {
        codes.push('no_candidate_for_mountain');
        return codes;
    }
    if (candidateCountForMountain > 1) codes.push('multiple_candidates_for_mountain');
    if (mountainCountForCandidate > 1) codes.push('multiple_mountains_for_candidate');
    if (nameEvidence.name_tier === 'none' || nameEvidence.name_tier === 'weak') codes.push('weak_name_evidence');
    if (elevationEvidence.elevation_tier === 'warning') codes.push('weak_elevation_evidence');
    if (csvCoordEvidence.csv_coordinate_tier === 'unavailable') codes.push('missing_csv_coordinate');
    else if (csvCoordEvidence.csv_coordinate_tier === 'warning') codes.push('csv_coordinate_far');
    if (locationEvidence.location_tier === 'mismatch_warning') codes.push('location_mismatch_warning');
    if (locationEvidence.location_tier === 'unavailable') codes.push('summit_candidate_location_needs_review');
    if (activityEvidence.activity_link_match_status === 'multiple_candidates_ambiguous'
        || activityEvidence.activity_link_match_status === 'multiple_candidates_ranked'
        || activityEvidence.activity_link_date_candidate_count > 1) {
        codes.push('activity_link_ambiguous');
    }
    if (activityEvidence.activity_link_timezone_sensitive) codes.push('timezone_sensitive_activity_link');
    return codes;
}

// ─── Confidence and match_status ─────────────────────────────────────────────
function deriveCandidateStatus(combined, reviewCodes) {
    let confidence;
    let matchStatus;
    const weak = reviewCodes.includes('weak_name_evidence');
    const ambig = reviewCodes.includes('activity_link_ambiguous') || reviewCodes.includes('multiple_candidates_for_mountain');

    if (combined >= 0.75 && !weak && !ambig) {
        confidence = 'high'; matchStatus = 'candidate_high_confidence';
    } else if (combined >= 0.55 && !weak) {
        confidence = 'medium'; matchStatus = ambig ? 'ambiguous_candidate' : 'candidate_medium_confidence';
    } else if (combined >= 0.3) {
        confidence = 'low'; matchStatus = ambig ? 'ambiguous_candidate' : 'candidate_low_confidence';
    } else {
        confidence = 'none'; matchStatus = 'weak_candidate';
    }

    // If multiple mountains compete, downgrade to ambiguous
    if (reviewCodes.includes('multiple_mountains_for_candidate') && confidence === 'high') {
        confidence = 'medium'; matchStatus = 'ambiguous_candidate';
    }

    return { confidence, match_status: matchStatus };
}

// ─── Main: generate candidate links ─────────────────────────────────────────
/**
 * Generate all candidate links between mountains and summit candidates.
 *
 * @param {object[]} mountains - Array of mountain records
 * @param {object[]} summitCandidates - Array of summit candidate records
 * @param {Map<string,object>} locationEvidenceMap - Map: summit_candidate_id → evidence record
 * @param {Map<string,object>} activityLinkMap - Map: gpx_basename → activity link record
 * @returns {object[]} Array of candidate link records (unsorted, unranked)
 */
function generateCandidateLinks(mountains, summitCandidates, locationEvidenceMap, activityLinkMap) {
    const candidateLinks = [];

    for (const mountain of mountains) {
        const mountainLinks = [];

        for (const candidate of summitCandidates) {
            // Get associated activity link by GPX basename
            const activityLink = activityLinkMap.get(candidate.source_gpx_basename) || null;

            // Compute evidence signals
            const nameEvidence = computeNameEvidence(mountain.name, candidate.track_name, activityLink);
            const elevationEvidence = computeElevationEvidence(mountain.elevation_m, candidate.ele_m);
            const csvCoordEvidence = computeCsvCoordinateEvidence(
                mountain.coordinates ? mountain.coordinates.lat : null,
                mountain.coordinates ? mountain.coordinates.lon : null,
                candidate.lat, candidate.lon
            );
            const locEvidenceRecord = locationEvidenceMap.get(candidate.summit_candidate_id) || null;
            const locationEvidence = computeLocationEvidence(mountain.location, locEvidenceRecord);
            const activityEvidence = computeActivityLinkEvidence(activityLink);

            const combined = computeCombinedScore(nameEvidence, elevationEvidence, csvCoordEvidence, locationEvidence, activityEvidence);

            // Filter: require at least one mountain-name-specific positive signal.
            // Activity-link evidence applies to all candidates from the same GPX file,
            // so it alone does not make a candidate meaningful for a specific mountain.
            // Required: name signal OR close CSV coordinates OR close elevation.
            const hasMeaningfulNameSignal = nameEvidence.name_score >= 0.3;
            const hasCloseCoordinate = csvCoordEvidence.csv_coordinate_tier !== 'unavailable' &&
                csvCoordEvidence.csv_coordinate_tier !== 'warning';
            const hasGoodElevation = elevationEvidence.elevation_tier === 'strong' ||
                elevationEvidence.elevation_tier === 'medium';

            const meaningful = hasMeaningfulNameSignal || hasCloseCoordinate || hasGoodElevation;

            if (!meaningful) continue;

            mountainLinks.push({
                mountain_no: mountain.mountain_no,
                mountain_name: mountain.name,
                mountain_source_row_no: mountain.source_row_no,
                summit_candidate_id: candidate.summit_candidate_id,
                source_gpx_path: candidate.source_gpx_path,
                source_gpx_basename: candidate.source_gpx_basename,
                summit_candidate_gpx_path: candidate.summit_candidate_gpx_path,
                track_name: candidate.track_name,
                yamap_activity_candidates: activityLink ? activityLink.title_enriched_candidate_activities : [],
                best_yamap_activity_candidate: activityLink ? activityLink.best_candidate : null,
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
                },
                combined_candidate_score: combined,
                // ranks and review codes filled below
                candidate_rank_for_mountain: null,
                candidate_rank_for_summit_candidate: null,
                match_status: null,
                confidence: null,
                needs_human_review: null,
                review_reason_codes: [],
                notes: '',
            });
        }

        // Sort by combined score descending (deterministic: tie-break by summit_candidate_id)
        mountainLinks.sort((a, b) =>
            b.combined_candidate_score - a.combined_candidate_score ||
            a.summit_candidate_id.localeCompare(b.summit_candidate_id)
        );

        // Assign rank_for_mountain
        for (let i = 0; i < mountainLinks.length; i++) {
            mountainLinks[i].candidate_rank_for_mountain = i + 1;
        }

        candidateLinks.push(...mountainLinks);
    }

    return candidateLinks;
}

/**
 * Assign candidate_rank_for_summit_candidate, review codes, needs_human_review,
 * match_status, confidence, and notes to all links in place.
 *
 * @param {object[]} allLinks - All candidate link records (after all mountains processed)
 * @param {Set<number>} mountainNosSet - All known mountain_no values
 */
function finalizeLinks(allLinks, mountainNosSet) {
    // Count how many mountains link to each summit candidate
    const mountainCountPerCandidate = new Map();
    for (const link of allLinks) {
        const prev = mountainCountPerCandidate.get(link.summit_candidate_id) || 0;
        mountainCountPerCandidate.set(link.summit_candidate_id, prev + 1);
    }

    // Count how many candidates each mountain has
    const candidateCountPerMountain = new Map();
    for (const link of allLinks) {
        const prev = candidateCountPerMountain.get(link.mountain_no) || 0;
        candidateCountPerMountain.set(link.mountain_no, prev + 1);
    }

    // Build sorted ranking per summit candidate (for rank_for_summit_candidate)
    const bySummit = new Map();
    for (const link of allLinks) {
        if (!bySummit.has(link.summit_candidate_id)) bySummit.set(link.summit_candidate_id, []);
        bySummit.get(link.summit_candidate_id).push(link);
    }
    for (const [, group] of bySummit) {
        group.sort((a, b) =>
            b.combined_candidate_score - a.combined_candidate_score ||
            String(a.mountain_no).localeCompare(String(b.mountain_no))
        );
        for (let i = 0; i < group.length; i++) {
            group[i].candidate_rank_for_summit_candidate = i + 1;
        }
    }

    // Derive review codes, status, confidence for each link
    for (const link of allLinks) {
        const candidateCountForMountain = candidateCountPerMountain.get(link.mountain_no) || 1;
        const mountainCountForCandidate = mountainCountPerCandidate.get(link.summit_candidate_id) || 1;

        const reviewCodes = deriveReviewReasonCodes({
            nameEvidence: link.evidence.name,
            elevationEvidence: link.evidence.elevation,
            csvCoordEvidence: link.evidence.csv_coordinate,
            locationEvidence: link.evidence.location,
            activityEvidence: link.evidence.activity_link,
            candidateCountForMountain,
            mountainCountForCandidate,
            isNoCandidateMarker: false,
        });

        const { confidence, match_status } = deriveCandidateStatus(link.combined_candidate_score, reviewCodes);

        link.review_reason_codes = reviewCodes;
        link.match_status = match_status;
        link.confidence = confidence;
        link.needs_human_review = reviewCodes.length > 0 || confidence === 'low' || confidence === 'none';

        // Build notes
        const notesParts = [
            `mountain=${link.mountain_name}(#${link.mountain_no})`,
            `candidate=${link.summit_candidate_id}`,
            `track="${link.track_name}"`,
            `score=${link.combined_candidate_score}`,
            `name_tier=${link.evidence.name.name_tier}`,
            `ele_diff=${link.evidence.elevation.diff_m != null ? link.evidence.elevation.diff_m + 'm' : 'N/A'}`,
            `loc=${link.evidence.location.location_tier}`,
            `act_conf=${link.evidence.activity_link.activity_link_confidence}`,
        ];
        link.notes = notesParts.join('; ');
    }
}

/**
 * Generate "no candidate" marker rows for mountains that received zero candidate links.
 */
function generateNoCandidateRows(mountains, linkedMountainNos) {
    const rows = [];
    for (const mountain of mountains) {
        if (!linkedMountainNos.has(mountain.mountain_no)) {
            rows.push({
                mountain_no: mountain.mountain_no,
                mountain_name: mountain.name,
                mountain_source_row_no: mountain.source_row_no,
                summit_candidate_id: null,
                source_gpx_path: null,
                source_gpx_basename: null,
                summit_candidate_gpx_path: null,
                track_name: null,
                yamap_activity_candidates: [],
                best_yamap_activity_candidate: null,
                candidate_lat: null,
                candidate_lon: null,
                candidate_ele_m: null,
                mountain_csv_lat: mountain.coordinates ? mountain.coordinates.lat : null,
                mountain_csv_lon: mountain.coordinates ? mountain.coordinates.lon : null,
                mountain_elevation_m: mountain.elevation_m,
                evidence: { name: null, elevation: null, csv_coordinate: null, location: null, activity_link: null },
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
    return rows;
}

// ─── Review CSV generation ───────────────────────────────────────────────────
/**
 * Build CSV rows for the review queue.
 * One row per mountain (top-scoring candidate row if multiple).
 */
function buildReviewCsvRows(mountains, allLinks) {
    // Group links by mountain
    const linksByMountain = new Map();
    for (const link of allLinks) {
        if (!linksByMountain.has(link.mountain_no)) linksByMountain.set(link.mountain_no, []);
        linksByMountain.get(link.mountain_no).push(link);
    }

    const rows = [];
    for (const mountain of mountains) {
        const links = (linksByMountain.get(mountain.mountain_no) || [])
            .filter(l => l.summit_candidate_id !== null)
            .sort((a, b) => b.combined_candidate_score - a.combined_candidate_score || a.summit_candidate_id.localeCompare(b.summit_candidate_id));

        const top = links[0] || null;
        const candidateCount = links.length;

        rows.push({
            mountain_no: mountain.mountain_no,
            mountain_name: mountain.name,
            candidate_count: candidateCount,
            top_summit_candidate_id: top ? top.summit_candidate_id : '',
            top_score: top ? top.combined_candidate_score : '',
            top_confidence: top ? top.confidence : 'none',
            top_track_name: top ? (top.track_name || '') : '',
            top_source_gpx_basename: top ? (top.source_gpx_basename || '') : '',
            top_candidate_ele_m: top ? (top.candidate_ele_m != null ? top.candidate_ele_m.toFixed(2) : '') : '',
            mountain_elevation_m: mountain.elevation_m != null ? mountain.elevation_m : '',
            top_elevation_diff_m: top ? (top.evidence.elevation.diff_m != null ? top.evidence.elevation.diff_m : '') : '',
            csv_coordinate_distance_m: top ? (top.evidence.csv_coordinate.distance_m != null ? top.evidence.csv_coordinate.distance_m : '') : '',
            location_summary: top ? top.evidence.location.location_tier : '',
            activity_link_summary: top ? top.evidence.activity_link.activity_link_confidence : '',
            needs_human_review: top ? top.needs_human_review : true,
            review_reason_codes: top ? top.review_reason_codes.join('|') : 'no_candidate_for_mountain',
            notes: top ? top.notes : `mountain=${mountain.name}(#${mountain.mountain_no}); no summit candidates found`,
        });
    }
    return rows;
}

function toCsvLine(headers, row) {
    return headers.map(h => {
        const v = row[h] != null ? String(row[h]) : '';
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }).join(',');
}

function buildReviewCsv(csvRows) {
    const headers = [
        'mountain_no','mountain_name','candidate_count','top_summit_candidate_id',
        'top_score','top_confidence','top_track_name','top_source_gpx_basename',
        'top_candidate_ele_m','mountain_elevation_m','top_elevation_diff_m',
        'csv_coordinate_distance_m','location_summary','activity_link_summary',
        'needs_human_review','review_reason_codes','notes',
    ];
    const lines = [headers.join(',')];
    for (const row of csvRows) {
        lines.push(toCsvLine(headers, row));
    }
    return lines.join('\n') + '\n';
}

// ─── Review Markdown generation ──────────────────────────────────────────────
function buildReviewMarkdown(stats, reviewCsvPath, reportPath) {
    return `# Mountain Summit Candidate Linking Review Queue

- **Total mountains**: ${stats.mountain_records}
- **Mountains with at least one candidate**: ${stats.mountains_with_candidates}
- **Mountains without candidates**: ${stats.mountains_without_candidates}
- **Total candidate link records**: ${stats.candidate_link_records}
- **High confidence links**: ${stats.high_confidence_links}
- **Medium confidence links**: ${stats.medium_confidence_links}
- **Low confidence links**: ${stats.low_confidence_links}
- **Weak/none confidence links**: ${stats.weak_none_confidence_links || 0}
- **Ambiguous mountains**: ${stats.ambiguous_mountains}
- **Summit candidates linked to multiple mountains**: ${stats.summit_candidates_linked_to_multiple_mountains}
- **Records requiring human review**: ${stats.needs_human_review_count}

## Review Queue

Use the generated CSV queue [\`review_queue.csv\`](review_queue.csv) to perform manual validation.

## Next Recommended Step

1. Open \`review_queue.csv\` and review rows where \`needs_human_review = true\`.
2. Prioritize ambiguous mountains, shared summit candidates, low/weak confidence links, and all rows where \`needs_human_review = true\`.
3. After human validation, create a curated resolved-mountain waypoint dataset.

See the full report at [\`${reportPath}\`](${reportPath}).
`;
}

module.exports = {
    generateCandidateLinks,
    finalizeLinks,
    generateNoCandidateRows,
    buildReviewCsvRows,
    buildReviewCsv,
    buildReviewMarkdown,
    computeNameEvidence,
    computeElevationEvidence,
    computeCsvCoordinateEvidence,
    computeLocationEvidence,
    computeActivityLinkEvidence,
    computeCombinedScore,
    deriveReviewReasonCodes,
    deriveCandidateStatus,
    WEIGHTS,
    ELE_TIERS,
    COORD_TIERS,
    ACT_CONFIDENCE_SCORE,
};

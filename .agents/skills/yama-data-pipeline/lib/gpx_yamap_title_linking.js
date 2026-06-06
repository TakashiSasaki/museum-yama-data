const { normalizeText, computeTitleSimilarity } = require('./text_similarity');

/**
 * Enriches a date candidate link record with title/name similarity evidence.
 * @param {object} record The date candidate link record
 * @param {string|null} trackName The GPX track name retrieved from GPX manifest/metadata
 * @returns {object} The enriched candidate link record
 */
function enrichCandidateLink(record, trackName) {
    const gpx_track_name = trackName || null;
    const normalized_gpx_track_name = gpx_track_name ? normalizeText(gpx_track_name) : null;

    const enrichedActivities = (record.candidate_yamap_activities || []).map(activity => {
        const similarity = computeTitleSimilarity(gpx_track_name || '', activity.title || '');

        const date_evidence = record.evidence ? {
            method: record.evidence.method,
            date_match: record.evidence.date_match,
            used_gpx_field: record.evidence.used_gpx_field,
            used_yamap_field: record.evidence.used_yamap_field
        } : null;

        const title_evidence = {
            exact_match: similarity.exact_match,
            jaccard: similarity.jaccard,
            containment: similarity.containment,
            score: similarity.score
        };

        return {
            yamap_activity_id: activity.yamap_activity_id,
            yamap_markdown_path: activity.yamap_markdown_path,
            yamap_markdown_sha256: activity.yamap_markdown_sha256,
            activity_date: activity.activity_date,
            title: activity.title,
            normalized_yamap_title: similarity.normalized_title2,
            date_evidence: date_evidence,
            title_evidence: title_evidence,
            title_similarity_score: similarity.score,
            title_exact_match: similarity.exact_match,
            title_token_overlap: similarity.jaccard,
            shared_title_tokens: similarity.shared_tokens,
            gpx_only_title_tokens: similarity.title1_only_tokens,
            yamap_only_title_tokens: similarity.title2_only_tokens,
            matched_gpx_date_assumptions: activity.matched_gpx_date_assumptions,
            candidate_rank: null,
            candidate_score: similarity.score,
            candidate_status: 'unresolved',
            review_reason_codes: []
        };
    });

    // Sort candidates:
    // 1. by candidate_score descending (similarity)
    // 2. by title_exact_match descending
    // 3. deterministic tie-breaker: yamap_activity_id ascending
    enrichedActivities.sort((a, b) => {
        if (b.candidate_score !== a.candidate_score) {
            return b.candidate_score - a.candidate_score;
        }
        if (a.title_exact_match !== b.title_exact_match) {
            return (a.title_exact_match ? 0 : 1) - (b.title_exact_match ? 0 : 1);
        }
        return a.yamap_activity_id.localeCompare(b.yamap_activity_id);
    });

    // Assign rank
    enrichedActivities.forEach((act, idx) => {
        act.candidate_rank = idx + 1;
    });

    // Decision logic for best_candidate and review codes
    let bestCandidate = null;
    let reviewReasonCodes = [];
    let needsReview = false;
    let notes = '';
    let enrichedMatchStatus = 'needs_manual_review';
    let enrichedConfidence = 'none';

    // Highlight missing titles on individual candidates
    for (const c of enrichedActivities) {
        if (!c.title) {
            c.review_reason_codes.push('missing_yamap_title');
        }
    }
    if (!gpx_track_name) {
        reviewReasonCodes.push('missing_gpx_track_name');
    }

    if (enrichedActivities.length === 0) {
        bestCandidate = null;
        reviewReasonCodes.push('no_date_candidate');
        needsReview = true;
        enrichedMatchStatus = 'no_date_candidate';
        enrichedConfidence = 'none';
        notes = 'No date candidates found.';
    } else if (enrichedActivities.length === 1) {
        const first = enrichedActivities[0];
        if (first.candidate_score >= 0.5) {
            bestCandidate = first;
            enrichedMatchStatus = 'single_high_confidence_candidate';
            enrichedConfidence = first.candidate_score >= 0.8 ? 'high' : 'medium';
            needsReview = false;
            notes = `Single candidate proposed with similarity score ${first.candidate_score}.`;
        } else {
            bestCandidate = first;
            needsReview = true;
            if (first.candidate_score > 0) {
                reviewReasonCodes.push('weak_title_match');
                enrichedMatchStatus = 'single_medium_confidence_candidate';
                enrichedConfidence = 'low';
                notes = `Single candidate with weak title match (${first.candidate_score}).`;
            } else {
                reviewReasonCodes.push('no_title_match');
                bestCandidate = null; // do not propose
                enrichedMatchStatus = 'no_title_evidence';
                enrichedConfidence = 'none';
                notes = 'Single candidate has zero title similarity.';
            }
        }
    } else {
        const first = enrichedActivities[0];
        const second = enrichedActivities[1];
        const scoreDiff = first.candidate_score - second.candidate_score;
        const isTie = scoreDiff <= 0.05;

        if (isTie) {
            bestCandidate = null; // tied, cannot safely propose
            needsReview = true;
            if (first.candidate_score === second.candidate_score) {
                reviewReasonCodes.push('title_tie');
            } else {
                reviewReasonCodes.push('ambiguous_best_candidate');
            }
            reviewReasonCodes.push('multiple_date_candidates');
            enrichedMatchStatus = 'multiple_candidates_ambiguous';
            enrichedConfidence = 'low';
            notes = `Multiple candidates with close or tied scores (${first.candidate_score} vs ${second.candidate_score}).`;
        } else {
            bestCandidate = first;
            if (first.candidate_score >= 0.5) {
                needsReview = false;
                enrichedMatchStatus = 'multiple_candidates_ranked';
                enrichedConfidence = first.candidate_score >= 0.8 ? 'high' : 'medium';
                notes = `Proposing top candidate from multiple with superior score margin (${first.candidate_score} vs ${second.candidate_score}).`;
            } else {
                needsReview = true;
                reviewReasonCodes.push('weak_title_match');
                reviewReasonCodes.push('multiple_date_candidates');
                enrichedMatchStatus = 'multiple_candidates_ranked';
                enrichedConfidence = 'low';
                notes = `Top candidate has weak similarity (${first.candidate_score}) but superior score margin.`;
            }
        }
    }

    if (record.timezone_sensitive) {
        needsReview = true;
        reviewReasonCodes.push('timezone_sensitive');
        notes += ' Timezone sensitive record.';
    }

    if (record.candidate_dates_jst && record.candidate_dates_jst.length === 0) {
        enrichedMatchStatus = 'gpx_datetime_unparsed';
    }

    // Dedup reason codes
    reviewReasonCodes = Array.from(new Set(reviewReasonCodes));

    return {
        gpx_path: record.gpx_path,
        gpx_basename: record.gpx_basename,
        gpx_sha256: record.gpx_sha256,
        gpx_filename_datetime_raw: record.gpx_filename_datetime_raw,
        gpx_track_name: gpx_track_name,
        normalized_gpx_track_name: normalized_gpx_track_name,
        candidate_dates_jst: record.candidate_dates_jst,
        timezone_ambiguity: record.timezone_ambiguity,
        timezone_sensitive: record.timezone_sensitive,
        date_match_status: record.match_status,
        date_candidate_count: record.candidate_count,
        title_enriched_candidate_activities: enrichedActivities,
        best_candidate: bestCandidate,
        enriched_match_status: enrichedMatchStatus,
        enriched_confidence: enrichedConfidence,
        combined_activity_link_score: bestCandidate ? bestCandidate.candidate_score : 0.0,
        evidence: bestCandidate ? bestCandidate.title_evidence : null,
        needs_review: needsReview,
        review_reason_codes: reviewReasonCodes,
        notes: notes.trim()
    };
}

module.exports = {
    enrichCandidateLink
};

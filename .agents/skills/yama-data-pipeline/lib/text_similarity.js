/**
 * Normalizes text for Japanese-safe comparisons.
 * @param {string} text The raw input text
 * @returns {string} NFKC normalized, trimmed, and normalized whitespace text
 */
function normalizeText(text) {
    if (typeof text !== 'string') return '';
    // NFKC normalization handles full-width/half-width conversions for alphanumeric and kana
    let norm = text.normalize('NFKC');
    // Replace all full-width and regular spacing/delimiters with single spaces
    norm = norm.replace(/\s+/g, ' ');
    return norm.trim().toLowerCase();
}

/**
 * Tokenizes normalized text by common delimiters.
 * @param {string} normalizedText The normalized text string
 * @returns {string[]} An array of non-empty tokens
 */
function tokenize(normalizedText) {
    if (!normalizedText) return [];
    // Split on typical boundaries: ・, /, ／, ,, 、, spaces, hyphens, waves, tildes, parens, pluses, underscores
    const delimiters = /[・\/／,，、\s\-－〜~()（）+＋_]+/g;
    return normalizedText
        .split(delimiters)
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

/**
 * Computes multiple similarity metrics between two text titles.
 * @param {string} title1 First title
 * @param {string} title2 Second title
 * @returns {object} The similarity metrics and final score
 */
function computeTitleSimilarity(title1, title2) {
    const norm1 = normalizeText(title1);
    const norm2 = normalizeText(title2);

    const exactMatch = (norm1 === norm2);

    const tokens1 = tokenize(norm1);
    const tokens2 = tokenize(norm2);

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const jaccard = union.size > 0 ? (intersection.size / union.size) : 0;
    const containment = Math.min(set1.size, set2.size) > 0 ? (intersection.size / Math.min(set1.size, set2.size)) : 0;

    let stringContainment = 0;
    if (norm1.length > 0 && norm2.length > 0) {
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
            stringContainment = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
        }
    }

    // Combined score is the maximum of the different scoring signals
    const score = Math.max(
        exactMatch ? 1.0 : 0.0,
        jaccard,
        containment,
        stringContainment
    );

    const sharedTokens = Array.from(intersection);
    const title1OnlyTokens = tokens1.filter(t => !set2.has(t));
    const title2OnlyTokens = tokens2.filter(t => !set1.has(t));

    return {
        normalized_title1: norm1,
        normalized_title2: norm2,
        exact_match: exactMatch,
        jaccard: Number(jaccard.toFixed(4)),
        containment: Number(containment.toFixed(4)),
        string_containment: Number(stringContainment.toFixed(4)),
        score: Number(score.toFixed(4)),
        shared_tokens: sharedTokens,
        title1_only_tokens: title1OnlyTokens,
        title2_only_tokens: title2OnlyTokens
    };
}


function normalizeJapaneseText(text) {
    if (!text) return "";
    return text.normalize("NFKC")
        .toLowerCase()
        .replace(/[\s・／/,\、\-\–\—\(\)\+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function calculateTokenContainment(needle, haystack) {
    if (!needle || !haystack) return 0.0;

    const needleNorm = normalizeJapaneseText(needle);
    const haystackNorm = normalizeJapaneseText(haystack);

    if (haystackNorm.includes(needleNorm)) {
        return 1.0;
    }

    const needleTokens = needleNorm.split(' ').filter(t => t.length > 0);
    if (needleTokens.length === 0) return 0.0;

    let matchCount = 0;
    for (const token of needleTokens) {
        if (haystackNorm.includes(token)) {
            matchCount++;
        }
    }
    return matchCount / needleTokens.length;
}

function jaccardSimilarity(s1, s2) {
    if (!s1 || !s2) return 0.0;
    const norm1 = normalizeJapaneseText(s1);
    const norm2 = normalizeJapaneseText(s2);

    const set1 = new Set(norm1.split(' ').filter(t => t.length > 0));
    const set2 = new Set(norm2.split(' ').filter(t => t.length > 0));

    if (set1.size === 0 || set2.size === 0) return 0.0;

    let intersection = 0;
    for (const item of set1) {
        if (set2.has(item)) {
            intersection++;
        }
    }
    const union = set1.size + set2.size - intersection;
    return intersection / union;
}

module.exports = {
    normalizeJapaneseText,
    calculateTokenContainment,
    jaccardSimilarity,
    normalizeText,
    tokenize,
    computeTitleSimilarity
};

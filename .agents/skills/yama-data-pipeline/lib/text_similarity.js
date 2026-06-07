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
    if (!text) return '';
    return text.normalize('NFKC')
        .toLowerCase()
        .replace(/[・／/,\-–—()＋+　\s]/g, '');
}

function matchMountainNames(name1, name2) {
    if (!name1 || !name2) return { match: false, type: 'none' };

    const norm1 = normalizeJapaneseText(name1);
    const norm2 = normalizeJapaneseText(name2);

    if (!norm1 || !norm2) return { match: false, type: 'none' };

    // exact normalized match
    if (norm1 === norm2) {
        return { match: true, type: 'exact_normalized' };
    }

    // Substring match
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        return { match: true, type: 'substring_normalized' };
    }

    // Suffix stripping as fallback auxiliary signal (山, 峰, 岳)
    const stripSuffix = (t) => t.replace(/[山峰岳]$/, '');
    const stripped1 = stripSuffix(norm1);
    const stripped2 = stripSuffix(norm2);

    if (stripped1.length >= 2 && stripped2.length >= 2) {
         if (stripped1 === stripped2) {
             return { match: true, type: 'suffix_stripped_exact' };
         }
         if (stripped1.includes(stripped2) || stripped2.includes(stripped1)) {
             return { match: true, type: 'suffix_stripped_substring' };
         }
    }

    return { match: false, type: 'none' };
}

module.exports = {
    normalizeText,
    tokenize,
    computeTitleSimilarity,
    normalizeJapaneseText,
    matchMountainNames
};

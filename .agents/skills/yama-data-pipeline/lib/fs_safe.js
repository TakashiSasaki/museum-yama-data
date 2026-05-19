const fs = require('fs');
const path = require('path');

/**
 * Safely ensure a directory exists.
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Safely perform an atomic write by writing to a temp file first, then renaming.
 */
function atomicWriteSync(filePath, content) {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    const tempFile = path.join(dir, `.tmp_${path.basename(filePath)}_${Date.now()}`);
    try {
        fs.writeFileSync(tempFile, content, 'utf8');
        fs.renameSync(tempFile, filePath);
    } catch (err) {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        throw err;
    }
}

/**
 * Check if a subPath is safely within a basePath (prevents ZIP traversal).
 */
function isSafePath(basePath, subPath) {
    const resolvedBase = path.resolve(basePath);
    // Resolve subPath relative to basePath. If subPath is absolute, path.resolve will ignore basePath,
    // which is intentional here: the containment check below is what enforces that the final path stays
    // within resolvedBase for both relative traversal attempts and absolute-path inputs.
    const resolvedSub = path.resolve(basePath, subPath);

    // We append path.sep to resolvedBase to strictly ensure it's a child directory and not just a prefix match
    // e.g. /base vs /base-sibling
    if (resolvedSub === resolvedBase) return true;
    if (resolvedSub.startsWith(resolvedBase + path.sep)) return true;

    return false;
}

module.exports = {
    ensureDir,
    atomicWriteSync,
    isSafePath
};

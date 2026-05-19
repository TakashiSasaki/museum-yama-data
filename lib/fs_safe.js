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
    const resolvedCandidate = path.resolve(basePath, subPath);

    const rel = path.relative(resolvedBase, resolvedCandidate);

    if (rel === '') return true;
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) return true;

    return false;
}

module.exports = {
    ensureDir,
    atomicWriteSync,
    isSafePath
};

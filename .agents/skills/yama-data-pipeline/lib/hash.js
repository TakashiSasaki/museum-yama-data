const crypto = require('crypto');
const fs = require('fs');

/**
 * Generate a SHA-256 hash for a file.
 */
function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

module.exports = {
    getFileHash
};

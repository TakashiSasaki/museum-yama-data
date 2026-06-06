const crypto = require('crypto');
const fs = require('fs');

function getFileSha256(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

module.exports = {
    getFileSha256
};

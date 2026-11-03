const crypto = require('crypto');

function generateIdempotencyKey(userId, packageId, amount) {
    const payload = `${userId}-${packageId}-${amount}-${Date.now()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = {
    generateIdempotencyKey
};


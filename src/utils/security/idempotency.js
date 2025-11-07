const { PaymentModel } = require('@src/models');
const crypto = require('crypto');

async function checkIdempotency(idempotencyKey, userId) {
    if (!idempotencyKey) {
        return { isDuplicate: false };
    }

    const existingPayment = await PaymentModel.findOne({
        'metadata.idempotencyKey': idempotencyKey,
        userId
    }).lean();

    if (existingPayment) {
        return {
            isDuplicate: true,
            payment: existingPayment
        };
    }

    return { isDuplicate: false };
}

function generateIdempotencyKey(userId, packageId, amount) {
    const payload = `${userId}-${packageId}-${amount}-${Date.now()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = {
    checkIdempotency,
    generateIdempotencyKey
};


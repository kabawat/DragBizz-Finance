require('module-alias/register');
const mongoose = require('mongoose');
const SECRET = require('@src/config/env.config');

async function main() {
    const settlementId = process.argv[2];
    if (!settlementId) throw new Error('Usage: node scripts/retry-retail-settlement.js <settlementId>');
    await mongoose.connect(SECRET.mongo.uri, { autoIndex: false });
    const { CoreSettlementOutboxModel } = require('@src/models');
    const result = await CoreSettlementOutboxModel.updateOne({ settlementId, status: 'FAILED' }, {
        $set: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), failedAt: null, lockedAt: null, lockToken: null },
    });
    console.log(result.modifiedCount ? 'Settlement queued for retry with its original idempotency key' : 'No failed settlement matched');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

const { randomUUID } = require('crypto');
const { CoreSettlementOutboxModel } = require('@src/models');
const logger = require('@src/utils/logger');
const {
    LOCK_TTL_MS,
    nextBackoffMs,
    errorMessage,
    compactCoreResponse,
} = require('./config');

async function recoverStaleCoreSettlementLocks({ model = CoreSettlementOutboxModel } = {}) {
    const staleThreshold = new Date(Date.now() - LOCK_TTL_MS);
    const result = await model.updateMany(
        {
            status: 'PROCESSING',
            lockedAt: { $lt: staleThreshold },
        },
        {
            $set: {
                status: 'PENDING',
                lockedAt: null,
                lockToken: null,
                nextAttemptAt: new Date(),
                lastError: 'Recovered from stale settlement worker lock',
            },
        }
    );

    if (result?.modifiedCount > 0) {
        logger.warn('core_settlement_outbox.stale_locks_recovered', { count: result.modifiedCount });
    }
}

async function claimNextCoreSettlement({ model = CoreSettlementOutboxModel } = {}) {
    const now = new Date();
    const query = model.findOneAndUpdate(
        {
            status: 'PENDING',
            nextAttemptAt: { $lte: now },
            $expr: { $lt: ['$attempts', '$maxAttempts'] },
        },
        {
            $set: {
                status: 'PROCESSING',
                lockedAt: now,
                lockToken: randomUUID(),
            },
        },
        {
            new: true,
            sort: { nextAttemptAt: 1, createdAt: 1 },
        }
    );
    return typeof query.select === 'function' ? query.select('+lockToken') : query;
}

async function markDelivered(outbox, response, { model = CoreSettlementOutboxModel } = {}) {
    return model.findOneAndUpdate(
        {
            _id: outbox._id,
            status: 'PROCESSING',
            lockToken: outbox.lockToken,
        },
        {
            $set: {
                status: 'DELIVERED',
                deliveredAt: new Date(),
                lockedAt: null,
                lockToken: null,
                nextAttemptAt: null,
                lastError: null,
                coreResponse: compactCoreResponse(response),
            },
            $inc: { attempts: 1 },
        },
        { new: true }
    );
}

async function markDeliveryFailure(outbox, error, { model = CoreSettlementOutboxModel } = {}) {
    const attemptNumber = Number(outbox.attempts || 0) + 1;
    const finalAttempt = attemptNumber >= Number(outbox.maxAttempts || 1);
    const now = new Date();
    const nextAttemptAt = finalAttempt ? null : new Date(now.getTime() + nextBackoffMs(attemptNumber));

    await model.findOneAndUpdate(
        {
            _id: outbox._id,
            status: 'PROCESSING',
            lockToken: outbox.lockToken,
        },
        {
            $set: {
                status: finalAttempt ? 'FAILED' : 'PENDING',
                failedAt: finalAttempt ? now : null,
                lockedAt: null,
                lockToken: null,
                nextAttemptAt,
                lastError: errorMessage(error),
            },
            $inc: { attempts: 1 },
        },
        { new: true }
    );

    return { finalAttempt, nextAttemptAt, attemptNumber };
}

module.exports = {
    recoverStaleCoreSettlementLocks,
    claimNextCoreSettlement,
    markDelivered,
    markDeliveryFailure,
};


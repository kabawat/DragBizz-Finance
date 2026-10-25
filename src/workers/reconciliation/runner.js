const { RetailPaymentAttemptModel } = require('@src/models');
const logger = require('@src/utils/logger');
const { reconcileAttempt } = require('./processor');
const {
    BATCH_SIZE,
    POLL_INTERVAL_MS,
    RETRY_DELAY_MS,
    EXPIRY_GRACE_MS,
    SHUTDOWN_GRACE_MS,
    RECONCILE_STATUSES,
} = require('./config');

let timer = null;
let busy = false;
let stopped = false;

async function runBatch() {
    if (busy || stopped) return;
    busy = true;

    try {
        const attempts = await RetailPaymentAttemptModel.find({
            status: { $in: RECONCILE_STATUSES },
            nextReconcileAt: { $lte: new Date() },
        })
            .sort({ nextReconcileAt: 1 })
            .limit(BATCH_SIZE)
            .lean();

        for (const attempt of attempts) {
            if (stopped) break;

            const claim = await RetailPaymentAttemptModel.updateOne(
                {
                    _id: attempt._id,
                    nextReconcileAt: { $lte: new Date() },
                    status: { $in: RECONCILE_STATUSES },
                },
                {
                    $set: { nextReconcileAt: new Date(Date.now() + RETRY_DELAY_MS) },
                }
            );

            if (!claim.modifiedCount) continue;

            if (attempt.expiresAt && new Date(attempt.expiresAt).getTime() + EXPIRY_GRACE_MS < Date.now()) {
                await RetailPaymentAttemptModel.updateOne(
                    { _id: attempt._id, gatewayPaymentId: null },
                    {
                        $set: { status: 'EXPIRED', isActive: false },
                    }
                );
                continue;
            }

            try {
                await reconcileAttempt(attempt);
            } catch (_) {
                logger.warn('retail.reconciliation_retry', { financeAttemptId: attempt.financeAttemptId });
            }
        }
    } finally {
        busy = false;
    }
}

function startWorker() {
    if (timer) return;
    stopped = false;
    timer = setInterval(() => runBatch().catch(() => logger.error('retail.reconciliation_failed')), POLL_INTERVAL_MS);
    if (timer.unref) timer.unref();
}

async function stopWorker() {
    stopped = true;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    const deadline = Date.now() + SHUTDOWN_GRACE_MS;
    while (busy && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

module.exports = {
    runBatch,
    startWorker,
    stopWorker,
};


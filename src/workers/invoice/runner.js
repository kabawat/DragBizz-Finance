const { randomUUID } = require('crypto');
const { InvoiceJobModel } = require('@src/models');
const logger = require('@src/utils/logger');
const { processJob } = require('./processor');
const {
    BATCH_SIZE,
    CONCURRENCY,
    POLL_MS,
    LOCK_TTL_MS,
    SHUTDOWN_GRACE_MS,
} = require('./config');

let _intervalHandle = null;
let _running = false;
let _stopping = false;
let _inFlight = 0;

async function recoverStaleLocks() {
    const staleThreshold = new Date(Date.now() - LOCK_TTL_MS);
    const result = await InvoiceJobModel.updateMany(
        {
            status: 'PROCESSING',
            lockedAt: { $lt: staleThreshold },
        },
        {
            $set: {
                status: 'PENDING',
                lockedAt: null,
                lockToken: null,
                errorMessage: 'Recovered from stale lock',
                nextRunAt: new Date(),
            },
        }
    );
    if (result.modifiedCount > 0) {
        logger.warn('[InvoiceWorker] Recovered stale-locked jobs', { count: result.modifiedCount });
    }
}

async function runBatch() {
    if (_stopping) return;

    try {
        await recoverStaleLocks();

        const now = new Date();
        const lockToken = randomUUID();

        const claimPromises = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
            claimPromises.push(
                InvoiceJobModel.findOneAndUpdate(
                    {
                        status: 'PENDING',
                        nextRunAt: { $lte: now },
                        $expr: { $lt: ['$attempts', '$maxAttempts'] },
                    },
                    {
                        $set: {
                            status: 'PROCESSING',
                            lockedAt: now,
                            lockToken,
                        },
                    },
                    { new: true, sort: { nextRunAt: 1 } }
                )
            );
        }

        const claimed = (await Promise.all(claimPromises)).filter(Boolean);
        if (claimed.length === 0) return;

        logger.info('[InvoiceWorker] Claimed jobs', { count: claimed.length });

        for (let i = 0; i < claimed.length; i += CONCURRENCY) {
            if (_stopping) break;
            const chunk = claimed.slice(i, i + CONCURRENCY);
            _inFlight += chunk.length;
            await Promise.allSettled(chunk.map((job) => processJob(job)));
            _inFlight -= chunk.length;
        }
    } catch (error) {
        logger.error('[InvoiceWorker] Batch poll error', { error: error.message, stack: error.stack });
    }
}

function startWorker() {
    if (_running) {
        logger.warn('[InvoiceWorker] Already running');
        return;
    }
    _running = true;
    _stopping = false;

    runBatch().catch((err) =>
        logger.error('[InvoiceWorker] Initial batch error', { error: err.message })
    );

    _intervalHandle = setInterval(() => {
        runBatch().catch((err) =>
            logger.error('[InvoiceWorker] Interval batch error', { error: err.message })
        );
    }, POLL_MS);

    if (_intervalHandle.unref) _intervalHandle.unref();
    logger.info('[InvoiceWorker] Started', { batchSize: BATCH_SIZE, concurrency: CONCURRENCY, pollMs: POLL_MS });
}

async function stopWorker() {
    if (!_running) return;
    logger.info('[InvoiceWorker] Stopping...');
    _stopping = true;

    if (_intervalHandle) {
        clearInterval(_intervalHandle);
        _intervalHandle = null;
    }

    const deadline = Date.now() + SHUTDOWN_GRACE_MS;
    while (_inFlight > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
    }
    if (_inFlight > 0) {
        logger.warn('[InvoiceWorker] Shutdown forced with in-flight jobs', { inFlight: _inFlight });
    }

    _running = false;
    _stopping = false;
    logger.info('[InvoiceWorker] Stopped');
}

module.exports = {
    runBatch,
    startWorker,
    stopWorker,
};


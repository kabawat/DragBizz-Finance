const { CoreSettlementOutboxModel } = require('@src/models');
const { paymentClient: retailPaymentGrpcClient } = require('@src/lib/grpc/clients/retailer');
const logger = require('@src/utils/logger');
const {
    DEFAULT_BATCH_SIZE,
    DEFAULT_CONCURRENCY,
    SHUTDOWN_GRACE_MS,
    boundedPositiveInteger,
    workerConfig,
    errorMessage,
} = require('./config');
const { recoverStaleCoreSettlementLocks, claimNextCoreSettlement } = require('./state');
const { processCoreSettlementOutbox } = require('./processor');

let intervalHandle = null;
let running = false;
let stopping = false;
let inFlight = 0;
let batchActive = false;

async function runBatch(
    {
        batchSize = workerConfig().batchSize,
        concurrency = workerConfig().concurrency,
        model = CoreSettlementOutboxModel,
        grpcClient = retailPaymentGrpcClient,
    } = {}
) {
    if (stopping || batchActive) return { claimed: 0, processed: 0, skipped: true };
    batchActive = true;

    try {
        await recoverStaleCoreSettlementLocks({ model });

        const claimed = [];
        const boundedBatchSize = boundedPositiveInteger(batchSize, DEFAULT_BATCH_SIZE, 100);
        const boundedConcurrency = boundedPositiveInteger(concurrency, DEFAULT_CONCURRENCY, 20);

        for (let index = 0; index < boundedBatchSize; index += 1) {
            const outbox = await claimNextCoreSettlement({ model });
            if (!outbox) break;
            claimed.push(outbox);
        }

        if (claimed.length === 0) return { claimed: 0, processed: 0 };

        let processed = 0;
        for (let index = 0; index < claimed.length; index += boundedConcurrency) {
            if (stopping) break;
            const chunk = claimed.slice(index, index + boundedConcurrency);
            inFlight += chunk.length;
            await Promise.allSettled(
                chunk.map(async (outbox) => {
                    await processCoreSettlementOutbox(outbox, { model, grpcClient });
                    processed += 1;
                })
            );
            inFlight -= chunk.length;
        }

        return { claimed: claimed.length, processed };
    } finally {
        batchActive = false;
    }
}

function startWorker() {
    if (running) {
        logger.warn('core_settlement_outbox.worker_already_running');
        return;
    }

    const config = workerConfig();
    running = true;
    stopping = false;

    runBatch().catch((error) => {
        logger.error('core_settlement_outbox.initial_batch_failed', { error: errorMessage(error) });
    });

    intervalHandle = setInterval(() => {
        runBatch().catch((error) => {
            logger.error('core_settlement_outbox.batch_failed', { error: errorMessage(error) });
        });
    }, config.pollMs);

    if (intervalHandle.unref) intervalHandle.unref();
    logger.info('core_settlement_outbox.worker_started', config);
}

async function stopWorker() {
    if (!running) return;
    stopping = true;

    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }

    const deadline = Date.now() + SHUTDOWN_GRACE_MS;
    while (inFlight > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (inFlight > 0) {
        logger.warn('core_settlement_outbox.shutdown_with_inflight', { inFlight });
    }

    running = false;
    stopping = false;
    logger.info('core_settlement_outbox.worker_stopped');
}

module.exports = {
    runBatch,
    startWorker,
    stopWorker,
};

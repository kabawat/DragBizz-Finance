const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_POLL_MS = 10_000;
const LOCK_TTL_MS = 5 * 60 * 1000;
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 30 * 60 * 1000;
const SHUTDOWN_GRACE_MS = 30_000;

function boundedPositiveInteger(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function workerConfig() {
    return {
        batchSize: boundedPositiveInteger(process.env.CORE_SETTLEMENT_OUTBOX_BATCH_SIZE, DEFAULT_BATCH_SIZE, 100),
        concurrency: boundedPositiveInteger(process.env.CORE_SETTLEMENT_OUTBOX_CONCURRENCY, DEFAULT_CONCURRENCY, 20),
        pollMs: boundedPositiveInteger(process.env.CORE_SETTLEMENT_OUTBOX_POLL_INTERVAL_MS, DEFAULT_POLL_MS, 300_000),
    };
}

function nextBackoffMs(attempts) {
    // Small bounded jitter prevents many failed deliveries retrying in lockstep.
    const exponential = Math.min(RETRY_BASE_MS * (2 ** Math.max(0, attempts - 1)), RETRY_MAX_MS);
    const jitter = Math.floor(exponential * 0.1 * Math.random());
    return Math.min(exponential + jitter, RETRY_MAX_MS);
}

function errorMessage(error) {
    return String(error?.message || error || 'Unknown Core settlement delivery error').slice(0, 2000);
}

function compactCoreResponse(response) {
    if (!response || typeof response !== 'object') return null;
    return {
        success: Boolean(response.success),
        message: response.message ? String(response.message).slice(0, 500) : null,
        paymentId: response.paymentId ? String(response.paymentId) : null,
        remainingDuePaise: response.remainingDuePaise ?? null,
    };
}

module.exports = {
    DEFAULT_BATCH_SIZE,
    DEFAULT_CONCURRENCY,
    DEFAULT_POLL_MS,
    LOCK_TTL_MS,
    RETRY_BASE_MS,
    RETRY_MAX_MS,
    SHUTDOWN_GRACE_MS,
    boundedPositiveInteger,
    workerConfig,
    nextBackoffMs,
    errorMessage,
    compactCoreResponse,
};


const SECRET = require('@config/env.config');

const BATCH_SIZE = SECRET?.invoice?.worker?.batchSize || parseInt(process.env.INVOICE_WORKER_BATCH_SIZE, 10) || 5;
const CONCURRENCY = SECRET?.invoice?.worker?.concurrency || parseInt(process.env.INVOICE_WORKER_CONCURRENCY, 10) || 3;
const POLL_MS = SECRET?.invoice?.worker?.pollIntervalMs || parseInt(process.env.INVOICE_WORKER_POLL_INTERVAL_MS, 10) || 30_000;
const LOCK_TTL_MS = 5 * 60 * 1000;   // 5 minutes: stale lock threshold
const MAX_BACKOFF_MS = 30 * 60 * 1000;  // 30 minutes: cap on exponential backoff
const SHUTDOWN_GRACE_MS = 30_000;

function nextBackoffMs(attempts) {
    const delay = Math.pow(2, attempts) * 30_000;
    return Math.min(delay, MAX_BACKOFF_MS);
}

function buildR2Key(payment) {
    const agency = payment.agencyId ? String(payment.agencyId).replace(/[^a-zA-Z0-9_-]/g, '') : 'unknown';
    const payId = String(payment._id).replace(/[^a-zA-Z0-9_-]/g, '');
    return `invoices/${agency}/${payId}.pdf`;
}

module.exports = {
    BATCH_SIZE,
    CONCURRENCY,
    POLL_MS,
    LOCK_TTL_MS,
    MAX_BACKOFF_MS,
    SHUTDOWN_GRACE_MS,
    nextBackoffMs,
    buildR2Key,
};


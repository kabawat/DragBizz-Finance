const { randomUUID } = require('crypto');
const { InvoiceJobModel, PaymentModel } = require('@src/models');
const { generateInvoicePdf } = require('@src/lib/pdf/invoice.generator');
const { uploadPdfToR2, getPresignedDownloadUrl } = require('@src/lib/pdf/upload.client');
const logger = require('@src/utils/logger');
const SECRET = require('@config/env.config');

// ── Config ────────────────────────────────────────────────────────────────────
const BATCH_SIZE       = parseInt(process.env.INVOICE_WORKER_BATCH_SIZE)    || 5;
const CONCURRENCY      = parseInt(process.env.INVOICE_WORKER_CONCURRENCY)   || 3;
const POLL_MS          = parseInt(process.env.INVOICE_WORKER_POLL_INTERVAL_MS) || 30_000;
const LOCK_TTL_MS      = 5 * 60 * 1000;   // 5 minutes: stale lock threshold
const MAX_BACKOFF_MS   = 30 * 60 * 1000;  // 30 minutes: cap on exponential backoff

let _intervalHandle = null;
let _running        = false;
let _stopping       = false;
let _inFlight       = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Calculate retry delay with exponential backoff
function nextBackoffMs(attempts) {
    const delay = Math.pow(2, attempts) * 30_000;
    return Math.min(delay, MAX_BACKOFF_MS);
}

// Generate sanitized R2 object key
function buildR2Key(payment) {
    const agency  = payment.agencyId ? String(payment.agencyId).replace(/[^a-zA-Z0-9_-]/g, '') : 'unknown';
    const payId   = String(payment._id).replace(/[^a-zA-Z0-9_-]/g, '');
    return `invoices/${agency}/${payId}.pdf`;
}

// ── Stale Lock Recovery ───────────────────────────────────────────────────────

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

// ── Single Job Processor ──────────────────────────────────────────────────────

async function processJob(job) {
    const startMs = Date.now();
    logger.info('[InvoiceWorker] Processing job', { jobId: job._id, paymentId: job.paymentId, attempt: job.attempts + 1 });

    try {
        // Fetch fresh payment data
        const payment = await PaymentModel.findById(job.paymentId).lean();
        if (!payment) {
            throw new Error(`Payment ${job.paymentId} not found`);
        }
        if (payment.status !== 'SUCCESS') {
            throw new Error(`Payment ${job.paymentId} is not in SUCCESS status (got: ${payment.status})`);
        }

        // Generate PDF
        const pdfBuffer = await generateInvoicePdf(payment);
        const r2Key = buildR2Key(payment);

        // Upload to R2 via Utility service
        await uploadPdfToR2(r2Key, pdfBuffer);

        // Atomic update: mark job DONE and update Payment.invoice in parallel
        await Promise.all([
            InvoiceJobModel.findOneAndUpdate(
                { _id: job._id, lockToken: job.lockToken },
                {
                    $set: {
                        status: 'DONE',
                        r2Key,
                        completedAt: new Date(),
                        lockedAt: null,
                        lockToken: null,
                        errorMessage: null,
                    },
                    $inc: { attempts: 1 },
                }
            ),
            PaymentModel.findOneAndUpdate(
                { _id: job.paymentId },
                {
                    $set: {
                        'invoice.r2Key': r2Key,
                        'invoice.status': 'DONE',
                        'invoice.generatedAt': new Date(),
                    },
                }
            ),
        ]);

        logger.info('[InvoiceWorker] Job completed', {
            jobId: job._id,
            paymentId: job.paymentId,
            r2Key,
            durationMs: Date.now() - startMs,
        });
    } catch (error) {
        const newAttempts = (job.attempts || 0) + 1;
        const isFinal    = newAttempts >= job.maxAttempts;
        const nextRunAt  = isFinal ? null : new Date(Date.now() + nextBackoffMs(newAttempts));

        logger.error('[InvoiceWorker] Job failed', {
            jobId: job._id,
            paymentId: job.paymentId,
            attempt: newAttempts,
            maxAttempts: job.maxAttempts,
            isFinal,
            nextRunAt,
            error: error.message,
        });

        await InvoiceJobModel.findOneAndUpdate(
            { _id: job._id, lockToken: job.lockToken },
            {
                $set: {
                    status: isFinal ? 'FAILED' : 'PENDING',
                    attempts: newAttempts,
                    errorMessage: error.message?.substring(0, 2000),
                    lockedAt: null,
                    lockToken: null,
                    ...(nextRunAt ? { nextRunAt } : {}),
                },
            }
        );

        if (isFinal) {
            // Also update payment.invoice.status to FAILED so frontend knows
            await PaymentModel.findOneAndUpdate(
                { _id: job.paymentId },
                { $set: { 'invoice.status': 'FAILED' } }
            );
        }
    }
}

// ── Batch Poll Cycle ──────────────────────────────────────────────────────────

async function runBatch() {
    if (_stopping) return;

    try {
        // Recover stale locks from crashed workers
        await recoverStaleLocks();

        const now       = new Date();
        const lockToken = randomUUID();

        // Atomically claim up to BATCH_SIZE eligible jobs
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

        if (claimed.length === 0) return; // Nothing to do

        logger.info('[InvoiceWorker] Claimed jobs', { count: claimed.length });

        // Process with bounded concurrency (semaphore via sequential chunking)
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

// ── Lifecycle ─────────────────────────────────────────────────────────────────

function startWorker() {
    if (_running) {
        logger.warn('[InvoiceWorker] Already running');
        return;
    }
    _running  = true;
    _stopping = false;

    // Run immediately on start, then on interval
    runBatch().catch((err) =>
        logger.error('[InvoiceWorker] Initial batch error', { error: err.message })
    );

    _intervalHandle = setInterval(() => {
        runBatch().catch((err) =>
            logger.error('[InvoiceWorker] Interval batch error', { error: err.message })
        );
    }, POLL_MS);

    // Don't let this interval prevent process exit
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

    // Wait for in-flight jobs to finish (up to 30s)
    const deadline = Date.now() + 30_000;
    while (_inFlight > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
    }
    if (_inFlight > 0) {
        logger.warn('[InvoiceWorker] Shutdown forced with in-flight jobs', { inFlight: _inFlight });
    }

    _running  = false;
    _stopping = false;
    logger.info('[InvoiceWorker] Stopped');
}

module.exports = { startWorker, stopWorker };


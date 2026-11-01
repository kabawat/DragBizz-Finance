const { InvoiceJobModel, PaymentModel } = require('@src/models');
const { generateInvoicePdf } = require('@src/lib/pdf/invoice.generator');
const { uploadPdfToR2 } = require('@src/lib/pdf/upload.client');
const logger = require('@src/utils/logger');
const { nextBackoffMs, buildR2Key } = require('./config');

async function processJob(job) {
    const startMs = Date.now();
    logger.info('[InvoiceWorker] Processing job', { jobId: job._id, paymentId: job.paymentId, attempt: job.attempts + 1 });

    try {
        const payment = await PaymentModel.findById(job.paymentId).lean();
        if (!payment) {
            throw new Error(`Payment ${job.paymentId} not found`);
        }
        if (payment.status !== 'SUCCESS') {
            throw new Error(`Payment ${job.paymentId} is not in SUCCESS status (got: ${payment.status})`);
        }

        const pdfBuffer = await generateInvoicePdf(payment);
        const r2Key = buildR2Key(payment);

        await uploadPdfToR2(r2Key, pdfBuffer);

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
        const isFinal = newAttempts >= job.maxAttempts;
        const nextRunAt = isFinal ? null : new Date(Date.now() + nextBackoffMs(newAttempts));

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
            await PaymentModel.findOneAndUpdate(
                { _id: job.paymentId },
                { $set: { 'invoice.status': 'FAILED' } }
            );
        }
    }
}

module.exports = {
    processJob,
};


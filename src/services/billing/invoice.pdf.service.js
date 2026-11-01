const mongoose = require('mongoose');
const { InvoiceJobModel, PaymentModel } = require('@src/models');
const { getPresignedDownloadUrl } = require('@src/lib/pdf/upload.client');
const logger = require('@src/utils/logger');

const DOWNLOAD_EXPIRY_S = 300; // 5 minutes

// Idempotent invoice job scheduler triggered by onPaymentSettled hook
async function scheduleInvoicePdf(payment) {
    try {
        if (!payment || !payment._id) {
            logger.warn('[InvoicePdfService] scheduleInvoicePdf called without payment');
            return;
        }

        // Idempotency: upsert — only insert if no job exists for this payment
        const result = await InvoiceJobModel.findOneAndUpdate(
            { paymentId: payment._id },
            {
                $setOnInsert: {
                    paymentId: payment._id,
                    agencyId: payment.agencyId || null,
                    userId: payment.userId,
                    status: 'PENDING',
                    attempts: 0,
                    maxAttempts: 5,
                    nextRunAt: new Date(),
                    lockedAt: null,
                    lockToken: null,
                    r2Key: null,
                    errorMessage: null,
                    completedAt: null,
                },
            },
            { upsert: true, new: false } // new:false returns the pre-update doc (null if inserted)
        );

        if (result === null) {
            // null means a new document was inserted
            logger.info('[InvoicePdfService] Invoice job scheduled', {
                paymentId: payment._id,
                orderId: payment.orderId,
            });
        } else {
            logger.debug('[InvoicePdfService] Invoice job already exists — skipping', {
                paymentId: payment._id,
                existingStatus: result.status,
            });
        }
    } catch (error) {
        // MUST NOT propagate — this is a fire-and-forget hook
        logger.error('[InvoicePdfService] Failed to schedule invoice job', {
            paymentId: payment?._id,
            error: error.message,
            stack: error.stack,
        });
    }
}

// Generate presigned download URL with tenant and agency authorization checks
async function getInvoiceDownloadUrl(invoiceId, userId, agencyId) {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw { code: 'NOT_FOUND', message: 'Invoice not found' };
    }

    const payment = await PaymentModel.findById(invoiceId)
        .select('userId agencyId invoice orderId')
        .lean();

    if (!payment) {
        throw { code: 'NOT_FOUND', message: 'Invoice not found' };
    }

    // Tenant isolation — both userId and agencyId must match
    if (payment.userId !== userId) {
        throw { code: 'FORBIDDEN', message: 'Access denied' };
    }

    if (agencyId && payment.agencyId) {
        const payAgency = String(payment.agencyId);
        const reqAgency = String(agencyId);
        if (payAgency !== reqAgency) {
            throw { code: 'FORBIDDEN', message: 'Access denied' };
        }
    }

    const invoiceStatus = payment.invoice?.status;

    if (invoiceStatus !== 'DONE' || !payment.invoice?.r2Key) {
        const code = invoiceStatus === 'FAILED' ? 'FAILED' : 'NOT_READY';
        throw {
            code,
            message: invoiceStatus === 'FAILED'
                ? 'Invoice generation failed. Please contact support.'
                : 'Invoice is not ready yet. Please try again shortly.',
        };
    }

    const url = await getPresignedDownloadUrl(payment.invoice.r2Key, DOWNLOAD_EXPIRY_S);

    return { url, expiresIn: DOWNLOAD_EXPIRY_S };
}

module.exports = { scheduleInvoicePdf, getInvoiceDownloadUrl };


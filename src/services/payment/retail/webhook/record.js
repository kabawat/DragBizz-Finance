const { createHash } = require('crypto');
const mongoose = require('mongoose');
const { RetailPaymentAttemptModel, RetailWebhookEventModel } = require('@src/models');
const { enqueueSettlement } = require('../settlement');

function fail(message, code, statusCode = 400) {
    throw Object.assign(new Error(message), { code, statusCode });
}

async function recordConfirmedPayment(attempt, paid, {
    dedupeKey,
    providerEventId,
    rawBody = '',
    eventType = 'RECONCILIATION',
}) {
    if (!paid?.gatewayPaymentId || Number(paid.amountPaise) !== attempt.amountPaise || String(paid.currency).toUpperCase() !== attempt.currency) {
        fail('Gateway payment amount or currency mismatch', 'AMOUNT_MISMATCH');
    }

    const paidAt = new Date(paid.paidAt || Date.now());
    if (Number.isNaN(paidAt.getTime())) {
        fail('Invalid payment timestamp', 'INVALID_PAYMENT_DATE');
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const event = await RetailWebhookEventModel.findOneAndUpdate(
                { provider: attempt.provider, dedupeKey },
                {
                    $setOnInsert: {
                        provider: attempt.provider,
                        dedupeKey,
                        providerEventId,
                        financeAttemptId: attempt.financeAttemptId,
                        intentId: attempt.intentId,
                        gatewayOrderId: attempt.gatewayOrderId,
                        gatewayPaymentId: paid.gatewayPaymentId,
                        eventType,
                        signatureValid: true,
                        status: 'PROCESSED',
                        payloadHash: createHash('sha256').update(rawBody).digest('hex'),
                        payloadSizeBytes: Buffer.byteLength(rawBody),
                        verifiedAt: new Date(),
                        processedAt: new Date(),
                        retentionExpiresAt: new Date(Date.now() + 90 * 86400000),
                    },
                },
                { upsert: true, new: true, session }
            );

            if (attempt.gatewayPaymentId && attempt.gatewayPaymentId !== paid.gatewayPaymentId) {
                fail('Attempt already has another successful payment', 'DUPLICATE_PAYMENT_CONFLICT', 409);
            }

            await enqueueSettlement({
                settlementId: `retail:${attempt.provider}:${paid.gatewayPaymentId}`,
                financeAttemptId: attempt.financeAttemptId,
                intentId: attempt.intentId,
                collectLinkId: attempt.intentId,
                provider: attempt.provider,
                gatewayOrderId: attempt.gatewayOrderId,
                gatewayPaymentId: paid.gatewayPaymentId,
                gatewayEventId: providerEventId || event.dedupeKey,
                amountPaise: attempt.amountPaise,
                currency: attempt.currency,
                paymentMethod: paid.paymentMethod,
                paidAt,
            }, { session });

            await RetailPaymentAttemptModel.updateOne(
                { _id: attempt._id },
                {
                    $set: {
                        status: attempt.status === 'SETTLED' ? 'SETTLED' : 'SETTLEMENT_PENDING',
                        gatewayPaymentId: paid.gatewayPaymentId,
                        paidAt,
                        paymentMethod: paid.paymentMethod,
                    },
                },
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return { received: true };
}

module.exports = {
    recordConfirmedPayment,
};


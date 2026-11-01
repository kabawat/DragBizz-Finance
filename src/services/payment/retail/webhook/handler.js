const { createHash } = require('crypto');
const { RetailPaymentAttemptModel, RetailWebhookEventModel } = require('@src/models');
const { getCredentials } = require('../checkout');
const gateway = require('../gateway');
const { recordConfirmedPayment } = require('./record');

function fail(message, code, statusCode = 400) {
    throw Object.assign(new Error(message), { code, statusCode });
}

function getReferences(provider, body) {
    if (provider === 'RAZORPAY') {
        return {
            orderId: body?.payload?.payment?.entity?.order_id || body?.payload?.order?.entity?.id,
            attemptId: body?.payload?.payment?.entity?.notes?.financeAttemptId || body?.payload?.order?.entity?.notes?.financeAttemptId,
        };
    }
    return {
        orderId: body?.data?.order?.order_id,
    };
}

async function handleWebhook(providerName, request) {
    const provider = String(providerName || '').toUpperCase();
    if (!['RAZORPAY', 'CASHFREE'].includes(provider)) {
        fail('Unsupported retail gateway', 'UNSUPPORTED_GATEWAY');
    }
    if (!request.rawBody || Buffer.byteLength(request.rawBody) > 256 * 1024) {
        fail('Invalid webhook body', 'INVALID_BODY');
    }

    const ref = getReferences(provider, request.body);
    const clauses = [];
    if (ref.orderId) clauses.push({ gatewayOrderId: ref.orderId }, { merchantOrderId: ref.orderId });
    if (ref.attemptId) clauses.push({ financeAttemptId: ref.attemptId });
    if (!clauses.length) fail('Webhook has no order reference', 'ORDER_REFERENCE_REQUIRED');

    const attempt = await RetailPaymentAttemptModel.findOne({ provider, $or: clauses });
    if (!attempt) fail('Unknown retail payment order', 'ORDER_NOT_FOUND', 404);

    const config = await getCredentials(attempt, 'VERIFY_WEBHOOK');
    const parsed = gateway.parseWebhook(attempt, config, request);
    if (!parsed.ok) fail('Invalid webhook signature', 'INVALID_SIGNATURE', 401);
    if (!parsed.event) return { received: true, ignored: true };

    if (['payment.failed', 'payment.cancelled'].includes(parsed.event.type)) {
        const eventKey = request.headers?.['x-razorpay-event-id']
            || createHash('sha256').update(request.rawBody).digest('hex');

        await RetailWebhookEventModel.findOneAndUpdate(
            { provider, dedupeKey: eventKey },
            {
                $setOnInsert: {
                    provider,
                    dedupeKey: eventKey,
                    financeAttemptId: attempt.financeAttemptId,
                    intentId: attempt.intentId,
                    gatewayOrderId: attempt.gatewayOrderId,
                    eventType: parsed.event.type,
                    signatureValid: true,
                    status: 'PROCESSED',
                    processedAt: new Date(),
                    retentionExpiresAt: new Date(Date.now() + 90 * 86400000),
                },
            },
            { upsert: true, new: true }
        );

        await RetailPaymentAttemptModel.updateOne(
            { _id: attempt._id, status: { $in: ['CHECKOUT_READY', 'PAYMENT_PENDING', 'PAYMENT_FAILED'] } },
            {
                $set: {
                    status: 'PAYMENT_FAILED',
                    failureCode: String(parsed.event.failureCode || 'PAYMENT_FAILED').slice(0, 128),
                },
            }
        );
        return { received: true };
    }

    if (parsed.event.type !== 'payment.succeeded') return { received: true, ignored: true };

    const lookupAttempt = { ...attempt.toObject(), gatewayOrderId: attempt.gatewayOrderId || ref.orderId };
    const paid = await gateway.confirmPayment(lookupAttempt, config);
    if (!paid) fail('Payment capture is still pending', 'PAYMENT_PENDING', 503);

    const eventId = request.headers?.['x-razorpay-event-id'] || request.headers?.['x-idempotency-header'] || '';
    const dedupeKey = eventId || createHash('sha256').update(request.rawBody).digest('hex');

    return recordConfirmedPayment(lookupAttempt, paid, {
        dedupeKey,
        providerEventId: eventId,
        rawBody: request.rawBody,
        eventType: request.body.event || request.body.type,
    });
}

module.exports = {
    handleWebhook,
};


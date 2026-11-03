const logger = require('@src/utils/logger');
const crypto = require('crypto');
const { PaymentWebhookEventModel } = require('@src/models');
const { resolveGateway } = require('@src/lib/payment/gateway.factory');
const { GatewayError } = require('@src/lib/payment/errors');
const { GatewayEventType, PaymentStatus } = require('@src/lib/payment/events');
const { amountsMatch } = require('@src/lib/payment/money');
const { findPaymentByReference } = require('./lookup.service');
const { settleSuccess } = require('./verify.service');

async function handleWebhook(providerName, request) {
    const gateway = resolveGateway(providerName);
    const parsed = gateway.parseWebhook({
        rawBody: request.rawBody,
        headers: request.headers || {},
        body: request.body
    });

    if (!parsed.ok) {
        logger.warn('Payment webhook rejected', { gateway: gateway.id, reason: parsed.reason });
        throw new GatewayError(`Invalid webhook signature (${parsed.reason})`, {
            code: 'INVALID_SIGNATURE',
            statusCode: 400
        });
    }

    if (!parsed.event) {
        logger.info('Payment webhook ignored', { gateway: gateway.id, type: request.body?.event || request.body?.type || null });
        return { received: true, ignored: true };
    }

    // Persist the signed event before settlement. Provider retries become a
    // durable no-op, while failed processing remains inspectable/retryable.
    const eventId = String(parsed.event.eventId || parsed.event.providerEventId || parsed.event.id ||
        crypto.createHash('sha256').update(request.rawBody || JSON.stringify(request.body || {})).digest('hex'));
    let eventRecord;
    try {
        eventRecord = await PaymentWebhookEventModel.create({
            provider: gateway.id || providerName || 'default', eventId, type: parsed.event.type,
            payload: parsed.event,
        });
    } catch (error) {
        if (error.code === 11000) return { received: true, duplicate: true };
        throw error;
    }

    await PaymentWebhookEventModel.updateOne({ _id: eventRecord._id }, { $set: { status: 'PROCESSING' } });
    try {
        await applyGatewayEvent(gateway, parsed.event);
        await PaymentWebhookEventModel.updateOne({ _id: eventRecord._id }, { $set: { status: 'PROCESSED', processedAt: new Date() } });
    } catch (error) {
        await PaymentWebhookEventModel.updateOne({ _id: eventRecord._id }, { $set: { status: 'FAILED', error: String(error.message).slice(0, 2000) } });
        throw error;
    }
    return { received: true };
}

async function applyGatewayEvent(gateway, event) {
    const payment = await findPaymentByReference(event);
    if (!payment) {
        // Check if this webhook is for a retail store collect link
        const raw = event.raw || {};
        const linkNotes = raw?.data?.link?.link_notes
            || raw?.payload?.payment_link?.entity?.notes
            || raw?.payload?.payment?.entity?.notes;
        const collectLinkId = linkNotes?.paymentCollectLinkId || linkNotes?.collectLinkId;

        if (collectLinkId && event.type === GatewayEventType.PAYMENT_SUCCEEDED) {
            logger.info('webhook.retail_collect_link_detected', {
                gateway: gateway.id,
                collectLinkId,
                gatewayPaymentId: event.gatewayPaymentId,
                amount: event.amount,
            });

            try {
                const { paymentClient: retailPaymentGrpcClient } = require('@src/lib/grpc/clients/retailer');
                const applyResult = await retailPaymentGrpcClient.applyCustomerPayment({
                    collectLinkId,
                    storeId: linkNotes.storeId,
                    customerId: linkNotes.customerId,
                    amount: event.amount,
                    paymentMethod: event.paymentMethod || 'UPI',
                    gatewayPaymentId: event.gatewayPaymentId,
                    gatewayOrderId: event.gatewayOrderId,
                    idempotencyKey: `retail:webhook:${event.gatewayPaymentId || event.gatewayOrderId || Date.now()}`,
                    notes: linkNotes.notes || 'Store collect link payment settled via webhook',
                });

                logger.info('webhook.retail_collect_link_applied', {
                    collectLinkId,
                    success: applyResult.success,
                    paymentId: applyResult.paymentId,
                });
                return;
            } catch (err) {
                logger.error('webhook.retail_collect_link_failed', {
                    collectLinkId,
                    error: err.message,
                });
                throw err;
            }
        }

        logger.warn('Payment webhook for unknown order', {
            gateway: gateway.id,
            type: event.type,
            gatewayOrderId: event.gatewayOrderId
        });
        return;
    }

    if (event.type === GatewayEventType.PAYMENT_SUCCEEDED) {
        if (payment.status === PaymentStatus.SUCCESS) {
            await settleSuccess(payment, { paidAt: payment.paidAt, persistence: {} });
            return;
        }
        const confirmed = await gateway.getPaymentStatus(event.gatewayOrderId || payment.gatewayOrderId || payment.orderId, payment.finalAmount, {
            email: payment.metadata?.email,
            phone: payment.metadata?.phone
        });
        if (confirmed.status !== PaymentStatus.SUCCESS) {
            throw new GatewayError('Payment is not completed', { code: 'PAYMENT_PENDING', statusCode: 500 });
        }
        if (confirmed.amount != null && !amountsMatch(payment.finalAmount, confirmed.amount)) {
            throw new GatewayError('Paid amount does not match the order', { code: 'AMOUNT_MISMATCH', statusCode: 500 });
        }
        await settleSuccess(payment, confirmed, { source: 'webhook' });
        return;
    }

    if (event.type === GatewayEventType.PAYMENT_FAILED || event.type === GatewayEventType.PAYMENT_CANCELLED) {
        if (payment.status !== PaymentStatus.PENDING) return;
        payment.status = event.type === GatewayEventType.PAYMENT_CANCELLED ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
        payment.failureReason = event.failureReason;
        payment.failureCode = event.failureCode;
        if (event.paymentMethod) payment.paymentMethod = event.paymentMethod;
        if (event.gatewayPaymentId) payment.gatewayPaymentId = event.gatewayPaymentId;
        payment.gatewayResponse = event.raw;
        await payment.save();
        return;
    }

    if (event.type === GatewayEventType.REFUND_PENDING || event.type === GatewayEventType.REFUND_SUCCEEDED) {
        const refundAmount = event.refundAmount != null ? event.refundAmount : payment.finalAmount;
        payment.refundAmount = refundAmount;
        payment.refundStatus = event.type === GatewayEventType.REFUND_SUCCEEDED ? 'SUCCESS' : 'PENDING';
        payment.refundedAt = event.occurredAt || new Date();
        payment.status = refundAmount >= payment.finalAmount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
        payment.gatewayResponse = event.raw;
        await payment.save();
    }
}

module.exports = { handleWebhook };

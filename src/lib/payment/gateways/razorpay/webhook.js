const { GatewayEventType } = require('@src/lib/payment/events');
const { toMajorAmount } = require('@src/lib/payment/money');
const { hmac, timingSafeEqualHex } = require('@src/lib/payment/signature');

function paymentEvent(type, payment) {
    return {
        type,
        gatewayOrderId: payment.order_id || null,
        gatewayPaymentId: payment.id || null,
        merchantOrderId: null,
        amount: payment.amount != null ? toMajorAmount(payment.amount / 100) : null,
        refundAmount: null,
        currency: (payment.currency || 'INR').toUpperCase(),
        paymentMethod: payment.method || null,
        failureReason: null,
        failureCode: null,
        occurredAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
        raw: payment
    };
}

function parseWebhook(_client, config, { rawBody, headers, body }) {
    const signature = headers?.['x-razorpay-signature'];
    if (!signature) return { ok: false, reason: 'MISSING_SIGNATURE_HEADER' };
    if (!rawBody) return { ok: false, reason: 'MISSING_RAW_BODY' };
    if (!config.webhookSecret) return { ok: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };

    const expected = hmac(config.webhookSecret, rawBody, 'hex');
    if (!timingSafeEqualHex(expected, signature)) {
        return { ok: false, reason: 'SIGNATURE_MISMATCH' };
    }

    const eventName = body?.event;
    const payment = body?.payload?.payment?.entity;
    const order = body?.payload?.order?.entity;
    const refund = body?.payload?.refund?.entity;

    if (eventName === 'payment.captured' && payment) {
        return { ok: true, event: paymentEvent(GatewayEventType.PAYMENT_SUCCEEDED, payment) };
    }
    if (eventName === 'payment.failed' && payment) {
        return {
            ok: true,
            event: {
                ...paymentEvent(GatewayEventType.PAYMENT_FAILED, payment),
                failureReason: payment.error_description || 'Payment failed',
                failureCode: payment.error_code || 'PAYMENT_FAILED'
            }
        };
    }
    if (eventName === 'order.paid' && order) {
        return {
            ok: true,
            event: {
                type: GatewayEventType.PAYMENT_SUCCEEDED,
                gatewayOrderId: order.id,
                gatewayPaymentId: null,
                merchantOrderId: order.receipt || null,
                amount: order.amount != null ? toMajorAmount(order.amount / 100) : null,
                refundAmount: null,
                currency: (order.currency || 'INR').toUpperCase(),
                paymentMethod: null,
                failureReason: null,
                failureCode: null,
                occurredAt: null,
                raw: order
            }
        };
    }
    if ((eventName === 'refund.created' || eventName === 'refund.processed') && refund) {
        return {
            ok: true,
            event: {
                type: eventName === 'refund.processed' ? GatewayEventType.REFUND_SUCCEEDED : GatewayEventType.REFUND_PENDING,
                gatewayOrderId: null,
                gatewayPaymentId: refund.payment_id || null,
                merchantOrderId: null,
                amount: null,
                refundAmount: refund.amount != null ? toMajorAmount(refund.amount / 100) : null,
                currency: (refund.currency || 'INR').toUpperCase(),
                paymentMethod: null,
                failureReason: null,
                failureCode: null,
                occurredAt: refund.created_at ? new Date(refund.created_at * 1000) : new Date(),
                raw: refund
            }
        };
    }

    return { ok: true, event: null };
}

module.exports = { parseWebhook };

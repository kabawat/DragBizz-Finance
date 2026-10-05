const { GatewayEventType } = require('@src/lib/payment/events');
const { toMajorAmount } = require('@src/lib/payment/money');
const { hmac, timingSafeEqualHex } = require('@src/lib/payment/signature');

const WEBHOOK_TOLERANCE_SEC = 300;

function parseWebhook(_client, config, { rawBody, headers, body }) {
    const header = headers?.['stripe-signature'];
    if (!config.webhookSecret) return { ok: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };
    if (!header) return { ok: false, reason: 'MISSING_SIGNATURE' };
    if (!rawBody) return { ok: false, reason: 'MISSING_RAW_BODY' };

    const parts = Object.fromEntries(String(header).split(',').map((part) => part.split('=')));
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return { ok: false, reason: 'MISSING_SIGNATURE' };
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SEC) {
        return { ok: false, reason: 'TIMESTAMP_EXPIRED' };
    }

    const expected = hmac(config.webhookSecret, `${timestamp}.${rawBody}`, 'hex');
    if (!timingSafeEqualHex(expected, signature)) return { ok: false, reason: 'SIGNATURE_MISMATCH' };

    const type = body?.type;
    const object = body?.data?.object || {};
    if (type === 'payment_intent.succeeded' || type === 'payment_intent.payment_failed' || type === 'payment_intent.canceled') {
        const eventType = type === 'payment_intent.succeeded'
            ? GatewayEventType.PAYMENT_SUCCEEDED
            : type === 'payment_intent.canceled'
                ? GatewayEventType.PAYMENT_CANCELLED
                : GatewayEventType.PAYMENT_FAILED;
        return {
            ok: true,
            event: {
                type: eventType,
                gatewayOrderId: object.id || null,
                gatewayPaymentId: object.latest_charge || object.id || null,
                merchantOrderId: object.metadata?.orderId || null,
                amount: object.amount != null ? toMajorAmount(object.amount / 100) : null,
                refundAmount: null,
                currency: (object.currency || 'inr').toUpperCase(),
                paymentMethod: object.payment_method_types?.[0] || null,
                failureReason: object.last_payment_error?.message || null,
                failureCode: object.last_payment_error?.code || null,
                occurredAt: new Date(),
                raw: object
            }
        };
    }
    if (type === 'charge.refunded') {
        return {
            ok: true,
            event: {
                type: GatewayEventType.REFUND_SUCCEEDED,
                gatewayOrderId: object.payment_intent || null,
                gatewayPaymentId: object.payment_intent || object.id || null,
                merchantOrderId: object.metadata?.orderId || null,
                amount: null,
                refundAmount: object.amount_refunded != null ? toMajorAmount(object.amount_refunded / 100) : null,
                currency: (object.currency || 'inr').toUpperCase(),
                paymentMethod: null,
                failureReason: null,
                failureCode: null,
                occurredAt: new Date(),
                raw: object
            }
        };
    }
    return { ok: true, event: null };
}

module.exports = { parseWebhook };

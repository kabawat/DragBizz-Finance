const { GatewayEventType } = require('@src/lib/payment/events');
const { toMajorAmount } = require('@src/lib/payment/money');
const { hmac, timingSafeEqualText } = require('@src/lib/payment/signature');
const { paymentMethodFrom } = require('./customer');

const MAX_WEBHOOK_SKEW_MS = 5 * 60 * 1000;

function parseWebhook(_client, config, { rawBody, headers, body }) {
    const signature = headers?.['x-webhook-signature'];
    const timestamp = headers?.['x-webhook-timestamp'];
    if (!config.clientSecret) return { ok: false, reason: 'CLIENT_SECRET_NOT_CONFIGURED' };
    if (!signature) return { ok: false, reason: 'MISSING_SIGNATURE' };
    if (!timestamp) return { ok: false, reason: 'MISSING_TIMESTAMP' };
    if (!rawBody) return { ok: false, reason: 'MISSING_RAW_BODY' };

    const timestampMs = Number(timestamp);
    const millis = Number.isFinite(timestampMs) ? (timestampMs > 1e12 ? timestampMs : timestampMs * 1000) : null;
    if (millis !== null && Math.abs(Date.now() - millis) > MAX_WEBHOOK_SKEW_MS) {
        return { ok: false, reason: 'TIMESTAMP_EXPIRED' };
    }

    const expected = hmac(config.clientSecret, String(timestamp) + rawBody, 'base64');
    if (!timingSafeEqualText(expected, signature)) {
        return { ok: false, reason: 'SIGNATURE_MISMATCH' };
    }

    const type = body?.type;
    const order = body?.data?.order;
    const payment = body?.data?.payment;
    const link = body?.data?.link;

    const base = {
        gatewayOrderId: order?.order_id || link?.link_id || null,
        gatewayPaymentId: payment?.cf_payment_id != null ? String(payment.cf_payment_id) : null,
        merchantOrderId: order?.order_id || link?.link_id || null,
        amount: (order?.order_amount != null ? toMajorAmount(order.order_amount) : (link?.link_amount != null ? toMajorAmount(link.link_amount) : null)),
        refundAmount: null,
        currency: order?.order_currency || link?.link_currency || 'INR',
        paymentMethod: paymentMethodFrom(payment),
        failureReason: payment?.payment_message || null,
        failureCode: null,
        occurredAt: payment?.payment_time ? new Date(payment.payment_time) : new Date(),
        raw: body
    };

    if (type === 'PAYMENT_SUCCESS_WEBHOOK' || type === 'PAYMENT_LINK_EVENT' || type === 'PAYMENT_LINK_PAID_WEBHOOK') {
        return { ok: true, event: { ...base, type: GatewayEventType.PAYMENT_SUCCEEDED, failureReason: null } };
    }
    if (type === 'PAYMENT_FAILED_WEBHOOK') {
        return { ok: true, event: { ...base, type: GatewayEventType.PAYMENT_FAILED, failureCode: 'PAYMENT_FAILED' } };
    }
    if (type === 'PAYMENT_USER_DROPPED_WEBHOOK' || type === 'PAYMENT_LINK_CANCELLED_WEBHOOK' || type === 'PAYMENT_LINK_EXPIRED_WEBHOOK') {
        return {
            ok: true,
            event: {
                ...base,
                type: GatewayEventType.PAYMENT_CANCELLED,
                failureReason: type === 'PAYMENT_LINK_EXPIRED_WEBHOOK' ? 'Payment link expired' : 'Customer dropped or cancelled payment',
                failureCode: 'USER_DROPPED'
            }
        };
    }

    return { ok: true, event: null };
}

module.exports = { parseWebhook };

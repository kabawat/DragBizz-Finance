const axios = require('axios');
const { GatewayEventType, PaymentStatus } = require('@src/lib/payment/events');
const { GatewayError } = require('@src/lib/payment/errors');
const { toMajorAmount } = require('@src/lib/payment/money');
const { sha512, timingSafeEqualText } = require('@src/lib/payment/signature');

function clean(value) {
    return String(value || '').replace(/\|/g, ' ').trim();
}

function pipeHash(parts) {
    return sha512(parts.join('|'));
}

function requireKeyAndSalt(config, message) {
    if (!config.key || !config.salt) {
        throw new GatewayError(message, { code: 'GATEWAY_NOT_CONFIGURED', statusCode: 500 });
    }
}

function requireReturnUrls(config, message) {
    if (!config.successUrl || !config.failureUrl) {
        throw new GatewayError(message, { code: 'GATEWAY_NOT_CONFIGURED', statusCode: 500 });
    }
}

function readHostedConfig(section) {
    return {
        key: section.key,
        salt: section.salt,
        environment: section.environment,
        successUrl: section.successUrl,
        failureUrl: section.failureUrl
    };
}

function requireTransactionId(input, message) {
    const errors = {};
    if (!input?.orderId && !input?.gatewayOrderId) errors.orderId = message;
    return { isValid: Object.keys(errors).length === 0, errors };
}

function hostedFields(config, command) {
    return {
        key: config.key,
        txnid: command.orderId,
        amount: toMajorAmount(command.amount).toFixed(2),
        productinfo: clean(command.packageName || 'Subscription').slice(0, 100),
        firstname: clean(command.customerName || 'Customer').slice(0, 60),
        email: command.email,
        phone: String(command.phone || '').replace(/\D/g, '').slice(-10),
        surl: config.successUrl,
        furl: config.failureUrl,
        udf1: clean(command.userId).slice(0, 255)
    };
}

async function postForm(url, params) {
    const response = await axios.post(url, new URLSearchParams(params).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
}

function paymentResult({ success, gatewayOrderId, gatewayPaymentId, amount, paymentMethod, raw }) {
    return {
        status: success ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        gatewayOrderId,
        gatewayPaymentId: gatewayPaymentId || null,
        amount: amount != null ? toMajorAmount(amount) : null,
        currency: 'INR',
        paymentMethod: paymentMethod || null,
        paidAt: success ? new Date() : null,
        persistence: { gatewayResponse: raw },
        raw
    };
}

function statusEventType(status, { cancelled = [], failed = ['failure', 'failed'], fallback = GatewayEventType.PAYMENT_FAILED } = {}) {
    if (status === 'success') return GatewayEventType.PAYMENT_SUCCEEDED;
    if (cancelled.includes(status)) return GatewayEventType.PAYMENT_CANCELLED;
    if (failed.includes(status)) return GatewayEventType.PAYMENT_FAILED;
    return fallback;
}

function parseHashedWebhook(config, body, responseHash, mapEvent) {
    const payload = body || {};
    if (!payload.hash || !payload.txnid || !payload.status) return { ok: false, reason: 'MISSING_SIGNATURE' };
    if (!config.key || !config.salt) return { ok: false, reason: 'CLIENT_SECRET_NOT_CONFIGURED' };
    const expected = responseHash({ ...payload, key: config.key }, config.salt);
    if (!timingSafeEqualText(expected, payload.hash)) return { ok: false, reason: 'SIGNATURE_MISMATCH' };
    return { ok: true, event: mapEvent(payload) };
}

function hostedEvent(payload, { type, gatewayPaymentId, failureReason, failureCode }) {
    return {
        type,
        gatewayOrderId: payload.txnid,
        gatewayPaymentId: gatewayPaymentId || null,
        merchantOrderId: payload.txnid,
        amount: payload.amount != null ? toMajorAmount(payload.amount) : null,
        refundAmount: null,
        currency: 'INR',
        paymentMethod: payload.mode || null,
        failureReason: failureReason || null,
        failureCode: failureCode || null,
        occurredAt: new Date(),
        raw: payload
    };
}

module.exports = {
    clean,
    pipeHash,
    requireKeyAndSalt,
    requireReturnUrls,
    readHostedConfig,
    requireTransactionId,
    hostedFields,
    postForm,
    paymentResult,
    statusEventType,
    parseHashedWebhook,
    hostedEvent
};


const axios = require('axios');
const { GatewayError } = require('@src/lib/payment/errors');

const BASE_URL = {
    production: 'https://api.cashfree.com',
    sandbox: 'https://sandbox.cashfree.com',
};

const CASHFREE_API_VERSION = '2023-08-01';

function getBaseUrl(environment) {
    const env = String(environment || 'sandbox').toLowerCase();
    return env === 'production' ? BASE_URL.production : BASE_URL.sandbox;
}

function buildHeaders(clientId, clientSecret) {
    return {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': CASHFREE_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
}

// Creates a Cashfree Payment Link (
async function createPaymentLink(config, command) {
    const { clientId, clientSecret, environment } = config;
    if (!clientId || !clientSecret) {
        throw new GatewayError('Cashfree credentials not configured', {
            code: 'GATEWAY_NOT_CONFIGURED',
            statusCode: 500,
        });
    }

    const expiresAt =
        command.expiresAt ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const body = {
        link_amount: Number(Number(command.amount).toFixed(2)),
        link_currency: command.currency || 'INR',
        link_purpose: (command.description || 'Payment').slice(0, 500),
        customer_details: {
            customer_name: (command.customer?.name || 'Customer').slice(0, 100),
            customer_phone: String(command.customer?.phone || '').replace(/\D/g, '').slice(-10) || '9999999999',
            ...(command.customer?.email && { customer_email: command.customer.email }),
        },
        link_notify: { send_sms: false, send_email: false },
        link_auto_reminders: false,
        link_expiry_time: expiresAt,
        ...(command.linkId && { link_id: String(command.linkId).slice(0, 50) }),
        ...(command.notes && Object.keys(command.notes).length > 0 && {
            link_notes: Object.fromEntries(
                Object.entries(command.notes).map(([k, v]) => [String(k).slice(0, 50), String(v).slice(0, 500)])
            ),
        }),
    };

    const baseUrl = getBaseUrl(environment);
    try {
        const response = await axios.post(`${baseUrl}/pg/links`, body, {
            headers: buildHeaders(clientId, clientSecret),
            timeout: 15000,
        });

        const data = response.data;
        if (!data?.link_id) {
            throw new GatewayError('Cashfree payment link creation returned invalid response', {
                code: 'INVALID_GATEWAY_RESPONSE',
                statusCode: 502,
            });
        }

        return {
            id: data.link_id,
            shortUrl: data.link_url || null,
            status: data.link_status || 'ACTIVE',
            raw: data,
        };
    } catch (error) {
        if (error instanceof GatewayError) throw error;
        if (error.response) {
            const status = error.response.status;
            const msg =
                error.response.data?.message ||
                error.response.data?.type ||
                'Cashfree payment link creation failed';
            throw new GatewayError(msg, { code: 'CASHFREE_API_ERROR', statusCode: status >= 500 ? 502 : 400 });
        }
        throw new GatewayError(
            error.message || 'Failed to create Cashfree payment link',
            { code: 'CASHFREE_NETWORK_ERROR', statusCode: 502 }
        );
    }
}

// Cancels a Cashfree Payment Link.
async function cancelPaymentLink(config, linkId) {
    const { clientId, clientSecret, environment } = config;
    if (!clientId || !clientSecret) {
        throw new GatewayError('Cashfree credentials not configured', {
            code: 'GATEWAY_NOT_CONFIGURED',
            statusCode: 500,
        });
    }

    const baseUrl = getBaseUrl(environment);
    try {
        const response = await axios.post(
            `${baseUrl}/pg/links/${encodeURIComponent(linkId)}/cancel`,
            {},
            {
                headers: buildHeaders(clientId, clientSecret),
                timeout: 15000,
            }
        );
        return { success: true, raw: response.data };
    } catch (error) {
        if (error instanceof GatewayError) throw error;
        if (error.response) {
            const msg =
                error.response.data?.message ||
                'Cashfree payment link cancellation failed';
            throw new GatewayError(msg, {
                code: 'CASHFREE_CANCEL_ERROR',
                statusCode: error.response.status >= 500 ? 502 : 400,
            });
        }
        throw new GatewayError(
            error.message || 'Failed to cancel Cashfree payment link',
            { code: 'CASHFREE_NETWORK_ERROR', statusCode: 502 }
        );
    }
}

//  Parses a Cashfree Payment Link webhook.
function parsePaymentLinkWebhook(config, { rawBody, headers, body }) {
    const { hmac, timingSafeEqualText } = require('@src/lib/payment/signature');
    const { GatewayEventType } = require('@src/lib/payment/events');
    const { toMajorAmount } = require('@src/lib/payment/money');

    const signature = headers?.['x-webhook-signature'];
    const timestamp = headers?.['x-webhook-timestamp'];

    if (!config.clientSecret) return { ok: false, reason: 'CLIENT_SECRET_NOT_CONFIGURED' };
    if (!signature) return { ok: false, reason: 'MISSING_SIGNATURE' };
    if (!timestamp) return { ok: false, reason: 'MISSING_TIMESTAMP' };
    if (!rawBody) return { ok: false, reason: 'MISSING_RAW_BODY' };

    const MAX_WEBHOOK_SKEW_MS = 5 * 60 * 1000;
    const timestampMs = Number(timestamp);
    const millis = Number.isFinite(timestampMs)
        ? timestampMs > 1e12
            ? timestampMs
            : timestampMs * 1000
        : null;
    if (millis !== null && Math.abs(Date.now() - millis) > MAX_WEBHOOK_SKEW_MS) {
        return { ok: false, reason: 'TIMESTAMP_EXPIRED' };
    }

    const expected = hmac(config.clientSecret, String(timestamp) + rawBody, 'base64');
    if (!timingSafeEqualText(expected, signature)) {
        return { ok: false, reason: 'SIGNATURE_MISMATCH' };
    }

    const type = body?.type;
    const linkData = body?.data;
    const payment = linkData?.payment || {};
    const link = linkData?.link || {};

    const base = {
        gatewayOrderId: link?.link_id || null,
        gatewayPaymentId: payment?.cf_payment_id != null ? String(payment.cf_payment_id) : null,
        merchantOrderId: link?.link_id || null,
        amount: link?.link_amount != null ? toMajorAmount(link.link_amount) : null,
        refundAmount: null,
        currency: link?.link_currency || 'INR',
        paymentMethod: payment?.payment_group || payment?.payment_method || null,
        failureReason: payment?.payment_message || null,
        failureCode: null,
        occurredAt: payment?.payment_time ? new Date(payment.payment_time) : new Date(),
        raw: body,
        // Extra: link notes for store collect link routing
        linkNotes: link?.link_notes || null,
        isPaymentLink: true,
    };

    if (type === 'PAYMENT_LINK_EVENT' || type === 'PAYMENT_LINK_PAID_WEBHOOK') {
        return { ok: true, event: { ...base, type: GatewayEventType.PAYMENT_SUCCEEDED, failureReason: null } };
    }
    if (type === 'PAYMENT_LINK_CANCELLED_WEBHOOK') {
        return {
            ok: true,
            event: { ...base, type: GatewayEventType.PAYMENT_CANCELLED, failureReason: 'Payment link cancelled' },
        };
    }
    if (type === 'PAYMENT_LINK_EXPIRED_WEBHOOK') {
        return {
            ok: true,
            event: { ...base, type: GatewayEventType.PAYMENT_CANCELLED, failureReason: 'Payment link expired' },
        };
    }

    return { ok: true, event: null };
}

module.exports = { createPaymentLink, cancelPaymentLink, parsePaymentLinkWebhook };


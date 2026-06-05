const crypto = require('crypto');
const { verifyWebhookSignatureDetailed } = require('@src/utils/payment/razorpay.verify');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');
const WebhookService = require('@src/services/payment/webhook');
const SECRET = require('@config/env.config');

const LOG = '[WEBHOOK]';

function bodyFingerprint(str) {
    if (!str) return null;
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 12);
}

async function razorpayWebhookController(req, res) {
    const path = req.originalUrl || req.url || '';
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody;
    const serializedBody = req.body ? JSON.stringify(req.body) : '';

    console.log(`${LOG} [1] incoming request`, {
        method: req.method,
        path,
        ip: req.ip,
        contentType: req.headers['content-type'],
        event: req.body?.event,
        hasSignatureHeader: Boolean(signature),
        hasRawBody: Boolean(rawBody),
        rawBodyLen: rawBody?.length || 0,
        parsedBodyLen: serializedBody.length,
        rawBodyFp: bodyFingerprint(rawBody),
        parsedBodyFp: bodyFingerprint(serializedBody),
        bodiesMatch: rawBody && serializedBody ? rawBody === serializedBody : null,
        mode: SECRET.razorpay?.mode,
        hasWebhookSecret: Boolean(SECRET.razorpay?.webhookSecret),
        webhookSecretLen: SECRET.razorpay?.webhookSecret?.length || 0,
    });

    if (!signature) {
        console.log(`${LOG} [FAIL] reason=MISSING_SIGNATURE_HEADER`);
        return Response.validationError(res, 'Webhook signature missing');
    }

    if (!rawBody) {
        console.log(`${LOG} [FAIL] reason=MISSING_RAW_BODY`, {
            hint: 'express.json verify must run for /webhooks path; check nginx does not strip body',
            path,
            contentLength: req.headers['content-length'],
        });
        return Response.validationError(res, 'Raw body missing for signature verification');
    }

    if (serializedBody && rawBody !== serializedBody) {
        console.log(`${LOG} [WARN] rawBody !== JSON.stringify(req.body) — signature must use exact raw bytes Razorpay sent`, {
            rawBodyFp: bodyFingerprint(rawBody),
            parsedBodyFp: bodyFingerprint(serializedBody),
            rawPreview: rawBody.slice(0, 120),
            parsedPreview: serializedBody.slice(0, 120),
        });
    }

    const verification = verifyWebhookSignatureDetailed(rawBody, signature);
    console.log(`${LOG} [2] signature check`, {
        ok: verification.ok,
        reason: verification.reason,
        ...verification.debug,
    });

    if (!verification.ok) {
        if (verification.reason === 'SIGNATURE_MISMATCH') {
            console.log(`${LOG} [FAIL] wrong RAZORPAY_WEBHOOK_SECRET (do NOT use RAZORPAY_KEY_SECRET)`, {
                mode: SECRET.razorpay?.mode,
                hint: 'Dashboard → Test/Live mode → Webhooks → open YOUR webhook URL → copy Secret → restart container',
            });
        }
        if (verification.reason === 'WEBHOOK_SECRET_NOT_CONFIGURED') {
            console.log(`${LOG} [FAIL] fix: add RAZORPAY_WEBHOOK_SECRET to subscription service .env`);
        }
        logger.warn('Webhook signature rejected', { reason: verification.reason, mode: SECRET.razorpay?.mode });
        return Response.validationError(res, `Invalid webhook signature (${verification.reason})`);
    }

    const { event, payload } = req.body || {};
    if (!event) {
        console.log(`${LOG} [FAIL] reason=MISSING_EVENT_IN_BODY`, { bodyKeys: Object.keys(req.body || {}) });
        return Response.validationError(res, 'Webhook event missing in body');
    }

    const HANDLED_EVENTS = ['payment.captured', 'payment.failed', 'order.paid', 'refund.created', 'refund.processed'];
    if (!HANDLED_EVENTS.includes(event)) {
        console.log(`${LOG} [SKIP] unhandled event (200 ack):`, event);
        return res.status(200).json({ received: true });
    }

    try {
        console.log(`${LOG} [3] handler start:`, event);
        switch (event) {
            case 'payment.captured':
                await WebhookService.handlePaymentCaptured(payload);
                break;
            case 'payment.failed':
                await WebhookService.handlePaymentFailed(payload);
                break;
            case 'order.paid':
                await WebhookService.handleOrderPaid(payload);
                break;
            case 'refund.created':
                await WebhookService.handleRefundCreated(payload);
                break;
            case 'refund.processed':
                await WebhookService.handleRefundProcessed(payload);
                break;
        }
        console.log(`${LOG} [4] handler success:`, event);
        return res.status(200).json({ received: true });
    } catch (error) {
        console.log(`${LOG} [ERR] handler failed`, { event, message: error.message, stack: error.stack });
        logger.error(`Webhook handler fatal error [${event}]`, { error: error.message, stack: error.stack });
        return res.status(500).json({ received: false, error: 'Internal processing error' });
    }
}

module.exports = razorpayWebhookController;

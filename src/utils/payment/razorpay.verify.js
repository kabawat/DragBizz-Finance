const crypto = require('crypto');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');

function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
        const secret = SECRET.razorpay.keySecret;
        const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        if (expectedSignature.length !== razorpaySignature.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(razorpaySignature, 'hex')
        );
    } catch (error) {
        logger.error('Error verifying Razorpay signature', { error: error?.message, stack: error?.stack });
        return false;
    }
}

/**
 * Returns { ok, reason, debug } for webhook troubleshooting (no full secrets in logs).
 */
function verifyWebhookSignatureDetailed(rawBody, signatureHeader) {
    const debug = {
        mode: SECRET.razorpay?.mode,
        hasWebhookSecret: Boolean(SECRET.razorpay?.webhookSecret),
        webhookSecretLen: SECRET.razorpay?.webhookSecret?.length || 0,
        rawBodyLen: rawBody?.length || 0,
        signatureLen: signatureHeader?.length || 0,
    };

    if (!signatureHeader || typeof signatureHeader !== 'string') {
        return { ok: false, reason: 'MISSING_SIGNATURE_HEADER', debug };
    }

    if (!rawBody || typeof rawBody !== 'string') {
        return { ok: false, reason: 'MISSING_RAW_BODY', debug };
    }

    const secret = SECRET.razorpay.webhookSecret;
    if (!secret) {
        return { ok: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED', debug };
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        debug.expectedSigPrefix = expectedSignature.slice(0, 8);
        debug.receivedSigPrefix = signatureHeader.slice(0, 8);
        debug.expectedLen = expectedSignature.length;
        debug.receivedLen = signatureHeader.length;

        if (expectedSignature.length !== signatureHeader.length) {
            return { ok: false, reason: 'SIGNATURE_LENGTH_MISMATCH', debug };
        }

        const match = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(signatureHeader, 'hex')
        );

        if (!match) {
            return { ok: false, reason: 'SIGNATURE_MISMATCH', debug };
        }

        return { ok: true, reason: 'OK', debug };
    } catch (error) {
        debug.error = error.message;
        return { ok: false, reason: 'VERIFY_EXCEPTION', debug };
    }
}

function verifyWebhookSignature(payload, signature) {
    return verifyWebhookSignatureDetailed(payload, signature).ok;
}

module.exports = {
    verifyPaymentSignature,
    verifyWebhookSignature,
    verifyWebhookSignatureDetailed,
};

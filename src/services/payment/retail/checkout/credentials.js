const { paymentClient: core } = require('@src/lib/grpc/clients/retailer');
const SECRET = require('@src/config/env.config');

function httpError(message, code = 'RETAIL_PAYMENT_ERROR', statusCode = 409) {
    return Object.assign(new Error(message), { code, statusCode });
}

async function getCredentials(attempt, purpose) {
    const result = await core.getGatewayCredentialForAttempt({
        financeAttemptId: attempt.financeAttemptId,
        purpose,
    });
    if (!result.success) {
        throw httpError('Gateway configuration unavailable', 'GATEWAY_NOT_CONFIGURED', 503);
    }

    const c = result.credentials || {};
    const base = String(SECRET.server.url || '').replace(/\/+$/, '');
    if (!base) {
        throw httpError('Public server URL is not configured', 'SERVER_URL_REQUIRED', 503);
    }

    const mode = String(result.gatewayMode || '').toLowerCase();
    return {
        keyId: c.keyId,
        keySecret: c.keySecret,
        webhookSecret: c.webhookSecret,
        clientId: c.clientId,
        clientSecret: c.clientSecret,
        environment: ['live', 'production', 'prod'].includes(mode) ? 'production' : 'sandbox',
        notifyUrl: `${base}/finance/webhooks/retail/cashfree`,
        returnUrl: `${base}/payment/return?attemptId=${encodeURIComponent(attempt.financeAttemptId)}`,
        credentialVersion: result.gatewayCredentialVersion,
    };
}

module.exports = {
    getCredentials,
};

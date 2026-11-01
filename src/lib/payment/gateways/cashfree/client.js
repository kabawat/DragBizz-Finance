const { Cashfree, CFEnvironment } = require('cashfree-pg');
const { GatewayError } = require('@src/lib/payment/errors');

function createClient(config) {
    let client = null;

    function sdk() {
        if (!config.clientId || !config.clientSecret) {
            throw new GatewayError('Cashfree credentials not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.', {
                code: 'GATEWAY_NOT_CONFIGURED',
                statusCode: 500
            });
        }
        if (!client) {
            const env = config.environment === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
            client = new Cashfree(env, config.clientId, config.clientSecret, undefined, undefined, undefined, false);
            if (config.apiVersion) client.XApiVersion = config.apiVersion;
        }
        return client;
    }

    function notifyUrl() {
        if (config.notifyUrl) return config.notifyUrl;
        const base = (config.serverUrl || '').replace(/\/$/, '');
        return base ? `${base}/webhooks/cashfree` : null;
    }

    return { sdk, notifyUrl };
}

module.exports = { createClient };

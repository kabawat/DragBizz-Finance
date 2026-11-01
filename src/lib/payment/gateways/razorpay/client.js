const Razorpay = require('razorpay');
const { GatewayError } = require('@src/lib/payment/errors');

function createClient(config) {
    let client = null;

    function sdk() {
        if (!config.keyId || !config.keySecret) {
            throw new GatewayError('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.', {
                code: 'GATEWAY_NOT_CONFIGURED',
                statusCode: 500
            });
        }
        if (!client) {
            client = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
        }
        return client;
    }

    return { sdk };
}

module.exports = { createClient };

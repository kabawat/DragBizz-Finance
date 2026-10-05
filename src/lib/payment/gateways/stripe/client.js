const axios = require('axios');
const { GatewayError } = require('@src/lib/payment/errors');
const { guardProvider } = require('@src/lib/payment/provider-error');

const BASE_URL = 'https://api.stripe.com/v1';

function createClient(config) {
    function auth() {
        if (!config.secretKey) {
            throw new GatewayError('Stripe credentials not configured. Set STRIPE_SECRET_KEY.', {
                code: 'GATEWAY_NOT_CONFIGURED',
                statusCode: 500
            });
        }
        return { username: config.secretKey, password: '' };
    }

    function request(method, path, params) {
        const credentials = auth();
        return guardProvider('Stripe request failed', async () => {
            const response = await axios({
                method,
                url: `${BASE_URL}${path}`,
                auth: credentials,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: params ? new URLSearchParams(params).toString() : undefined
            });
            return response.data;
        });
    }

    return { request };
}

module.exports = { createClient };

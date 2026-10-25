const axios = require('axios');

function getGatewayClient(provider, config) {
    if (provider === 'RAZORPAY') {
        return axios.create({
            baseURL: 'https://api.razorpay.com/v1',
            timeout: 10000,
            maxContentLength: 256 * 1024,
            maxBodyLength: 256 * 1024,
            auth: { username: config.keyId, password: config.keySecret },
        });
    }
    if (provider === 'CASHFREE') {
        return axios.create({
            baseURL: config.environment === 'production'
                ? 'https://api.cashfree.com/pg'
                : 'https://sandbox.cashfree.com/pg',
            timeout: 10000,
            maxContentLength: 256 * 1024,
            maxBodyLength: 256 * 1024,
            headers: {
                'x-client-id': config.clientId,
                'x-client-secret': config.clientSecret,
                'x-api-version': '2025-01-01',
            },
        });
    }
    throw new Error('Retail payments support Razorpay and Cashfree');
}

function formatCheckoutData(provider, config, order) {
    if (provider === 'RAZORPAY') {
        return {
            gatewayOrderId: order.id,
            razorpayOrderId: order.id,
            keyId: config.keyId,
        };
    }
    return {
        gatewayOrderId: order.order_id,
        cashfreeOrderId: order.order_id,
        paymentSessionId: order.payment_session_id,
        cashfreeMode: config.environment,
    };
}

module.exports = {
    getGatewayClient,
    formatCheckoutData,
};


const { registerGateway } = require('@src/lib/payment/registry');
const { bindGateway } = require('@src/lib/payment/bind');
const { createClient } = require('./client');
const { readCashfreeConfig } = require('./config');
const { validateVerificationInput, createOrder } = require('./order');
const { verifyPayment, getPaymentStatus, capturePayment, refund } = require('./payment');
const { parseWebhook } = require('./webhook');

function createCashfreeGateway(config) {
    return bindGateway({
        id: 'cashfree',
        schemaId: 'CASHFREE',
        requiresCustomerPhone: true,
        client: createClient(config),
        config,
        handlers: { validateVerificationInput, createOrder, verifyPayment, getPaymentStatus, capturePayment, refund, parseWebhook }
    });
}

registerGateway('cashfree', { create: createCashfreeGateway, readConfig: readCashfreeConfig });

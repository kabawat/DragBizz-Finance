const { registerGateway } = require('@src/lib/payment/registry');
const { bindGateway } = require('@src/lib/payment/bind');
const { createClient } = require('./client');
const { readStripeConfig } = require('./config');
const { validateVerificationInput, createOrder } = require('./order');
const { verifyPayment, getPaymentStatus, capturePayment, refund } = require('./payment');
const { parseWebhook } = require('./webhook');

function createStripeGateway(config) {
    return bindGateway({
        id: 'stripe',
        schemaId: 'STRIPE',
        client: createClient(config),
        config,
        handlers: { validateVerificationInput, createOrder, verifyPayment, getPaymentStatus, capturePayment, refund, parseWebhook }
    });
}

registerGateway('stripe', { create: createStripeGateway, readConfig: readStripeConfig });

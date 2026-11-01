const { registerGateway } = require('@src/lib/payment/registry');
const { bindGateway } = require('@src/lib/payment/bind');
const { readHostedConfig } = require('@src/lib/payment/form');
const { createClient } = require('./client');
const { validateVerificationInput, createOrder } = require('./order');
const { verifyPayment, getPaymentStatus, capturePayment, refund } = require('./payment');
const { parseWebhook } = require('./webhook');

function createEasebuzzGateway(config) {
    return bindGateway({
        id: 'easebuzz',
        schemaId: 'EASEBUZZ',
        requiresCustomerPhone: true,
        requiresCustomerEmail: true,
        client: createClient(config),
        config,
        handlers: { validateVerificationInput, createOrder, verifyPayment, getPaymentStatus, capturePayment, refund, parseWebhook }
    });
}

registerGateway('easebuzz', { create: createEasebuzzGateway, readConfig: (secret) => readHostedConfig(secret.easebuzz) });

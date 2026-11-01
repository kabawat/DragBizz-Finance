const { registerGateway } = require('@src/lib/payment/registry');
const { bindGateway } = require('@src/lib/payment/bind');
const { createClient } = require('./client');
const { readRazorpayConfig } = require('./config');
const { validateVerificationInput, createOrder } = require('./order');
const { verifyPayment, getPaymentStatus, capturePayment, refund } = require('./payment');
const { parseWebhook } = require('./webhook');

function createRazorpayGateway(config) {
    return bindGateway({
        id: 'razorpay',
        schemaId: 'RAZORPAY',
        client: createClient(config),
        config,
        handlers: { validateVerificationInput, createOrder, verifyPayment, getPaymentStatus, capturePayment, refund, parseWebhook }
    });
}

registerGateway('razorpay', { create: createRazorpayGateway, readConfig: readRazorpayConfig });

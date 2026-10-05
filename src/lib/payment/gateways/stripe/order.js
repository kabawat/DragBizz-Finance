const { GatewayError } = require('@src/lib/payment/errors');
const { toMinorAmount } = require('@src/lib/payment/money');

function validateVerificationInput(input) {
    const errors = {};
    const id = input?.gatewayOrderId || input?.orderId;
    if (!id || !String(id).startsWith('pi_')) errors.gatewayOrderId = 'Stripe payment intent ID is required';
    return { isValid: Object.keys(errors).length === 0, errors };
}

async function createOrder(client, config, command) {
    const intent = await client.request('post', '/payment_intents', {
        amount: String(toMinorAmount(command.amount)),
        currency: (command.currency || 'INR').toLowerCase(),
        'automatic_payment_methods[enabled]': 'true',
        'metadata[orderId]': command.orderId,
        'metadata[userId]': String(command.userId),
        'metadata[packageId]': String(command.packageId)
    });
    if (!intent?.id || !intent?.client_secret) {
        throw new GatewayError('Invalid response from Stripe: payment intent not found');
    }
    return {
        gatewayOrderId: intent.id,
        checkout: {
            gatewayOrderId: intent.id,
            clientSecret: intent.client_secret,
            publishableKey: config.publishableKey || null
        },
        persistence: { gatewayResponse: intent },
        raw: intent
    };
}

module.exports = {
    validateVerificationInput,
    createOrder
};

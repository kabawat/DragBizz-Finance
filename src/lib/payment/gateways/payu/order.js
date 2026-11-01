const { requireReturnUrls, requireTransactionId, hostedFields } = require('@src/lib/payment/form');
const { requestHash } = require('./hash');

function validateVerificationInput(input) {
    return requireTransactionId(input, 'PayU transaction id is required');
}

async function createOrder(client, config, command) {
    client.credentials();
    requireReturnUrls(config, 'PayU return URLs are not configured. Set PAYU_SUCCESS_URL and PAYU_FAILURE_URL.');
    const fields = hostedFields(config, command);
    fields.hash = requestHash(fields, config.salt);
    return {
        gatewayOrderId: command.orderId,
        checkout: {
            gatewayOrderId: command.orderId,
            actionUrl: `${client.baseUrl}/_payment`,
            fields
        },
        persistence: {},
        raw: fields
    };
}

module.exports = {
    validateVerificationInput,
    createOrder
};

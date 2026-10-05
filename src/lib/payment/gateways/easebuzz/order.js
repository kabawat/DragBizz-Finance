const { GatewayError } = require('@src/lib/payment/errors');
const { guardProvider } = require('@src/lib/payment/provider-error');
const { requireReturnUrls, requireTransactionId, hostedFields, postForm } = require('@src/lib/payment/form');
const { requestHash } = require('./hash');

function validateVerificationInput(input) {
    return requireTransactionId(input, 'Easebuzz transaction id is required');
}

async function createOrder(client, config, command) {
    client.credentials();
    requireReturnUrls(config, 'Easebuzz return URLs are not configured. Set EASEBUZZ_SUCCESS_URL and EASEBUZZ_FAILURE_URL.');
    const fields = hostedFields(config, command);
    fields.hash = requestHash(fields, config.salt);

    const data = await guardProvider('Failed to create Easebuzz order', () => postForm(`${client.payBase}/payment/initiateLink`, fields));
    if (data?.status !== 1 || !data?.data) {
        throw new GatewayError(`Failed to create Easebuzz order: ${data?.data || data?.error_desc || 'initiate failed'}`);
    }
    const accessKey = data.data;
    return {
        gatewayOrderId: command.orderId,
        checkout: {
            gatewayOrderId: command.orderId,
            actionUrl: `${client.payBase}/pay/${accessKey}`,
            accessKey
        },
        persistence: {
            metadataPatch: { email: command.email, phone: fields.phone }
        },
        raw: data
    };
}

module.exports = {
    validateVerificationInput,
    createOrder
};

const { GatewayError } = require('@src/lib/payment/errors');

function providerMessage(error) {
    return error?.response?.data?.message
        || error?.response?.data?.error?.message
        || error?.response?.data?.error_description
        || (typeof error?.response?.data === 'string' ? error.response.data : null)
        || error?.error?.description
        || error?.message
        || 'Unknown provider error';
}

async function guardProvider(action, fn) {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof GatewayError) throw error;
        throw new GatewayError(`${action}: ${providerMessage(error)}`);
    }
}

module.exports = {
    providerMessage,
    guardProvider
};

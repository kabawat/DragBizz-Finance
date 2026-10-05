function bindGateway({
    id,
    schemaId,
    requiresCustomerPhone = false,
    requiresCustomerEmail = false,
    client,
    config,
    handlers
}) {
    const call = (name) => (...args) => handlers[name](client, config, ...args);

    return {
        id,
        schemaId,
        requiresCustomerPhone,
        requiresCustomerEmail,
        validateVerificationInput: handlers.validateVerificationInput,
        createOrder: call('createOrder'),
        verifyPayment: call('verifyPayment'),
        getPaymentStatus: call('getPaymentStatus'),
        capturePayment: call('capturePayment'),
        refund: call('refund'),
        parseWebhook: call('parseWebhook')
    };
}

module.exports = { bindGateway };

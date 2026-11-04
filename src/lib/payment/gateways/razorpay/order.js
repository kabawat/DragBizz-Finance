const { GatewayError } = require('@src/lib/payment/errors');
const { toMinorAmount } = require('@src/lib/payment/money');
const { guardProvider } = require('@src/lib/payment/provider-error');
const { providerMessage } = require('@src/lib/payment/provider-error');
const logger = require('@src/utils/logger');

function validateVerificationInput(input) {
    const errors = {};
    if (!input?.gatewayOrderId) errors.razorpayOrderId = 'Razorpay order ID is required and must be valid';
    if (!input?.gatewayPaymentId) errors.razorpayPaymentId = 'Razorpay payment ID is required and must be valid';
    if (!input?.signature || input.signature.length > 200) errors.razorpaySignature = 'Razorpay signature is required and must be valid';
    return { isValid: Object.keys(errors).length === 0, errors };
}

async function createOrder(client, config, command) {
    const request = {
            amount: toMinorAmount(command.amount),
            currency: command.currency || 'INR',
            receipt: command.orderId,
            notes: {
                userId: command.userId,
                packageId: String(command.packageId),
                months: command.months,
                billingCycle: command.billingCycle,
                packageName: (command.packageName || '').slice(0, 250),
                ...(command.email && { email: command.email }),
                ...(command.phone && { phone: command.phone })
            }
        };

    logger.info('razorpay.order.create.started', {
        receipt: command.orderId,
        amountMinor: request.amount,
        currency: request.currency,
        mode: config.mode,
        keyPrefix: config.keyId ? config.keyId.slice(0, 9) : null,
    });

    let order;
    try {
        order = await guardProvider('Failed to create Razorpay order', () => client.sdk().orders.create(request));
    } catch (error) {
        logger.error('razorpay.order.create.failed', {
            receipt: command.orderId,
            code: error.code,
            statusCode: error.statusCode,
            providerMessage: providerMessage(error),
        });
        throw error;
    }
    if (!order?.id) {
        throw new GatewayError('Invalid response from Razorpay: Order ID not found');
    }
    logger.info('razorpay.order.create.succeeded', { receipt: command.orderId, gatewayOrderId: order.id });
    return {
        gatewayOrderId: order.id,
        checkout: {
            gatewayOrderId: order.id,
            razorpayOrderId: order.id,
            keyId: config.keyId || null
        },
        persistence: {
            razorpayOrderId: order.id,
            razorpayResponse: order
        },
        raw: order
    };
}

module.exports = {
    validateVerificationInput,
    createOrder
};

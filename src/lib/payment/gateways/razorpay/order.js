const { GatewayError } = require('@src/lib/payment/errors');
const { toMinorAmount } = require('@src/lib/payment/money');
const { guardProvider } = require('@src/lib/payment/provider-error');

function validateVerificationInput(input) {
    const errors = {};
    if (!input?.gatewayOrderId) errors.razorpayOrderId = 'Razorpay order ID is required and must be valid';
    if (!input?.gatewayPaymentId) errors.razorpayPaymentId = 'Razorpay payment ID is required and must be valid';
    if (!input?.signature || input.signature.length > 200) errors.razorpaySignature = 'Razorpay signature is required and must be valid';
    return { isValid: Object.keys(errors).length === 0, errors };
}

async function createOrder(client, config, command) {
    const order = await guardProvider('Failed to create Razorpay order', () => client.sdk().orders.create({
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
        }));
    if (!order?.id) {
        throw new GatewayError('Invalid response from Razorpay: Order ID not found');
    }
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

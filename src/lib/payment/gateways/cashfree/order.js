const { GatewayError } = require('@src/lib/payment/errors');
const { toMajorAmount } = require('@src/lib/payment/money');
const { guardProvider } = require('@src/lib/payment/provider-error');
const { toCustomerId, toPhone } = require('./customer');

function validateVerificationInput(input) {
    const errors = {};
    const orderId = input?.orderId || input?.gatewayOrderId;
    if (!orderId || orderId.length > 50) errors.orderId = 'Cashfree order ID is required and must be valid';
    return { isValid: Object.keys(errors).length === 0, errors };
}

async function createOrder(client, config, command) {
    const customerPhone = toPhone(command.phone);
    if (!customerPhone) {
        throw new GatewayError('A valid 10-digit phone number is required for Cashfree', {
            code: 'VALIDATION',
            statusCode: 400
        });
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const orderMeta = {};
    if (config.returnUrl) orderMeta.return_url = config.returnUrl;
    const webhookUrl = client.notifyUrl();
    if (webhookUrl) orderMeta.notify_url = webhookUrl;

    const storeName = command.storeName;
    const orderNote = command.orderNote
        || (storeName ? `Payment to ${storeName}` : null)
        || (command.packageName ? `${command.packageName}${command.months ? ` · ${command.months} month(s)` : ''}` : 'Payment Request');

    const request = {
        order_amount: toMajorAmount(command.amount),
        order_currency: command.currency || 'INR',
        order_id: command.orderId,
        customer_details: {
            customer_id: toCustomerId(command.userId),
            customer_phone: customerPhone,
            ...(command.email && { customer_email: command.email })
        },
        order_note: orderNote.slice(0, 200),
        order_expiry_time: expiresAt.toISOString(),
        order_tags: {
            userId: String(command.userId || '').slice(0, 100),
            storeName: String(storeName || '').slice(0, 100),
            packageId: String(command.packageId || '').slice(0, 50),
            months: String(command.months || ''),
            billingCycle: command.billingCycle || ''
        },
        ...(Object.keys(orderMeta).length && { order_meta: orderMeta })
    };

    const response = await guardProvider('Failed to create Cashfree order', () => client.sdk().PGCreateOrder(request));
    const order = response?.data;
    if (!order?.payment_session_id || !order?.order_id) {
        throw new GatewayError('Invalid response from Cashfree: payment session not found');
    }
    return {
        gatewayOrderId: order.order_id,
        checkout: {
            gatewayOrderId: order.order_id,
            paymentSessionId: order.payment_session_id,
            cashfreeOrderId: order.order_id,
            cashfreeMode: config.environment || 'sandbox'
        },
        persistence: {
            cashfreeOrderId: order.order_id,
            cfOrderId: order.cf_order_id != null ? String(order.cf_order_id) : null,
            cashfreePaymentSessionId: order.payment_session_id,
            cashfreeResponse: order
        },
        raw: order
    };
}

module.exports = {
    validateVerificationInput,
    createOrder
};

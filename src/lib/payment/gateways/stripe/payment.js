const { PaymentStatus } = require('@src/lib/payment/events');
const { toMinorAmount, toMajorAmount } = require('@src/lib/payment/money');

function fromIntent(intent) {
    const paid = intent.status === 'succeeded';
    return {
        status: paid ? PaymentStatus.SUCCESS : (intent.status === 'canceled' ? PaymentStatus.CANCELLED : PaymentStatus.PENDING),
        gatewayOrderId: intent.id,
        gatewayPaymentId: intent.latest_charge || intent.id,
        amount: intent.amount != null ? toMajorAmount(intent.amount / 100) : null,
        currency: (intent.currency || 'inr').toUpperCase(),
        paymentMethod: intent.payment_method_types?.[0] || null,
        paidAt: paid ? new Date() : null,
        persistence: { gatewayResponse: intent },
        raw: intent
    };
}

async function verifyPayment(client, _config, input) {
    const intent = await client.request('get', `/payment_intents/${input.gatewayOrderId || input.orderId}`);
    return fromIntent(intent);
}

async function getPaymentStatus(client, _config, gatewayOrderId) {
    const intent = await client.request('get', `/payment_intents/${gatewayOrderId}`);
    return fromIntent(intent);
}

async function capturePayment(client, _config, { gatewayPaymentId, amount }) {
    const intent = await client.request('post', `/payment_intents/${gatewayPaymentId}/capture`, amount ? {
        amount_to_capture: String(toMinorAmount(amount))
    } : undefined);
    return fromIntent(intent);
}

async function refund(client, _config, { gatewayPaymentId, amount }) {
    const refundData = await client.request('post', '/refunds', {
        payment_intent: gatewayPaymentId,
        ...(amount != null && { amount: String(toMinorAmount(amount)) })
    });
    return {
        status: refundData.status === 'succeeded' ? 'SUCCESS' : 'PENDING',
        amount: refundData.amount != null ? toMajorAmount(refundData.amount / 100) : toMajorAmount(amount),
        raw: refundData
    };
}

module.exports = {
    verifyPayment,
    getPaymentStatus,
    capturePayment,
    refund
};

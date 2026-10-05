const { PaymentStatus } = require('@src/lib/payment/events');
const { GatewayError } = require('@src/lib/payment/errors');
const { toMinorAmount, toMajorAmount } = require('@src/lib/payment/money');
const { hmac, timingSafeEqualHex } = require('@src/lib/payment/signature');

function verifyClientSignature(config, gatewayOrderId, gatewayPaymentId, signature) {
    if (!config.keySecret || !signature) return false;
    const expected = hmac(config.keySecret, `${gatewayOrderId}|${gatewayPaymentId}`, 'hex');
    return timingSafeEqualHex(expected, signature);
}

function verifyPayment(_client, config, input) {
    const valid = verifyClientSignature(config, input.gatewayOrderId, input.gatewayPaymentId, input.signature);
    if (!valid) {
        throw new GatewayError('Invalid payment signature', { code: 'INVALID_SIGNATURE', statusCode: 400 });
    }
    return {
        status: PaymentStatus.SUCCESS,
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.gatewayPaymentId,
        amount: null,
        currency: 'INR',
        paymentMethod: null,
        paidAt: new Date(),
        persistence: {
            razorpayPaymentId: input.gatewayPaymentId,
            razorpaySignature: input.signature
        },
        raw: null
    };
}

async function getPaymentStatus(client, _config, gatewayOrderId) {
    const payments = await client.sdk().orders.fetchPayments(gatewayOrderId);
    const captured = (payments?.items || []).find((item) => item.status === 'captured');
    if (!captured) {
        return { status: PaymentStatus.PENDING, gatewayOrderId, gatewayPaymentId: null, amount: null, raw: payments };
    }
    return {
        status: PaymentStatus.SUCCESS,
        gatewayOrderId,
        gatewayPaymentId: captured.id,
        amount: toMajorAmount(captured.amount / 100),
        currency: (captured.currency || 'INR').toUpperCase(),
        paymentMethod: captured.method || null,
        paidAt: captured.created_at ? new Date(captured.created_at * 1000) : new Date(),
        persistence: { razorpayPaymentId: captured.id, razorpayResponse: captured },
        raw: captured
    };
}

async function capturePayment(client, _config, { gatewayPaymentId, amount, currency }) {
    const captured = await client.sdk().payments.capture(gatewayPaymentId, toMinorAmount(amount), currency || 'INR');
    return {
        status: captured.status === 'captured' ? PaymentStatus.SUCCESS : PaymentStatus.PROCESSING,
        gatewayOrderId: captured.order_id || null,
        gatewayPaymentId: captured.id,
        amount: toMajorAmount(captured.amount / 100),
        paymentMethod: captured.method || null,
        paidAt: new Date(),
        persistence: { razorpayPaymentId: captured.id, razorpayResponse: captured },
        raw: captured
    };
}

async function refund(client, _config, { gatewayPaymentId, amount }) {
    const refundData = await client.sdk().payments.refund(gatewayPaymentId, { amount: toMinorAmount(amount) });
    return {
        status: refundData.status === 'processed' ? 'SUCCESS' : 'PENDING',
        amount: toMajorAmount((refundData.amount || 0) / 100),
        raw: refundData
    };
}

module.exports = {
    verifyPayment,
    getPaymentStatus,
    capturePayment,
    refund
};

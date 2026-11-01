const { PaymentStatus } = require('@src/lib/payment/events');
const { GatewayError } = require('@src/lib/payment/errors');
const { toMajorAmount, amountsMatch } = require('@src/lib/payment/money');
const { guardProvider } = require('@src/lib/payment/provider-error');
const { paymentMethodFrom } = require('./customer');

async function fetchPaidOrder(client, gatewayOrderId, expectedAmount) {
    const [orderResponse, paymentsResponse] = await guardProvider('Failed to confirm Cashfree payment', () => Promise.all([
        client.sdk().PGFetchOrder(gatewayOrderId),
        client.sdk().PGOrderFetchPayments(gatewayOrderId)
    ]));
    const order = orderResponse?.data;
    const payments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : [];

    const successPayment = payments.find((item) => item?.payment_status === 'SUCCESS') || null;
    const paid = order?.order_status === 'PAID' && Boolean(successPayment);
    if (paid && expectedAmount != null && !amountsMatch(expectedAmount, order.order_amount)) {
        throw new GatewayError('Paid amount does not match the order', { code: 'AMOUNT_MISMATCH', statusCode: 400 });
    }

    return {
        status: paid ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        gatewayOrderId,
        gatewayPaymentId: successPayment?.cf_payment_id != null ? String(successPayment.cf_payment_id) : null,
        amount: order?.order_amount != null ? toMajorAmount(order.order_amount) : null,
        currency: order?.order_currency || 'INR',
        paymentMethod: paymentMethodFrom(successPayment),
        paidAt: successPayment?.payment_time ? new Date(successPayment.payment_time) : null,
        persistence: {
            cashfreePaymentId: successPayment?.cf_payment_id != null ? String(successPayment.cf_payment_id) : null,
            cashfreeResponse: { order, payment: successPayment }
        },
        raw: { order, payment: successPayment }
    };
}

function verifyPayment(client, _config, input) {
    return fetchPaidOrder(client, input.orderId || input.gatewayOrderId, input.expectedAmount);
}

function getPaymentStatus(client, _config, gatewayOrderId, expectedAmount) {
    return fetchPaidOrder(client, gatewayOrderId, expectedAmount);
}

function capturePayment(client, _config, { gatewayOrderId, amount }) {
    return fetchPaidOrder(client, gatewayOrderId, amount);
}

async function refund(client, _config, { gatewayOrderId, gatewayPaymentId, amount }) {
    const refundId = `refund_${Date.now()}`;
    const response = await client.sdk().PGOrderCreateRefund(gatewayOrderId, {
        refund_amount: toMajorAmount(amount),
        refund_id: refundId,
        refund_note: 'Subscription refund',
        ...(gatewayPaymentId && { refund_speed: 'STANDARD' })
    });
    const refundData = response?.data || {};
    const status = String(refundData.refund_status || '').toUpperCase();
    return {
        status: status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
        amount: toMajorAmount(refundData.refund_amount || amount),
        raw: refundData
    };
}

module.exports = {
    verifyPayment,
    getPaymentStatus,
    capturePayment,
    refund
};

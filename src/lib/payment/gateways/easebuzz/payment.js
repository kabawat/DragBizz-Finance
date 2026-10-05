const { toMajorAmount } = require('@src/lib/payment/money');
const { sha512 } = require('@src/lib/payment/signature');
const { postForm } = require('@src/lib/payment/form');

function verifyPayment(client, _config, input) {
    return client.retrieve(input.orderId || input.gatewayOrderId, input.expectedAmount, input.email, input.phone);
}

function getPaymentStatus(client, _config, gatewayOrderId, expectedAmount, context = {}) {
    return client.retrieve(gatewayOrderId, expectedAmount, context.email, context.phone);
}

function capturePayment(client, _config, input) {
    return client.retrieve(input.gatewayOrderId, input.amount, input.email, input.phone);
}

async function refund(client, config, { gatewayPaymentId, amount }) {
    client.credentials();
    const merchantRefundId = `refund_${Date.now()}`;
    const refundAmount = toMajorAmount(amount).toFixed(2);
    const hash = sha512(`${config.key}|${merchantRefundId}|${gatewayPaymentId}|${refundAmount}|${config.salt}`);
    const data = await postForm(`${client.dashboardBase}/transaction/v2/refund`, {
        key: config.key,
        merchant_refund_id: merchantRefundId,
        easebuzz_id: gatewayPaymentId,
        refund_amount: refundAmount,
        hash
    });
    return {
        status: data?.status === true || data?.status === 1 ? 'SUCCESS' : 'PENDING',
        amount: toMajorAmount(amount),
        raw: data
    };
}

module.exports = {
    verifyPayment,
    getPaymentStatus,
    capturePayment,
    refund
};

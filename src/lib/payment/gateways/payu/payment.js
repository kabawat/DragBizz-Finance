const { GatewayError } = require('@src/lib/payment/errors');
const { toMajorAmount } = require('@src/lib/payment/money');
const { sha512, timingSafeEqualText } = require('@src/lib/payment/signature');
const { responseHash } = require('./hash');

async function verifyPayment(client, config, input) {
    const txnid = input.orderId || input.gatewayOrderId;
    if (input.hash && input.raw) {
        const expected = responseHash({ ...input.raw, key: config.key, txnid }, config.salt);
        if (!timingSafeEqualText(expected, input.hash)) {
            throw new GatewayError('Invalid payment signature', { code: 'INVALID_SIGNATURE', statusCode: 400 });
        }
    }
    return client.verifyRemote(txnid);
}

async function refund(client, config, { gatewayPaymentId, amount }) {
    client.credentials();
    const command = 'cancel_refund_transaction';
    const hash = sha512(`${config.key}|${command}|${gatewayPaymentId}|${config.salt}`);
    const data = await client.postService({
        key: config.key,
        command,
        var1: gatewayPaymentId,
        var2: `refund_${Date.now()}`,
        var3: toMajorAmount(amount).toFixed(2),
        hash
    });
    return {
        status: String(data?.status) === '1' ? 'SUCCESS' : 'PENDING',
        amount: toMajorAmount(amount),
        raw: data
    };
}

function getPaymentStatus(client, _config, gatewayOrderId) {
    return client.verifyRemote(gatewayOrderId);
}

function capturePayment(client, _config, { gatewayOrderId }) {
    return client.verifyRemote(gatewayOrderId);
}

module.exports = {
    verifyPayment,
    getPaymentStatus,
    capturePayment,
    refund
};

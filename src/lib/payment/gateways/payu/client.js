const { guardProvider } = require('@src/lib/payment/provider-error');
const { sha512 } = require('@src/lib/payment/signature');
const { requireKeyAndSalt, postForm, paymentResult } = require('@src/lib/payment/form');

function createClient(config) {
    const baseUrl = config.environment === 'production' ? 'https://secure.payu.in' : 'https://test.payu.in';

    function credentials() {
        requireKeyAndSalt(config, 'PayU credentials not configured. Set PAYU_KEY and PAYU_SALT.');
    }

    function postService(params) {
        return postForm(`${baseUrl}/merchant/postservice.php?form=2`, params);
    }

    async function verifyRemote(txnid) {
        credentials();
        const command = 'verify_payment';
        const hash = sha512(`${config.key}|${command}|${txnid}|${config.salt}`);
        const data = await guardProvider('Failed to confirm PayU payment', () => postService({
            key: config.key,
            command,
            var1: txnid,
            hash
        }));
        const details = data?.transaction_details?.[txnid] || {};
        const success = String(details.status || '').toLowerCase() === 'success';
        return paymentResult({
            success,
            gatewayOrderId: txnid,
            gatewayPaymentId: details.mihpayid,
            amount: details.amt,
            paymentMethod: details.mode,
            raw: details
        });
    }

    return { baseUrl, credentials, postService, verifyRemote };
}

module.exports = { createClient };

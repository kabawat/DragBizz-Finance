const { guardProvider } = require('@src/lib/payment/provider-error');
const { toMajorAmount } = require('@src/lib/payment/money');
const { sha512 } = require('@src/lib/payment/signature');
const { requireKeyAndSalt, postForm, paymentResult } = require('@src/lib/payment/form');

function createClient(config) {
    const payBase = config.environment === 'production' ? 'https://pay.easebuzz.in' : 'https://testpay.easebuzz.in';
    const dashboardBase = config.environment === 'production' ? 'https://dashboard.easebuzz.in' : 'https://testdashboard.easebuzz.in';

    function credentials() {
        requireKeyAndSalt(config, 'Easebuzz credentials not configured. Set EASEBUZZ_KEY and EASEBUZZ_SALT.');
    }

    async function retrieve(txnid, amount, email, phone) {
        credentials();
        const major = toMajorAmount(amount).toFixed(2);
        const hash = sha512([config.key, txnid, major, email || '', phone || '', config.salt].join('|'));
        const data = await guardProvider('Failed to confirm Easebuzz payment', () => postForm(`${dashboardBase}/transaction/v1/retrieve`, {
            key: config.key,
            txnid,
            amount: major,
            email: email || '',
            phone: phone || '',
            hash
        }));
        const message = data?.msg || {};
        const success = String(message.status || '').toLowerCase() === 'success';
        return paymentResult({
            success,
            gatewayOrderId: txnid,
            gatewayPaymentId: message.easepayid || message.easebuzz_id,
            amount: message.amount != null ? message.amount : amount,
            paymentMethod: message.mode,
            raw: message
        });
    }

    return { payBase, dashboardBase, credentials, retrieve };
}

module.exports = { createClient };

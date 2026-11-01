const { buildGateway } = require('@src/lib/payment/registry');
const { getGatewayClient, formatCheckoutData } = require('./client');
require('@src/lib/payment/gateways');

async function createOrder(attempt, config, customer = {}) {
    const http = getGatewayClient(attempt.provider, config);
    let order;

    if (attempt.provider === 'RAZORPAY') {
        const response = await http.post('/orders', {
            amount: attempt.amountPaise,
            currency: attempt.currency,
            receipt: attempt.merchantOrderId,
            notes: { financeAttemptId: attempt.financeAttemptId },
        });
        order = response.data;
    } else {
        const response = await http.post('/orders', {
            order_id: attempt.merchantOrderId,
            order_amount: attempt.amountPaise / 100,
            order_currency: attempt.currency,
            customer_details: {
                customer_id: `retail_${attempt.financeAttemptId.replace(/-/g, '')}`,
                customer_phone: String(customer.phone || '').replace(/\D/g, '').slice(-10),
                ...(customer.email ? { customer_email: customer.email } : {}),
            },
            order_meta: {
                notify_url: config.notifyUrl,
                return_url: config.returnUrl,
            },
        }, {
            headers: { 'x-idempotency-key': attempt.financeAttemptId },
        });
        order = response.data;
    }

    const result = formatCheckoutData(attempt.provider, config, order);
    if (!result.gatewayOrderId) {
        throw new Error('Gateway returned an invalid retail order');
    }
    return result;
}

async function confirmPayment(attempt, config) {
    const http = getGatewayClient(attempt.provider, config);
    const id = attempt.gatewayOrderId || attempt.merchantOrderId;

    if (attempt.provider === 'RAZORPAY') {
        const { data } = await http.get(`/orders/${encodeURIComponent(id)}/payments`);
        const paid = (data.items || []).find((item) => item.status === 'captured');
        if (!paid) return null;
        return {
            gatewayPaymentId: paid.id,
            amountPaise: paid.amount,
            currency: paid.currency,
            paymentMethod: paid.method,
            paidAt: new Date(paid.created_at * 1000),
        };
    }

    const [order, payments] = await Promise.all([
        http.get(`/orders/${encodeURIComponent(id)}`),
        http.get(`/orders/${encodeURIComponent(id)}/payments`),
    ]);

    const paid = (payments.data || []).find((item) => item.payment_status === 'SUCCESS');
    if (order.data?.order_status !== 'PAID' || !paid) return null;

    return {
        gatewayPaymentId: String(paid.cf_payment_id),
        amountPaise: Math.round(Number(paid.payment_amount) * 100),
        currency: paid.payment_currency || order.data.order_currency,
        paymentMethod: Object.keys(paid.payment_method || {})[0] || 'unknown',
        paidAt: new Date(paid.payment_time),
    };
}

async function recoverOrder(attempt, config) {
    const http = getGatewayClient(attempt.provider, config);

    if (attempt.provider === 'CASHFREE') {
        try {
            const { data } = await http.get(`/orders/${encodeURIComponent(attempt.merchantOrderId)}`);
            return formatCheckoutData(attempt.provider, config, data);
        } catch (error) {
            if (error.response?.status === 404) return null;
            throw new Error('Unable to reconcile gateway order');
        }
    }

    const { data } = await http.get('/orders', {
        params: {
            from: Math.floor(new Date(attempt.createdAt).getTime() / 1000) - 60,
            receipt: attempt.merchantOrderId,
            count: 100,
        },
    });
    const found = (data.items || []).find((item) => item.receipt === attempt.merchantOrderId);
    return found ? formatCheckoutData(attempt.provider, config, found) : null;
}

function parseWebhook(attempt, config, request) {
    return buildGateway(attempt.provider.toLowerCase(), config).parseWebhook({
        rawBody: request.rawBody,
        headers: request.headers,
        body: request.body,
    });
}

module.exports = {
    createOrder,
    confirmPayment,
    recoverOrder,
    parseWebhook,
};


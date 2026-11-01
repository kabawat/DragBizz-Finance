const { subscriptionClient } = require('@src/lib/grpc/clients/retailer');
const { parseResponse } = require('./helper');

async function createSubscription(payment) {
    const response = await subscriptionClient.promisifyCall('CreateSubscription', {
        userId: String(payment.userId),
        agencyId: String(payment.agencyId || ''),
        packageId: String(payment.packageId || ''),
        paymentId: String(payment._id),
        paymentStatus: String(payment.status || 'SUCCESS'),
        billingCycle: String(payment.billingCycle || 'MONTHLY'),
        months: Number(payment.months) || 1,
        amount: Number(payment.finalAmount ?? payment.amount) || 0,
        currency: String(payment.currency || 'INR'),
    });

    if (!response?.success || !response.subscriptionId) {
        throw new Error(response?.message || 'Core did not create a subscription for the successful payment');
    }

    return {
        subscriptionId: response.subscriptionId,
        operationType: response.operationType || 'NEW',
        subscription: parseResponse(response),
    };
}

module.exports = { createSubscription };

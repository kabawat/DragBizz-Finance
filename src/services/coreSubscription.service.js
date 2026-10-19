const retailerClient = require('@src/lib/grpc/clients/retailer/retailer.client');

function parseSubscriptionResponse(response) {
    if (!response?.success || !response.subscriptionJson) return null;
    try {
        return JSON.parse(response.subscriptionJson);
    } catch (error) {
        throw new Error(`Core returned an invalid subscription response: ${error.message}`);
    }
}

async function getSubscriptionByPayment(paymentId) {
    const response = await retailerClient.promisifyCall('GetSubscriptionByPayment', { paymentId: String(paymentId) });
    return parseSubscriptionResponse(response);
}

async function validatePackagePayment({ userId, agencyId, packageId, months }) {
    return retailerClient.promisifyCall('ValidatePackagePayment', {
        userId: String(userId),
        agencyId: String(agencyId),
        packageId: String(packageId),
        months: Number(months) || 1,
    });
}

async function createSubscriptionFromPayment(payment) {
    const response = await retailerClient.promisifyCall('CreateSubscription', {
        userId: String(payment.userId),
        agencyId: String(payment.agencyId || ''),
        packageId: String(payment.packageId || ''),
        paymentId: String(payment._id),
        paymentStatus: String(payment.status),
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
        subscription: parseSubscriptionResponse(response),
    };
}

module.exports = {
    getSubscriptionByPayment,
    validatePackagePayment,
    createSubscriptionFromPayment,
};

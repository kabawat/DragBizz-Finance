const { subscriptionClient } = require('@src/lib/grpc/clients/retailer');
const { parseResponse } = require('./helper');

async function getByPayment(paymentId) {
    const response = await subscriptionClient.promisifyCall('GetSubscriptionByPayment', {
        paymentId: String(paymentId),
    });
    return parseResponse(response);
}

module.exports = { getByPayment };

const retailerClient = require('@src/lib/grpc/clients/retailer/retailer.client');
const logger = require('@src/utils/logger');

//Creates a subscription in the retailer microservice using gRPC.
async function createSubscription(payload) {
    try {
        const response = await retailerClient.promisifyCall('CreateSubscription', payload);
        return response;
    } catch (error) {
        logger.error('Error calling CreateSubscription on Retailer gRPC', {
            error: error.message,
            code: error.code
        });
        throw error;
    }
}

module.exports = createSubscription;

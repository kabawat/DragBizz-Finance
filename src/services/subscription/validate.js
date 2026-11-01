const { subscriptionClient } = require('@src/lib/grpc/clients/retailer');

async function validatePayment({ userId, agencyId, packageId, months }) {
    return subscriptionClient.promisifyCall('ValidatePackagePayment', {
        userId: String(userId),
        agencyId: String(agencyId),
        packageId: String(packageId),
        months: Number(months),
    });
}

module.exports = { validatePayment };

const { subscriptionClient } = require('@src/lib/grpc/clients/retailer');

async function getPackageById(packageId, { includeInactive = false } = {}) {
    const normalizedId = String(packageId?._id || packageId || '').trim();
    if (!normalizedId) return null;

    const response = await subscriptionClient.promisifyCall('GetPackage', {
        packageId: normalizedId,
        includeInactive,
    });

    if (!response?.success || !response.packageJson) return null;

    try {
        return JSON.parse(response.packageJson);
    } catch (error) {
        throw new Error(`Core returned an invalid package response: ${error.message}`);
    }
}

module.exports = {
    getPackageById,
};

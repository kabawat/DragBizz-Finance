const { getActiveSubscription } = require('@src/services/subscription/get.service');
const Response = require('@src/utils/responseHandler/standardized');

async function getActiveSubscriptionController(req, res) {
    try {
        const userId = req.user?.sub;
        const agencyId = req.user?.agencyId;

        if (!userId) return Response.validationError(res, 'User ID not found in token');

        const subscription = await getActiveSubscription(userId, {
            agencyId,
            populatePackage: true
        });

        if (!subscription) {
            return Response.notFound(res, 'No active subscription found');
        }

        // --- Data Transformation ---
        // 1. Keep essential data for usage limits
        const detailedFeatures = (subscription.features || []).map(f => ({
            module: f.module,
            currentUsage: f.currentUsage || 0,
            maxLimit: f.maxLimit,
            usageType: f.usageType
        }));

        // 2. Remove agencyId and clean up packageId fields
        const { agencyId: _, ...cleanSubscription } = subscription;

        // Note: packageId fields are controlled by PACKAGE_POPULATE_FIELDS in helpers.js,
        // but we ensure the response is strictly what you asked for.
        const responseData = {
            ...cleanSubscription,
            features: detailedFeatures
        };

        return Response.success(res, {
            message: 'Active subscription details fetched successfully',
            data: responseData
        });
    } catch (error) {
        return Response.handleError(res, error, 'getActiveSubscriptionController');
    }
}

module.exports = getActiveSubscriptionController;

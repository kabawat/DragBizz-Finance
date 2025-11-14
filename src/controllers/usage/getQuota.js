const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

/**
 * Get remaining quota for a feature or all features
 * GET /plans/usage/quota?featureKey=invoice_management
 */
async function getQuotaController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        const { featureKey } = req.query;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        // Get active subscription (using cached service method)
        const subscription = await SubscriptionService.getActiveSubscription(userId);

        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        if (featureKey) {
            // Get quota for specific feature
            const quota = await UsageService.getRemainingQuota(
                subscription._id,
                featureKey
            );

            return Response.success(res, {
                message: 'Quota retrieved successfully',
                data: {
                    featureKey,
                    quota
                }
            });
        } else {
            // Get quota for all features
            const summary = await UsageService.getUsageSummary(subscription._id);

            return Response.success(res, {
                message: 'Usage summary retrieved successfully',
                data: {
                    subscriptionId: subscription._id,
                    summary
                }
            });
        }
    } catch (error) {
        return Response.handleError(res, error, 'getQuotaController');
    }
}

module.exports = getQuotaController;


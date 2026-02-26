const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

async function getQuotaController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        const { module } = req.query;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        const subscription = await SubscriptionService.getActiveSubscription(userId);
        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        if (module) {
            const quota = await UsageService.getRemainingQuota(
                subscription._id,
                module
            );

            return Response.success(res, {
                message: 'Quota retrieved successfully',
                data: {
                    module,
                    quota
                }
            });
        } else {
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


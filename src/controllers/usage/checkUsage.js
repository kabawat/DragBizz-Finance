const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

async function checkUsageController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        const { module, quantity = 1 } = req.body;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        if (!module) {
            return Response.validationError(res, 'Module name is required');
        }

        const subscription = await SubscriptionService.getActiveSubscription(userId);

        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        const result = await UsageService.canUseFeature(
            subscription._id,
            module,
            quantity
        );

        if (result.allowed) {
            return Response.success(res, {
                message: 'Feature usage allowed',
                data: {
                    allowed: true,
                    quota: result.quota
                }
            });
        } else {
            return Response.forbidden(res, {
                message: result.reason || 'Quota exceeded',
                data: {
                    allowed: false,
                    quota: result.quota,
                    reason: result.reason
                }
            });
        }
    } catch (error) {
        return Response.handleError(res, error, 'checkUsageController');
    }
}

module.exports = checkUsageController;


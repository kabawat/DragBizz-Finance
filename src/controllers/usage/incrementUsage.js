const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

async function incrementUsageController(req, res) {
    try {
        const userId = req.user?.sub || req.body?.userId;
        const { module, quantity = 1, metadata = {} } = req.body;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        if (!module) {
            return Response.validationError(res, 'Module name is required');
        }

        if (quantity < 1) {
            return Response.validationError(res, 'Quantity must be at least 1');
        }

        const subscription = await SubscriptionService.getActiveSubscription(userId);

        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        const canUse = await UsageService.canUseFeature(
            subscription._id,
            module,
            quantity
        );

        if (!canUse.allowed) {
            return Response.forbidden(res, {
                message: canUse.reason || 'Quota exceeded',
                data: {
                    allowed: false,
                    quota: canUse.quota,
                    reason: canUse.reason
                }
            });
        }

        const usage = await UsageService.incrementUsage(
            subscription._id,
            userId,
            module,
            quantity,
            metadata
        );

        const updatedQuota = await UsageService.getRemainingQuota(
            subscription._id,
            module
        );

        return Response.success(res, {
            message: 'Usage incremented successfully',
            data: {
                usage: {
                    count: usage.count,
                    date: usage.date
                },
                quota: updatedQuota
            }
        });
    } catch (error) {
        return Response.handleError(res, error, 'incrementUsageController');
    }
}

module.exports = incrementUsageController;
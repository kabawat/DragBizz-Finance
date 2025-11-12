const UsageService = require('@src/services/usage/usage.service');
const { SubscriptionModel } = require('@src/models');
const Response = require('@src/utils/responseHandler/standardized');

/**
 * Increment usage for a feature
 * POST /plans/usage/increment
 */
async function incrementUsageController(req, res) {
    try {
        const userId = req.user?.sub || req.body?.userId;
        const { featureKey, quantity = 1, metadata = {} } = req.body;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        if (!featureKey) {
            return Response.validationError(res, 'Feature key is required');
        }

        if (quantity < 1) {
            return Response.validationError(res, 'Quantity must be at least 1');
        }

        // Get active subscription
        const subscription = await SubscriptionModel.findOne({
            userId,
            status: { $in: ['ACTIVE', 'TRIAL'] },
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        }).sort({ createdAt: -1 }).lean();

        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        // Check if usage is allowed before incrementing
        const canUse = await UsageService.canUseFeature(
            subscription._id,
            featureKey,
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

        // Increment usage
        const usage = await UsageService.incrementUsage(
            subscription._id,
            userId,
            featureKey,
            quantity,
            metadata
        );

        // Get updated quota
        const updatedQuota = await UsageService.getRemainingQuota(
            subscription._id,
            featureKey
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


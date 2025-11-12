const UsageService = require('@src/services/usage/usage.service');
const { SubscriptionModel } = require('@src/models');
const Response = require('@src/utils/responseHandler/standardized');

/**
 * Check if user can use a feature (has quota available)
 * POST /plans/usage/check
 */
async function checkUsageController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        const { featureKey, quantity = 1 } = req.body;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        if (!featureKey) {
            return Response.validationError(res, 'Feature key is required');
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

        // Check usage
        const result = await UsageService.canUseFeature(
            subscription._id,
            featureKey,
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


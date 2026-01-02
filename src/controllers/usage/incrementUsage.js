const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

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

        const subscription = await SubscriptionService.getActiveSubscription(userId);

        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        if (featureKey === 'VOICE_AI') {
            let packageHasAI = subscription.packageId?.isAIFeature === true;
            
            if (!packageHasAI && subscription.packageId?.planType) {
                const planType = subscription.packageId.planType;
                if (planType === 'PROFESSIONAL' || planType === 'ENTERPRISE') {
                    packageHasAI = true;
                }
            }
            
            if (!packageHasAI) {
                return Response.forbidden(res, {
                    message: 'Voice AI feature is not available in your subscription plan',
                    data: {
                        allowed: false,
                        quota: {
                            hasAccess: false,
                            remaining: 0,
                            limit: 0,
                            usageType: 'UNLIMITED'
                        },
                        reason: 'Feature not available in subscription'
                    }
                });
            }
            return Response.success(res, {
                message: 'AI feature usage allowed (unlimited)',
                data: {
                    usage: {
                        count: 0,
                        date: new Date().toISOString().split('T')[0]
                    },
                    quota: {
                        hasAccess: true,
                        remaining: -1,
                        limit: -1,
                        usageType: 'UNLIMITED'
                    }
                }
            });
        }
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

        const usage = await UsageService.incrementUsage(
            subscription._id,
            userId,
            featureKey,
            quantity,
            metadata
        );

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


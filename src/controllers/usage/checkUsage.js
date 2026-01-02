const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

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
                message: 'Feature usage allowed',
                data: {
                    allowed: true,
                    quota: {
                        hasAccess: true,
                        remaining: -1,
                        limit: -1,
                        usageType: 'UNLIMITED',
                        used: 0
                    }
                }
            });
        }
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


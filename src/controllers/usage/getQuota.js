const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');

async function getQuotaController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        const { featureKey } = req.query;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        const subscription = await SubscriptionService.getActiveSubscription(userId);
        if (!subscription) {
            return Response.forbidden(res, 'No active subscription found');
        }

        if (featureKey) {
            if (featureKey === 'VOICE_AI') {
                let packageHasAI = subscription.packageId?.isAIFeature === true;
                
                if (!packageHasAI && subscription.packageId?.planType) {
                    const planType = subscription.packageId.planType;
                    if (planType === 'PROFESSIONAL' || planType === 'ENTERPRISE') {
                        packageHasAI = true;
                    }
                }
                
                const quota = {
                    hasAccess: packageHasAI,
                    remaining: packageHasAI ? -1 : 0,
                    limit: packageHasAI ? -1 : 0,
                    usageType: 'UNLIMITED',
                    used: 0
                };
                
                return Response.success(res, {
                    message: 'Quota retrieved successfully',
                    data: {
                        featureKey,
                        quota
                    }
                });
            }
            
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


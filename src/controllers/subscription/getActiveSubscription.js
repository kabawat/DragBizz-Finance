const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');
const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

const DISPLAY_NAME_TO_KEY = Object.entries(FEATURE_DISPLAY_NAMES).reduce((acc, [key, name]) => {
    if (typeof name === 'string') {
        acc[name.toLowerCase()] = key;
    }
    return acc;
}, {});

async function getActiveSubscriptionController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        
        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        const subscription = await SubscriptionService.getActiveSubscription(userId);
        
        if (!subscription) {
            return Response.success(res, {
                message: 'No active subscription found',
                data: null
            });
        }

        if (subscription.features && Array.isArray(subscription.features)) {
            subscription.features = subscription.features.map(feature => {
                let featureKey = feature.featureKey || null;
                let legacyName = null;

                if (!featureKey && feature.feature) {
                    if (typeof feature.feature === 'string') {
                        featureKey = feature.feature;
                    } else if (typeof feature.feature === 'object' && feature.feature.name) {
                        legacyName = feature.feature.name;
                    }
                }

                if (!featureKey && legacyName) {
                    const lookup = DISPLAY_NAME_TO_KEY[legacyName.toLowerCase()];
                    featureKey = lookup || legacyName.toLowerCase().replace(/\s+/g, '_');
                }

                if (!featureKey && feature.featureName) {
                    const lookup = DISPLAY_NAME_TO_KEY[feature.featureName.toLowerCase()];
                    featureKey = lookup || feature.featureName.toLowerCase().replace(/\s+/g, '_');
                }

                const normalizedKey = featureKey;
                const featureName = feature.featureName || legacyName || (normalizedKey ? FEATURE_DISPLAY_NAMES[normalizedKey] : null) || normalizedKey;

                return {
                    featureKey: normalizedKey,
                    featureName,
                    enabled: feature.enabled !== false,
                    usageLimits: feature.usageLimits || {
                        usageType: 'UNLIMITED',
                        totalLimit: null,
                        customDailyLimit: null
                    },
                    metadata: feature.metadata || {}
                };
            });
        }

        if (subscription.packageId && subscription.packageId.featureUsageLimits) {
            subscription.packageId.featureUsageLimits = subscription.packageId.featureUsageLimits.map(limit => {
                const featureKey = limit.featureKey;
                return {
                    ...limit,
                    featureName: FEATURE_DISPLAY_NAMES[featureKey] || featureKey
                };
            });
        }

        return Response.success(res, {
            message: 'Active subscription fetched successfully',
            data: subscription
        });
    } catch (error) {
        return Response.handleError(res, error, 'getActiveSubscriptionController');
    }
}

module.exports = getActiveSubscriptionController;


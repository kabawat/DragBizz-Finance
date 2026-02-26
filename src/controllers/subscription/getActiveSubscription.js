const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');
const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

const DISPLAY_NAME_TO_KEY = Object.entries(FEATURE_DISPLAY_NAMES).reduce((acc, [key, name]) => {
    if (typeof name === 'string') {
        acc[name.toLowerCase()] = key;
    }
    return acc;
}, {});

function normalizeFeature(feature) {
    if (!feature) return null;

    let module = feature.module || null;

    if (!module) {
        if (typeof feature.feature === 'string') {
            module = feature.feature;
        } else if (feature.feature?.name) {
            const lookup = DISPLAY_NAME_TO_KEY[feature.feature.name.toLowerCase()];
            module = lookup || feature.feature.name.toLowerCase().replace(/\s+/g, '_');
        } else if (feature.moduleName) {
            const lookup = DISPLAY_NAME_TO_KEY[feature.moduleName.toLowerCase()];
            module = lookup || feature.moduleName.toLowerCase().replace(/\s+/g, '_');
        }
    }

    if (!module) return null;

    return {
        module,
        moduleName: feature.moduleName || FEATURE_DISPLAY_NAMES[module] || module,
        report: feature.report === true,
        analytics: feature.analytics === true,
        usageType: feature.usageType || 'UNLIMITED',
        usageLimit: feature.usageLimit ?? null,
        customDailyLimit: feature.customDailyLimit ?? null,
        metadata: feature.metadata || {}
    };
}

function filterFields(subscription, requestedFields, populatePackage) {
    if (!requestedFields || requestedFields.length === 0) {
        if (!populatePackage && subscription.packageId?._id) {
            const result = { ...subscription };
            result.packageId = subscription.packageId._id;
            return result;
        }
        return subscription;
    }

    const responseData = {};

    for (const field of requestedFields) {
        if (field === '_id' && subscription._id) {
            responseData._id = subscription._id;
        } else if (field === 'id' && subscription._id) {
            responseData.id = subscription._id.toString();
        } else if (field === 'packageId' && subscription.packageId) {
            responseData.packageId = populatePackage
                ? subscription.packageId
                : (subscription.packageId._id || subscription.packageId);
        } else if (subscription[field] !== undefined) {
            responseData[field] = subscription[field];
        }
    }

    return responseData;
}

async function getActiveSubscription(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        const agencyId = req.user?.agencyId;

        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        const populatePackage = req.query.populatePackage !== 'false';
        const fieldsParam = req.query.fields;
        const requestedFields = fieldsParam ? fieldsParam.split(',').map(f => f.trim()) : null;
        const needsFeatures = !requestedFields || requestedFields.includes('features');

        const subscription = await SubscriptionService.getActiveSubscription(userId, { populatePackage, agencyId });

        if (!subscription) {
            return Response.success(res, {
                message: 'No active subscription found',
                data: null
            });
        }

        let responseData = filterFields(subscription, requestedFields, populatePackage);

        if (needsFeatures && responseData.features && Array.isArray(responseData.features)) {
            responseData.features = responseData.features.map(normalizeFeature).filter(Boolean);
        }

        // Add explicit expiration check for response data
        const now = new Date();
        const endDate = new Date(subscription.endDate);

        // 1. If expired, update status in DB and return response
        if (endDate < now) {
            // Proactively update status to EXPIRED in database
            await SubscriptionService.updateSubscriptionStatus(subscription._id, 'EXPIRED').catch(() => { });

            responseData.status = 'EXPIRED';
            responseData.isExpired = true;
            return Response.success(res, {
                message: 'Subscription has expired',
                data: responseData
            });
        }

        responseData.isExpired = false;

        // 2. Check for alerts (3 days = 3 * 24 * 60 * 60 * 1000 ms)
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const timeRemaining = endDate.getTime() - now.getTime();

        if (timeRemaining > 0 && timeRemaining <= THREE_DAYS_MS) {
            const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));
            responseData.alert = {
                type: 'SUBSCRIPTION_EXPIRING_SOON',
                message: `Your subscription will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Please renew to avoid service interruption.`,
                daysRemaining
            };
        }


        return Response.success(res, {
            message: 'Active subscription fetched successfully',
            data: responseData
        });
    } catch (error) {
        return Response.handleError(res, error, 'getActiveSubscription');
    }
}

module.exports = getActiveSubscription;


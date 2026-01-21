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
    
    let featureKey = feature.featureKey || null;
    
    if (!featureKey) {
        if (typeof feature.feature === 'string') {
            featureKey = feature.feature;
        } else if (feature.feature?.name) {
            const lookup = DISPLAY_NAME_TO_KEY[feature.feature.name.toLowerCase()];
            featureKey = lookup || feature.feature.name.toLowerCase().replace(/\s+/g, '_');
        } else if (feature.featureName) {
            const lookup = DISPLAY_NAME_TO_KEY[feature.featureName.toLowerCase()];
            featureKey = lookup || feature.featureName.toLowerCase().replace(/\s+/g, '_');
        }
    }

    if (!featureKey) return null;

    return {
        featureKey,
        featureName: feature.featureName || FEATURE_DISPLAY_NAMES[featureKey] || featureKey,
        enabled: feature.enabled !== false,
        usageLimits: feature.usageLimits || {
            usageType: 'UNLIMITED',
            totalLimit: null,
            customDailyLimit: null
        },
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
        
        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        const populatePackage = req.query.populatePackage !== 'false';
        const fieldsParam = req.query.fields;
        const requestedFields = fieldsParam ? fieldsParam.split(',').map(f => f.trim()) : null;
        const needsFeatures = !requestedFields || requestedFields.includes('features');
        
        const subscription = await SubscriptionService.getActiveSubscription(userId, { populatePackage });
        
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

        return Response.success(res, {
            message: 'Active subscription fetched successfully',
            data: responseData
        });
    } catch (error) {
        return Response.handleError(res, error, 'getActiveSubscription');
    }
}

module.exports = getActiveSubscription;


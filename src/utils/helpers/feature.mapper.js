const { FEATURES, FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

/**
 * Map feature name to feature key
 * Handles various formats: "Product Management", "product_management", "ProductManagement", etc.
 */
function mapFeatureNameToKey(featureName) {
    if (!featureName || typeof featureName !== 'string') {
        return null;
    }

    const normalizedName = featureName.trim().toLowerCase();

    // Direct key match
    if (Object.values(FEATURES).includes(normalizedName)) {
        return normalizedName;
    }

    // Check display names
    for (const [key, displayName] of Object.entries(FEATURE_DISPLAY_NAMES)) {
        if (displayName.toLowerCase() === normalizedName) {
            return key;
        }
    }

    // Partial matching
    for (const [key, displayName] of Object.entries(FEATURE_DISPLAY_NAMES)) {
        if (normalizedName.includes(displayName.toLowerCase()) || 
            displayName.toLowerCase().includes(normalizedName)) {
            return key;
        }
    }

    // Try to match with underscore format
    const underscoreFormat = normalizedName.replace(/\s+/g, '_');
    if (Object.values(FEATURES).includes(underscoreFormat)) {
        return underscoreFormat;
    }

    return null;
}

/**
 * Get feature key from feature object or ID
 */
async function getFeatureKeyFromFeature(feature, FeatureModel = null) {
    if (!feature) return null;

    const mongoose = require('mongoose');

    // If it's already a feature key string
    if (typeof feature === 'string') {
        const key = mapFeatureNameToKey(feature);
        if (key) return key;
    }

    // If it's an object with name
    if (typeof feature === 'object' && feature.name) {
        return mapFeatureNameToKey(feature.name);
    }

    // If it's an ObjectId and FeatureModel is provided
    if (FeatureModel && mongoose.Types.ObjectId.isValid(feature)) {
        const featureDoc = await FeatureModel.findById(feature).lean();
        if (featureDoc && featureDoc.name) {
            return mapFeatureNameToKey(featureDoc.name);
        }
    }

    return null;
}

/**
 * Get usage limits for a feature from package
 */
function getUsageLimitsForFeature(packageDoc, featureKey) {
    if (!packageDoc || !packageDoc.featureUsageLimits) {
        return {
            usageType: 'UNLIMITED',
            totalLimit: null,
            customDailyLimit: null
        };
    }

    const limitConfig = packageDoc.featureUsageLimits.find(
        limit => limit.featureKey === featureKey
    );

    if (!limitConfig) {
        return {
            usageType: 'UNLIMITED',
            totalLimit: null,
            customDailyLimit: null
        };
    }

    return {
        usageType: limitConfig.usageType || 'UNLIMITED',
        totalLimit: limitConfig.totalLimit || null,
        customDailyLimit: limitConfig.customDailyLimit || null
    };
}

module.exports = {
    mapFeatureNameToKey,
    getFeatureKeyFromFeature,
    getUsageLimitsForFeature
};


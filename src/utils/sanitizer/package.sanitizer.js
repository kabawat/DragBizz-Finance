// Sanitize package data
function sanitizePackageData(data) {
    const sanitized = {};

    // Basic Information
    if (data.name) {
        sanitized.name = data.name.trim();
    }

    if (data.description) {
        sanitized.description = data.description.trim();
    }

    if (data.shortDescription) {
        sanitized.shortDescription = data.shortDescription.trim();
    }

    // Pricing Information
    if (data.pricing) {
        sanitized.pricing = {
            amount: data.pricing.amount,
            currency: data.pricing.currency || 'INR',
            billingCycle: data.pricing.billingCycle,
            setupFee: data.pricing.setupFee || 0,
            discount: data.pricing.discount || 0
        };
    }

    // Features
    if (data.features && Array.isArray(data.features)) {
        sanitized.features = data.features.map(feature => ({
            feature: feature.feature,
            enabled: feature.enabled !== undefined ? feature.enabled : true,
            limit: feature.limit !== undefined ? feature.limit : null,
            unit: feature.unit || null
        }));
    }

    // Plan Metadata
    if (data.planType) {
        sanitized.planType = data.planType;
    }

    if (data.displayOrder !== undefined) {
        sanitized.displayOrder = data.displayOrder;
    }

    if (data.isPopular !== undefined) {
        sanitized.isPopular = data.isPopular;
    }

    if (data.isRecommended !== undefined) {
        sanitized.isRecommended = data.isRecommended;
    }

    // Status and Visibility
    if (data.status) {
        sanitized.status = data.status;
    }

    if (data.isVisible !== undefined) {
        sanitized.isVisible = data.isVisible;
    }

    // Limits
    if (data.maxStores !== undefined) {
        sanitized.maxStores = data.maxStores;
    }

    if (data.maxUsers !== undefined) {
        sanitized.maxUsers = data.maxUsers;
    }

    if (data.maxProducts !== undefined) {
        sanitized.maxProducts = data.maxProducts;
    }

    if (data.maxStorage !== undefined) {
        sanitized.maxStorage = data.maxStorage;
    }

    // Trial Information
    if (data.trialPeriod) {
        sanitized.trialPeriod = {
            enabled: data.trialPeriod.enabled || false,
            days: data.trialPeriod.days || 0
        };
    }

    // Tags
    if (data.tags && Array.isArray(data.tags)) {
        sanitized.tags = data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    // Metadata
    if (data.metadata) {
        sanitized.metadata = data.metadata;
    }

    return sanitized;
}

module.exports = {
    sanitizePackageData
};


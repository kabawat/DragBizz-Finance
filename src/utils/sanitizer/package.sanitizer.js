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

    // Handle pricing - can be array or object with durationPricing
    if (data.pricing) {
        if (Array.isArray(data.pricing)) {
            // Direct array format
            sanitized.pricing = data.pricing.map(pricingOption => ({
                months: pricingOption.months,
                price: pricingOption.price,
                discount: pricingOption.discount || 0
            }));
        } else if (data.pricing.durationPricing && Array.isArray(data.pricing.durationPricing)) {
            // Object format with durationPricing array
            sanitized.pricing = data.pricing.durationPricing.map(pricingOption => ({
                months: pricingOption.months,
                price: pricingOption.price,
                discount: pricingOption.discount || 0
            }));
            
            // Store currency, gstPercentage, and setupFee in metadata
            sanitized.metadata = {
                ...(sanitized.metadata || {}),
                currency: data.pricing.currency || 'INR',
                gstPercentage: data.pricing.gstPercentage || 0,
                setupFee: data.pricing.setupFee || 0
            };
        }
    }

    if (data.featureUsageLimits && Array.isArray(data.featureUsageLimits)) {
        sanitized.featureUsageLimits = data.featureUsageLimits
            .map(limit => {
                if (!limit || !limit.featureKey) return null;
                return {
                    featureKey: limit.featureKey.trim(),
                    enabled: limit.enabled !== false,
                    usageType: limit.usageType || 'UNLIMITED',
                    totalLimit: limit.totalLimit !== undefined && limit.totalLimit !== null && limit.totalLimit !== ''
                        ? Number(limit.totalLimit)
                        : null,
                    customDailyLimit: limit.customDailyLimit !== undefined && limit.customDailyLimit !== null && limit.customDailyLimit !== ''
                        ? Number(limit.customDailyLimit)
                        : null,
                    metadata: limit.metadata || {}
                };
            })
            .filter(Boolean);
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

    if (data.maxSubscribers !== undefined) {
        sanitized.maxSubscribers = data.maxSubscribers === '' || data.maxSubscribers === null
            ? null
            : Number(data.maxSubscribers);
    }

    return sanitized;
}

module.exports = {
    sanitizePackageData
};


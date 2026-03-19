// Sanitize package data
function sanitizePackageData(data) {
    const sanitized = {};

    // Status and Visibility
    if (data.status) {
        sanitized.status = data.status;
    }

    if (data.isVisible !== undefined) {
        sanitized.isVisible = data.isVisible;
    }

    // Tags
    if (data.tags && Array.isArray(data.tags)) {
        sanitized.tags = data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    // Metadata
    if (data.metadata) {
        sanitized.metadata = data.metadata;
    }

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

    if (data.features && Array.isArray(data.features)) {
        sanitized.features = data.features
            .map(feature => {
                if (!feature || !feature.module) return null;
                return {
                    module: feature.module.trim(),
                    report: feature.report === true || feature.report === 'true',
                    analytics: feature.analytics === true || feature.analytics === 'true',
                    usageType: feature.usageType || 'UNLIMITED',
                    usageLimit: feature.usageLimit !== undefined && feature.usageLimit !== null && feature.usageLimit !== ''
                        ? Number(feature.usageLimit)
                        : null,
                    customDailyLimit: feature.customDailyLimit !== undefined && feature.customDailyLimit !== null && feature.customDailyLimit !== ''
                        ? Number(feature.customDailyLimit)
                        : null,
                    metadata: feature.metadata || {}
                };
            })
            .filter(Boolean);
    }

    if (data.highlights && Array.isArray(data.highlights)) {
        sanitized.highlights = data.highlights
            .filter(h => typeof h === 'string' && h.trim().length > 0)
            .map(h => h.trim());
    }

    // Plan Metadata
    if (data.planType) {
        sanitized.planType = data.planType;
    }

    if (data.label) {
        sanitized.label = data.label.trim();
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

    return sanitized;
}

module.exports = { sanitizePackageData };
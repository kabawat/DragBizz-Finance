const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

// Package Serializers

// Serialize package for creation response
function packageCreationSerializer(package) {
    if (!package) return null;

    const featureUsageLimits = Array.isArray(package.featureUsageLimits)
        ? package.featureUsageLimits.map(limit => ({
            featureKey: limit.featureKey,
            featureName: FEATURE_DISPLAY_NAMES[limit.featureKey] || limit.featureKey,
            usageType: limit.usageType || 'UNLIMITED',
            totalLimit: limit.totalLimit ?? null,
            customDailyLimit: limit.customDailyLimit ?? null,
            enabled: limit.enabled !== false,
            highlight: limit.highlight || (limit.metadata && limit.metadata.highlight) || null
        }))
        : [];

    // Transform pricing array to object format with durationPricing
    const pricingArray = Array.isArray(package.pricing) ? package.pricing : [];
    const durationPricing = pricingArray.map(p => ({
        months: p.months,
        price: p.price,
        discount: p.discount || 0,
        discountedPrice: p.discountedPrice || p.price
    }));

    // Get currency, gstPercentage, and setupFee from metadata or use defaults
    const metadata = package.metadata || {};
    const pricing = {
        currency: metadata.currency || 'INR',
        gstPercentage: metadata.gstPercentage || 0,
        setupFee: metadata.setupFee || 0,
        durationPricing: durationPricing
    };

    return {
        id: package._id,
        name: package.name,
        slug: package.slug,
        description: package.description,
        shortDescription: package.shortDescription,
        pricing: pricing,
        featureUsageLimits,
        highlights: package.highlights || [],
        planType: package.planType,
        label: package.label,
        displayOrder: package.displayOrder,
        isPopular: package.isPopular,
        isRecommended: package.isRecommended,
        status: package.status,
        isVisible: package.isVisible,
        isAIFeature: package.isAIFeature || false,
        maxSubscribers: package.maxSubscribers,
        trialPeriod: package.trialPeriod,
        tags: package.tags || [],
        createdAt: package.createdAt,
        updatedAt: package.updatedAt
    };
}

// Serialize package list response
function packageListSerializer(packages) {
    if (!packages || !Array.isArray(packages)) {
        return [];
    }

    return packages.map(pkg => packageCreationSerializer(pkg));
}

module.exports = {
    packageCreationSerializer,
    packageListSerializer
};


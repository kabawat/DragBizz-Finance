const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');
// Serialize package for creation response
function packageCreationSerializer(package) {
    if (!package) return null;

    const features = Array.isArray(package.features)
        ? package.features.map(feature => ({
            module: feature.module,
            moduleName: FEATURE_DISPLAY_NAMES[feature.module] || feature.module,
            report: feature.report === true,
            analytics: feature.analytics === true,
            usageType: feature.usageType || 'UNLIMITED',
            usageLimit: feature.usageLimit ?? null,
            customDailyLimit: feature.customDailyLimit ?? null,
            metadata: feature.metadata || {}
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
        features,
        highlights: package.highlights || [],
        planType: package.planType,
        label: package.label,
        displayOrder: package.displayOrder,
        isPopular: package.isPopular,
        isRecommended: package.isRecommended,
        status: package.status,
        isVisible: package.isVisible,
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


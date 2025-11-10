// Package Serializers

// Serialize package for creation response
function packageCreationSerializer(package) {
    if (!package) return null;

    // Handle populated features
    const serializedFeatures = package.features?.map(feature => {
        if (feature.feature && typeof feature.feature === 'object') {
            return {
                feature: {
                    id: feature.feature._id || feature.feature,
                    name: feature.feature.name,
                    description: feature.feature.description,
                    category: feature.feature.category,
                    icon: feature.feature.icon
                },
                enabled: feature.enabled,
                limit: feature.limit,
                unit: feature.unit
            };
        }
        return {
            feature: feature.feature,
            enabled: feature.enabled,
            limit: feature.limit,
            unit: feature.unit
        };
    }) || [];

    return {
        id: package._id,
        name: package.name,
        slug: package.slug,
        description: package.description,
        shortDescription: package.shortDescription,
        pricing: {
            currency: package.pricing?.currency || 'INR',
            setupFee: package.pricing?.setupFee || 0,
            gstPercentage: package.pricing?.gstPercentage || 0,
            durationPricing: package.pricing?.durationPricing?.map(dp => ({
                months: dp.months,
                price: dp.price,
                discount: dp.discount || 0,
                discountedPrice: dp.discountedPrice || dp.price
            })) || []
        },
        features: serializedFeatures,
        planType: package.planType,
        displayOrder: package.displayOrder,
        isPopular: package.isPopular,
        isRecommended: package.isRecommended,
        status: package.status,
        isVisible: package.isVisible,
        maxStores: package.maxStores,
        maxUsers: package.maxUsers,
        maxProducts: package.maxProducts,
        maxStorage: package.maxStorage,
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


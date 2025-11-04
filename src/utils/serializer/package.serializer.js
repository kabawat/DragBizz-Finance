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
            amount: package.pricing?.amount,
            currency: package.pricing?.currency,
            billingCycle: package.pricing?.billingCycle,
            setupFee: package.pricing?.setupFee || 0,
            discount: package.pricing?.discount || 0,
            discountedAmount: package.pricing?.discountedAmount
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


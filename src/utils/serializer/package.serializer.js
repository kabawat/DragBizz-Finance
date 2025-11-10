// Package Serializers

// Serialize package for creation response
function packageCreationSerializer(package) {
    if (!package) return null;

    // Handle populated features
    const serializedFeatures = package.features?.map(feature => {
        if (feature && typeof feature === 'object' && feature._id) {
            return {
                feature: {
                    id: feature._id,
                    name: feature.name,
                    description: feature.description,
                    category: feature.category,
                    icon: feature.icon,
                    isActive: feature.isActive
                },
                enabled: true
            };
        }
        const featureId = typeof feature === 'string' ? feature : feature?.toString?.();
        return {
            feature: featureId,
            enabled: true
        };
    }) || [];

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
        features: serializedFeatures,
        planType: package.planType,
        label: package.label,
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


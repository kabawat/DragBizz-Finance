// Feature Serializers

// Serialize feature for creation response
function featureCreationSerializer(feature) {
    if (!feature) return null;

    return {
        id: feature._id,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        icon: feature.icon,
        isActive: feature.isActive,
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt
    };
}

// Serialize feature list response
function featureListSerializer(features) {
    if (!features || !Array.isArray(features)) {
        return [];
    }

    return features.map(feature => featureCreationSerializer(feature));
}

module.exports = {
    featureCreationSerializer,
    featureListSerializer
};


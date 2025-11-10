// Sanitize feature data
function sanitizeFeatureData(data) {
    const sanitized = {};

    // Basic Information
    if (data.name) {
        sanitized.name = data.name.trim();
    }

    if (data.description) {
        sanitized.description = data.description.trim();
    }

    if (data.category) {
        sanitized.category = data.category.trim();
    }

    if (data.icon) {
        sanitized.icon = data.icon.trim();
    }

    // Status
    if (data.isActive !== undefined) {
        sanitized.isActive = data.isActive;
    }

    // Metadata
    if (data.metadata) {
        sanitized.metadata = data.metadata;
    }

    return sanitized;
}

module.exports = {
    sanitizeFeatureData
};


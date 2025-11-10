// Validate feature creation data
function validateFeature(data) {
    const errors = {};

    // Required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.name = 'Feature name is required';
    } else if (data.name.trim().length > 200) {
        errors.name = 'Feature name must be less than 200 characters';
    }

    // Optional fields validation
    if (data.description && data.description.length > 500) {
        errors.description = 'Description must be less than 500 characters';
    }

    if (data.category && data.category.length > 100) {
        errors.category = 'Category must be less than 100 characters';
    }

    if (data.icon && data.icon.length > 200) {
        errors.icon = 'Icon must be less than 200 characters';
    }

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
        errors.isActive = 'isActive must be a boolean value';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        fields: errors
    };
}

// Validate feature update data (all fields optional)
function validateFeatureUpdate(data) {
    const errors = {};

    // Optional fields validation (only validate if provided)
    if (data.name !== undefined) {
        if (typeof data.name !== 'string' || data.name.trim().length === 0) {
            errors.name = 'Feature name cannot be empty';
        } else if (data.name.trim().length > 200) {
            errors.name = 'Feature name must be less than 200 characters';
        }
    }

    if (data.description !== undefined && data.description.length > 500) {
        errors.description = 'Description must be less than 500 characters';
    }

    if (data.category !== undefined && data.category.length > 100) {
        errors.category = 'Category must be less than 100 characters';
    }

    if (data.icon !== undefined && data.icon.length > 200) {
        errors.icon = 'Icon must be less than 200 characters';
    }

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
        errors.isActive = 'isActive must be a boolean value';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        fields: errors
    };
}

module.exports = {
    validateFeature,
    validateFeatureUpdate
};


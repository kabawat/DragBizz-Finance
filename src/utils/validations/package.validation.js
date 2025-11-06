const { PACKAGE_STATUS, BILLING_CYCLE, CURRENCIES } = require('@src/constants/enum/package.enum');

// Validate package creation data
function validatePackage(data) {
    const errors = {};

    // Required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.name = 'Package name is required';
    } else if (data.name.trim().length > 200) {
        errors.name = 'Package name must be less than 200 characters';
    }

    if (!data.pricing) {
        errors.pricing = 'Pricing information is required';
    } else {
        // Validate pricing object
        if (data.pricing.amount < 0) {
            errors['pricing.amount'] = 'Pricing amount is required and must be a positive number';
        }

        if (!data.pricing.billingCycle || !BILLING_CYCLE.includes(data.pricing.billingCycle)) {
            errors['pricing.billingCycle'] = `Billing cycle must be one of: ${BILLING_CYCLE.join(', ')}`;
        }

        if (data.pricing.currency && !CURRENCIES.includes(data.pricing.currency)) {
            errors['pricing.currency'] = `Currency must be one of: ${CURRENCIES.join(', ')}`;
        }

        if (data.pricing.setupFee && (data.pricing.setupFee < 0)) {
            errors['pricing.setupFee'] = 'Setup fee must be a positive number';
        }

        if (data.pricing.discount < 0 || data.pricing.discount > 100) {
            errors['pricing.discount'] = 'Discount must be a number between 0 and 100';
        }
    }

    // Optional fields validation
    if (data.description && data.description.length > 1000) {
        errors.description = 'Description must be less than 1000 characters';
    }

    if (data.shortDescription && data.shortDescription.length > 200) {
        errors.shortDescription = 'Short description must be less than 200 characters';
    }

    if (data.planType && !['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'].includes(data.planType)) {
        errors.planType = 'Plan type must be one of: BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM';
    }

    if (data.status && !PACKAGE_STATUS.includes(data.status)) {
        errors.status = `Status must be one of: ${PACKAGE_STATUS.join(', ')}`;
    }

    // Validate features array if provided
    if (data.features && Array.isArray(data.features)) {
        data.features.forEach((feature, index) => {
            if (!feature.feature) {
                errors[`features[${index}].feature`] = 'Feature ID is required';
            }
            if (feature.limit !== undefined && feature.limit !== null && (typeof feature.limit !== 'number' || feature.limit < 0)) {
                errors[`features[${index}].limit`] = 'Feature limit must be a positive number or null';
            }
        });
    }

    // Validate trial period if provided
    if (data.trialPeriod) {
        if (data.trialPeriod.enabled && (!data.trialPeriod.days || typeof data.trialPeriod.days !== 'number' || data.trialPeriod.days < 0)) {
            errors['trialPeriod.days'] = 'Trial days must be a positive number when trial is enabled';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        fields: errors
    };
}

// Validate package update data (all fields optional)
function validatePackageUpdate(data) {
    const errors = {};

    // Optional fields validation (only validate if provided)
    if (data.name !== undefined) {
        if (typeof data.name !== 'string' || data.name.trim().length === 0) {
            errors.name = 'Package name cannot be empty';
        } else if (data.name.trim().length > 200) {
            errors.name = 'Package name must be less than 200 characters';
        }
    }

    if (data.pricing) {
        if (data.pricing.amount !== undefined && (typeof data.pricing.amount !== 'number' || data.pricing.amount < 0)) {
            errors['pricing.amount'] = 'Pricing amount must be a positive number';
        }

        if (data.pricing.billingCycle && !BILLING_CYCLE.includes(data.pricing.billingCycle)) {
            errors['pricing.billingCycle'] = `Billing cycle must be one of: ${BILLING_CYCLE.join(', ')}`;
        }

        if (data.pricing.currency && !CURRENCIES.includes(data.pricing.currency)) {
            errors['pricing.currency'] = `Currency must be one of: ${CURRENCIES.join(', ')}`;
        }

        if (data.pricing.setupFee !== undefined && (typeof data.pricing.setupFee !== 'number' || data.pricing.setupFee < 0)) {
            errors['pricing.setupFee'] = 'Setup fee must be a positive number';
        }

        if (data.pricing.discount !== undefined) {
            if (typeof data.pricing.discount !== 'number' || data.pricing.discount < 0 || data.pricing.discount > 100) {
                errors['pricing.discount'] = 'Discount must be a number between 0 and 100';
            }
        }
    }

    if (data.description !== undefined && data.description.length > 1000) {
        errors.description = 'Description must be less than 1000 characters';
    }

    if (data.shortDescription !== undefined && data.shortDescription.length > 200) {
        errors.shortDescription = 'Short description must be less than 200 characters';
    }

    if (data.planType && !['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'].includes(data.planType)) {
        errors.planType = 'Plan type must be one of: BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM';
    }

    if (data.status && !PACKAGE_STATUS.includes(data.status)) {
        errors.status = `Status must be one of: ${PACKAGE_STATUS.join(', ')}`;
    }

    // Validate features array if provided
    if (data.features && Array.isArray(data.features)) {
        data.features.forEach((feature, index) => {
            if (!feature.feature) {
                errors[`features[${index}].feature`] = 'Feature ID is required';
            }
            if (feature.limit !== undefined && feature.limit !== null && (typeof feature.limit !== 'number' || feature.limit < 0)) {
                errors[`features[${index}].limit`] = 'Feature limit must be a positive number or null';
            }
        });
    }

    return {
        isValid: Object.keys(errors).length === 0,
        fields: errors
    };
}

module.exports = {
    validatePackage,
    validatePackageUpdate
};

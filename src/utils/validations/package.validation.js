const { PACKAGE_STATUS } = require('@src/constants/enum/package.enum');
const mongoose = require('mongoose');

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
    } else if (!Array.isArray(data.pricing) || data.pricing.length === 0) {
        errors.pricing = 'At least one pricing option is required';
    } else {
        const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
        const seenMonths = new Set();
        
        data.pricing.forEach((pricingOption, index) => {
            if (!pricingOption.months || !validMonths.includes(pricingOption.months)) {
                errors[`pricing[${index}].months`] = `Months must be one of: ${validMonths.join(', ')}`;
            }
            
            if (seenMonths.has(pricingOption.months)) {
                errors[`pricing[${index}].months`] = `Duplicate months value: ${pricingOption.months}`;
            }
            seenMonths.add(pricingOption.months);

            if (pricingOption.price === undefined || pricingOption.price < 0) {
                errors[`pricing[${index}].price`] = 'Price is required and must be a positive number';
            }

            if (pricingOption.discount !== undefined && (pricingOption.discount < 0 || pricingOption.discount > 100)) {
                errors[`pricing[${index}].discount`] = 'Discount must be a number between 0 and 100';
            }
        });
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
        const seenFeatures = new Set();
        data.features.forEach((feature, index) => {
            const featureId = typeof feature === 'object' ? feature?.feature : feature;

            if (!featureId || typeof featureId !== 'string' || featureId.trim().length === 0) {
                errors[`features[${index}]`] = 'Feature ID is required';
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(featureId)) {
                errors[`features[${index}]`] = 'Invalid feature ID format';
                return;
            }

            const normalizedId = featureId.trim();
            if (seenFeatures.has(normalizedId)) {
                errors[`features[${index}]`] = 'Duplicate feature ID';
                return;
            }

            seenFeatures.add(normalizedId);
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

    if (data.pricing !== undefined) {
        if (!Array.isArray(data.pricing) || data.pricing.length === 0) {
            errors.pricing = 'At least one pricing option is required';
        } else {
            const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
            const seenMonths = new Set();
            
            data.pricing.forEach((pricingOption, index) => {
                if (pricingOption.months !== undefined) {
                    if (!validMonths.includes(pricingOption.months)) {
                        errors[`pricing[${index}].months`] = `Months must be one of: ${validMonths.join(', ')}`;
                    }
                    
                    if (seenMonths.has(pricingOption.months)) {
                        errors[`pricing[${index}].months`] = `Duplicate months value: ${pricingOption.months}`;
                    }
                    seenMonths.add(pricingOption.months);
                }

                if (pricingOption.price !== undefined && (typeof pricingOption.price !== 'number' || pricingOption.price < 0)) {
                    errors[`pricing[${index}].price`] = 'Price must be a positive number';
                }

                if (pricingOption.discount !== undefined && (typeof pricingOption.discount !== 'number' || pricingOption.discount < 0 || pricingOption.discount > 100)) {
                    errors[`pricing[${index}].discount`] = 'Discount must be a number between 0 and 100';
                }
            });
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
        const seenFeatures = new Set();
        data.features.forEach((feature, index) => {
            const featureId = typeof feature === 'object' ? feature?.feature : feature;

            if (!featureId || typeof featureId !== 'string' || featureId.trim().length === 0) {
                errors[`features[${index}]`] = 'Feature ID is required';
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(featureId)) {
                errors[`features[${index}]`] = 'Invalid feature ID format';
                return;
            }

            const normalizedId = featureId.trim();
            if (seenFeatures.has(normalizedId)) {
                errors[`features[${index}]`] = 'Duplicate feature ID';
                return;
            }

            seenFeatures.add(normalizedId);
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

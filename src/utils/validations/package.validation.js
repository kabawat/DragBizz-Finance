const { PACKAGE_STATUS, CURRENCIES } = require('@src/constants/enum/package.enum');

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
        if (data.pricing.currency && !CURRENCIES.includes(data.pricing.currency)) {
            errors['pricing.currency'] = `Currency must be one of: ${CURRENCIES.join(', ')}`;
        }

        if (data.pricing.setupFee && (data.pricing.setupFee < 0)) {
            errors['pricing.setupFee'] = 'Setup fee must be a positive number';
        }

        if (data.pricing.gstPercentage !== undefined && (data.pricing.gstPercentage < 0 || data.pricing.gstPercentage > 100)) {
            errors['pricing.gstPercentage'] = 'GST percentage must be a number between 0 and 100';
        }

        if (!data.pricing.durationPricing || !Array.isArray(data.pricing.durationPricing) || data.pricing.durationPricing.length === 0) {
            errors['pricing.durationPricing'] = 'At least one duration pricing is required';
        } else {
            const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
            const seenMonths = new Set();
            
            data.pricing.durationPricing.forEach((dp, index) => {
                if (!dp.months || !validMonths.includes(dp.months)) {
                    errors[`pricing.durationPricing[${index}].months`] = `Months must be one of: ${validMonths.join(', ')}`;
                }
                
                if (seenMonths.has(dp.months)) {
                    errors[`pricing.durationPricing[${index}].months`] = `Duplicate months value: ${dp.months}`;
                }
                seenMonths.add(dp.months);

                if (dp.price === undefined || dp.price < 0) {
                    errors[`pricing.durationPricing[${index}].price`] = 'Price is required and must be a positive number';
                }

                if (dp.discount !== undefined && (dp.discount < 0 || dp.discount > 100)) {
                    errors[`pricing.durationPricing[${index}].discount`] = 'Discount must be a number between 0 and 100';
                }
            });
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
        if (data.pricing.currency && !CURRENCIES.includes(data.pricing.currency)) {
            errors['pricing.currency'] = `Currency must be one of: ${CURRENCIES.join(', ')}`;
        }

        if (data.pricing.setupFee !== undefined && (typeof data.pricing.setupFee !== 'number' || data.pricing.setupFee < 0)) {
            errors['pricing.setupFee'] = 'Setup fee must be a positive number';
        }

        if (data.pricing.gstPercentage !== undefined) {
            if (typeof data.pricing.gstPercentage !== 'number' || data.pricing.gstPercentage < 0 || data.pricing.gstPercentage > 100) {
                errors['pricing.gstPercentage'] = 'GST percentage must be a number between 0 and 100';
            }
        }

        if (data.pricing.durationPricing !== undefined) {
            if (!Array.isArray(data.pricing.durationPricing) || data.pricing.durationPricing.length === 0) {
                errors['pricing.durationPricing'] = 'At least one duration pricing is required';
            } else {
                const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
                const seenMonths = new Set();
                
                data.pricing.durationPricing.forEach((dp, index) => {
                    if (dp.months !== undefined) {
                        if (!validMonths.includes(dp.months)) {
                            errors[`pricing.durationPricing[${index}].months`] = `Months must be one of: ${validMonths.join(', ')}`;
                        }
                        
                        if (seenMonths.has(dp.months)) {
                            errors[`pricing.durationPricing[${index}].months`] = `Duplicate months value: ${dp.months}`;
                        }
                        seenMonths.add(dp.months);
                    }

                    if (dp.price !== undefined && (typeof dp.price !== 'number' || dp.price < 0)) {
                        errors[`pricing.durationPricing[${index}].price`] = 'Price must be a positive number';
                    }

                    if (dp.discount !== undefined && (typeof dp.discount !== 'number' || dp.discount < 0 || dp.discount > 100)) {
                        errors[`pricing.durationPricing[${index}].discount`] = 'Discount must be a number between 0 and 100';
                    }
                });
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

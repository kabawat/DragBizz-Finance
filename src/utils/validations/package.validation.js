const { PACKAGE_STATUS } = require('@src/constants/enum/package.enum');
const { FEATURES, USAGE_TYPES } = require('@src/constants/features');

const validFeatureKeys = new Set(Object.values(FEATURES));

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
        const pricingArray = Array.isArray(data.pricing)
            ? data.pricing
            : Array.isArray(data.pricing.durationPricing)
                ? data.pricing.durationPricing
                : [];

        if (pricingArray.length === 0) {
        errors.pricing = 'At least one pricing option is required';
    } else {
        const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
        const seenMonths = new Set();
        
            pricingArray.forEach((pricingOption, index) => {
            if (!pricingOption.months || !validMonths.includes(pricingOption.months)) {
                errors[`pricing[${index}].months`] = `Months must be one of: ${validMonths.join(', ')}`;
            }
            
            if (seenMonths.has(pricingOption.months)) {
                errors[`pricing[${index}].months`] = `Duplicate months value: ${pricingOption.months}`;
            }
            seenMonths.add(pricingOption.months);

                if (pricingOption.price === undefined || pricingOption.price === null || isNaN(Number(pricingOption.price))) {
                    errors[`pricing[${index}].price`] = 'Price is required and must be zero or greater';
                } else if (Number(pricingOption.price) < 0) {
                    errors[`pricing[${index}].price`] = 'Price must be zero or greater';
            }

            if (pricingOption.discount !== undefined && (pricingOption.discount < 0 || pricingOption.discount > 100)) {
                errors[`pricing[${index}].discount`] = 'Discount must be a number between 0 and 100';
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

    if (data.featureUsageLimits && Array.isArray(data.featureUsageLimits)) {
        const seenFeatureKeys = new Set();

        data.featureUsageLimits.forEach((limit, index) => {
            const key = limit.featureKey;

            if (!key || typeof key !== 'string' || !validFeatureKeys.has(key)) {
                errors[`featureUsageLimits[${index}].featureKey`] = 'Invalid feature key';
                return;
            }

            if (seenFeatureKeys.has(key)) {
                errors[`featureUsageLimits[${index}].featureKey`] = 'Duplicate feature key';
                return;
            }
            seenFeatureKeys.add(key);

            const usageType = limit.usageType || USAGE_TYPES.UNLIMITED;
            if (!Object.values(USAGE_TYPES).includes(usageType)) {
                errors[`featureUsageLimits[${index}].usageType`] = 'Invalid usage type';
            }

            if (usageType !== USAGE_TYPES.UNLIMITED) {
                if (limit.totalLimit === undefined || limit.totalLimit === null || Number(limit.totalLimit) <= 0) {
                    errors[`featureUsageLimits[${index}].totalLimit`] = 'Total limit must be greater than 0';
                }
            }

            if (usageType === USAGE_TYPES.DAILY_ROLLING && limit.customDailyLimit !== undefined && limit.customDailyLimit !== null) {
                if (Number(limit.customDailyLimit) < 0) {
                    errors[`featureUsageLimits[${index}].customDailyLimit`] = 'Daily limit cannot be negative';
                }
            }
        });
            }

    if (data.maxSubscribers !== undefined && data.maxSubscribers !== null) {
        if (typeof data.maxSubscribers !== 'number' || data.maxSubscribers < 0) {
            errors.maxSubscribers = 'Max subscribers must be greater than or equal to 0';
        }
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
        const pricingArray = Array.isArray(data.pricing)
            ? data.pricing
            : Array.isArray(data.pricing.durationPricing)
                ? data.pricing.durationPricing
                : [];

        if (pricingArray.length === 0) {
            errors.pricing = 'At least one pricing option is required';
        } else {
            const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
            const seenMonths = new Set();
            
            pricingArray.forEach((pricingOption, index) => {
                if (pricingOption.months !== undefined) {
                    if (!validMonths.includes(pricingOption.months)) {
                        errors[`pricing[${index}].months`] = `Months must be one of: ${validMonths.join(', ')}`;
                    }
                    
                    if (seenMonths.has(pricingOption.months)) {
                        errors[`pricing[${index}].months`] = `Duplicate months value: ${pricingOption.months}`;
                    }
                    seenMonths.add(pricingOption.months);
                }

                if (pricingOption.price !== undefined && pricingOption.price !== null) {
                    if (isNaN(Number(pricingOption.price))) {
                        errors[`pricing[${index}].price`] = 'Price must be zero or greater';
                    } else if (Number(pricingOption.price) < 0) {
                        errors[`pricing[${index}].price`] = 'Price must be zero or greater';
                    }
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

     if (data.featureUsageLimits && Array.isArray(data.featureUsageLimits)) {
        const seenFeatureKeys = new Set();

        data.featureUsageLimits.forEach((limit, index) => {
            if (limit.featureKey !== undefined) {
                if (typeof limit.featureKey !== 'string' || !validFeatureKeys.has(limit.featureKey)) {
                    errors[`featureUsageLimits[${index}].featureKey`] = 'Invalid feature key';
                } else if (seenFeatureKeys.has(limit.featureKey)) {
                    errors[`featureUsageLimits[${index}].featureKey`] = 'Duplicate feature key';
                } else {
                    seenFeatureKeys.add(limit.featureKey);
                }
            }

            if (limit.usageType !== undefined && !Object.values(USAGE_TYPES).includes(limit.usageType)) {
                errors[`featureUsageLimits[${index}].usageType`] = 'Invalid usage type';
            }

            const usageType = limit.usageType || USAGE_TYPES.UNLIMITED;
            if (usageType !== USAGE_TYPES.UNLIMITED && limit.totalLimit !== undefined) {
                if (limit.totalLimit === null || Number(limit.totalLimit) <= 0) {
                    errors[`featureUsageLimits[${index}].totalLimit`] = 'Total limit must be greater than 0';
                }
            }

            if (usageType === USAGE_TYPES.DAILY_ROLLING && limit.customDailyLimit !== undefined && limit.customDailyLimit !== null) {
                if (Number(limit.customDailyLimit) < 0) {
                    errors[`featureUsageLimits[${index}].customDailyLimit`] = 'Daily limit cannot be negative';
                }
            }
        });
            }

    if (data.maxSubscribers !== undefined) {
        if (data.maxSubscribers !== null && (typeof data.maxSubscribers !== 'number' || data.maxSubscribers < 0)) {
            errors.maxSubscribers = 'Max subscribers must be greater than or equal to 0';
        }
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

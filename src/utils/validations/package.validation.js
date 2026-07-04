const { PACKAGE_STATUS, PACKAGE_MODULES } = require('@src/constants/enum/package.enum');
const { USAGE_TYPES } = require('@src/constants/features');

const validFeatureKeys = new Set(PACKAGE_MODULES);

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

    if (data.planType && !['STARTUP', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'].includes(data.planType)) {
        errors.planType = 'Plan type must be one of: STARTUP, BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM';
    }

    if (data.status && !PACKAGE_STATUS.includes(data.status)) {
        errors.status = `Status must be one of: ${PACKAGE_STATUS.join(', ')}`;
    }

    if (data.features && Array.isArray(data.features)) {
        const seenModules = new Set();

        data.features.forEach((feature, index) => {
            const moduleName = feature.module;

            if (!moduleName || typeof moduleName !== 'string' || !validFeatureKeys.has(moduleName)) {
                errors[`features[${index}].module`] = 'Invalid module name';
                return;
            }

            if (seenModules.has(moduleName)) {
                errors[`features[${index}].module`] = 'Duplicate module name';
                return;
            }
            seenModules.add(moduleName);

            const usageType = feature.usageType || USAGE_TYPES.UNLIMITED;
            if (!Object.values(USAGE_TYPES).includes(usageType)) {
                errors[`features[${index}].usageType`] = 'Invalid usage type';
            }

            if (usageType !== USAGE_TYPES.UNLIMITED) {
                if (feature.usageLimit === undefined || feature.usageLimit === null || Number(feature.usageLimit) < 0) {
                    errors[`features[${index}].usageLimit`] = 'Usage limit must be greater than or equal to 0';
                }
            }

            if (usageType === USAGE_TYPES.DAILY_ROLLING && feature.customDailyLimit !== undefined && feature.customDailyLimit !== null) {
                if (Number(feature.customDailyLimit) < 0) {
                    errors[`features[${index}].customDailyLimit`] = 'Daily limit cannot be negative';
                }
            }
        });
    }

    if (data.highlights) {
        if (!Array.isArray(data.highlights)) {
            errors.highlights = 'Highlights must be an array';
        } else {
            data.highlights.forEach((highlight, index) => {
                if (typeof highlight !== 'string') {
                    errors[`highlights[${index}]`] = 'Highlight must be a string';
                } else if (highlight.trim().length > 500) {
                    errors[`highlights[${index}]`] = 'Highlight must be less than 500 characters';
                }
            });
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

    if (data.planType && !['STARTUP', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'].includes(data.planType)) {
        errors.planType = 'Plan type must be one of: STARTUP, BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM';
    }

    if (data.status && !PACKAGE_STATUS.includes(data.status)) {
        errors.status = `Status must be one of: ${PACKAGE_STATUS.join(', ')}`;
    }

    if (data.features && Array.isArray(data.features)) {
        const seenModules = new Set();

        data.features.forEach((feature, index) => {
            if (feature.module !== undefined) {
                if (typeof feature.module !== 'string' || !validFeatureKeys.has(feature.module)) {
                    errors[`features[${index}].module`] = 'Invalid module name';
                } else if (seenModules.has(feature.module)) {
                    errors[`features[${index}].module`] = 'Duplicate module name';
                } else {
                    seenModules.add(feature.module);
                }
            }

            if (feature.usageType !== undefined && !Object.values(USAGE_TYPES).includes(feature.usageType)) {
                errors[`features[${index}].usageType`] = 'Invalid usage type';
            }

            const usageType = feature.usageType || USAGE_TYPES.UNLIMITED;
            if (usageType !== USAGE_TYPES.UNLIMITED && feature.usageLimit !== undefined) {
                if (feature.usageLimit === null || Number(feature.usageLimit) < 0) {
                    errors[`features[${index}].usageLimit`] = 'Usage limit must be greater than or equal to 0';
                }
            }

            if (usageType === USAGE_TYPES.DAILY_ROLLING && feature.customDailyLimit !== undefined && feature.customDailyLimit !== null) {
                if (Number(feature.customDailyLimit) < 0) {
                    errors[`features[${index}].customDailyLimit`] = 'Daily limit cannot be negative';
                }
            }
        });
    }

    if (data.highlights) {
        if (!Array.isArray(data.highlights)) {
            errors.highlights = 'Highlights must be an array';
        } else {
            data.highlights.forEach((highlight, index) => {
                if (typeof highlight !== 'string') {
                    errors[`highlights[${index}]`] = 'Highlight must be a string';
                } else if (highlight.trim().length > 500) {
                    errors[`highlights[${index}]`] = 'Highlight must be less than 500 characters';
                }
            });
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

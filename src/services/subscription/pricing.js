const { validateAmount, validateAmountBreakdown } = require('@src/utils/security/amount.validation');

function getBillingCycleFromMonths(months) {
    if (months === 1) return 'MONTHLY';
    if (months === 3) return 'QUARTERLY';
    if (months === 12) return 'YEARLY';
    return 'ONE_TIME';
}

async function calculateCouponDiscount() {
    return 0;
}

async function calculateFinalPricing(pricingOption, couponCode) {
    const baseAmount = pricingOption.discountedPrice || pricingOption.price;
    const baseValidation = validateAmount(baseAmount);
    if (!baseValidation.isValid) {
        throw new Error(baseValidation.error);
    }

    const discountAmount = couponCode ? await calculateCouponDiscount(baseAmount, couponCode) : 0;
    const amountAfterDiscount = Math.max(0, baseAmount - discountAmount);
    const taxAmount = 0;
    const finalAmount = amountAfterDiscount + taxAmount;

    const finalAmountValidation = validateAmount(finalAmount);
    if (!finalAmountValidation.isValid) {
        throw new Error(finalAmountValidation.error);
    }

    const breakdownValidation = validateAmountBreakdown(baseAmount, discountAmount, taxAmount, finalAmount);
    if (!breakdownValidation.isValid) {
        throw new Error(breakdownValidation.error);
    }

    return { baseAmount, discountAmount, taxAmount, finalAmount };
}

module.exports = {
    getBillingCycleFromMonths,
    calculateFinalPricing
};

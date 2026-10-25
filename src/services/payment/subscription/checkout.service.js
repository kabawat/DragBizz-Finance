const { getPackageById, validatePayment } = require('@src/services/subscription');
const { createPaymentOrder } = require('./create.service');
const { getBillingCycleFromMonths, calculateFinalPricing } = require('./pricing.service');

function httpError(message, statusCode, fields) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (fields) error.fields = fields;
    return error;
}

async function assertPackagePaymentAllowed({ userId, agencyId, packageId, months }) {
    const result = await validatePayment({ userId, agencyId, packageId, months });
    if (!result.allowed) {
        throw httpError(
            result.message || 'This package purchase is not currently allowed.',
            400,
            {
                daysRemaining: String(result.daysRemaining || 0),
                suggestion: 'You can renew this subscription closer to the expiry date'
            }
        );
    }
}

async function createPackagePayment(orderData) {
    const { userId, agencyId = null, packageId, months, couponCode, email, phone, customerName, idempotencyKey, ipAddress, userAgent } = orderData;

    await assertPackagePaymentAllowed({ userId, agencyId, packageId, months });

    const packageDoc = await getPackageById(packageId);

    if (!packageDoc) {
        throw new Error('Package not found or not available');
    }

    const monthsNum = parseInt(months, 10);
    const pricingOption = packageDoc.pricing?.find((item) => item.months === monthsNum);
    if (!pricingOption) {
        throw new Error(`Pricing not available for ${monthsNum} month(s)`);
    }

    const { baseAmount, discountAmount, taxAmount, finalAmount } = await calculateFinalPricing(pricingOption, couponCode);
    const billingCycle = getBillingCycleFromMonths(monthsNum);

    return createPaymentOrder({
        userId,
        amount: finalAmount,
        currency: 'INR',
        description: packageDoc.name,
        customer: { email, phone, name: customerName },
        context: {
            agencyId,
            packageId,
            months: monthsNum,
            billingCycle,
            couponCode,
            baseAmount,
            discountAmount,
            taxAmount,
            discountPercentage: discountAmount > 0 ? (discountAmount / baseAmount) * 100 : 0
        },
        idempotencyKey,
        ipAddress,
        userAgent
    });
}

module.exports = { createPackagePayment };

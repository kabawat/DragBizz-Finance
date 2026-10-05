const { PackageModel } = require('@src/models');
const SubscriptionService = require('@src/services/subscription');
const { createPaymentOrder } = require('@src/services/payment/create.service');
const { comparePackages } = require('./helpers');
const { getBillingCycleFromMonths, calculateFinalPricing } = require('./pricing');

function httpError(message, statusCode, fields) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (fields) error.fields = fields;
    return error;
}

async function assertRenewalAllowed({ userId, agencyId, packageId, months }) {
    const existingSubscription = await SubscriptionService.getActiveSubscription(userId, { agencyId });
    if (!existingSubscription) return;

    const newPackage = await PackageModel.findById(packageId).lean();
    if (!newPackage) {
        throw httpError('Package not found', 404);
    }

    const existingPackage = await PackageModel.findById(existingSubscription.packageId).lean();
    if (!existingPackage) return;

    if (comparePackages(existingPackage, newPackage, months || 1) !== 'SAME') return;

    const daysRemaining = Math.ceil((new Date(existingSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysRemaining > 30) {
        throw httpError(
            'You already have an active subscription for this package. Please wait until closer to expiry date to renew.',
            400,
            {
                daysRemaining: daysRemaining.toString(),
                suggestion: 'You can renew this subscription closer to the expiry date'
            }
        );
    }
}

async function createSubscriptionPayment(orderData) {
    const { userId, agencyId = null, packageId, months, couponCode, email, phone, customerName, idempotencyKey, ipAddress, userAgent } = orderData;

    await assertRenewalAllowed({ userId, agencyId, packageId, months });

    const packageDoc = await PackageModel.findOne({
        _id: packageId,
        status: 'ACTIVE',
        isVisible: true,
        deletedAt: null
    }).select('name pricing').lean();

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

module.exports = { createSubscriptionPayment };

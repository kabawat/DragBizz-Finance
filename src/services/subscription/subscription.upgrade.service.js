const { SubscriptionModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { processFeatures, calculateProratedCredit } = require('./subscription.helpers');

async function upgradeSubscription(existingSubscription, newPackage, payment, months, ipAddress, userAgent, session) {
    const proratedCredit = calculateProratedCredit(existingSubscription, months);

    existingSubscription.status = 'CANCELLED';
    existingSubscription.cancelledAt = new Date();
    existingSubscription.cancellationReason = 'Upgraded to higher package';
    existingSubscription.autoRenew = false;
    await existingSubscription.save({ session });

    await logSubscriptionEvent('SUBSCRIPTION_CANCELLED', {
        subscriptionId: existingSubscription._id,
        userId: existingSubscription.userId,
        packageId: existingSubscription.packageId,
        reason: 'Upgraded to higher package',
        ipAddress,
        userAgent
    });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const processedFeatures = processFeatures(newPackage.features);

    const newSubscriptionData = {
        userId: existingSubscription.userId,
        packageId: newPackage._id,
        paymentId: payment._id,
        status: 'ACTIVE',
        billingCycle: payment.billingCycle,
        startDate,
        endDate,
        autoRenew: false,
        nextBillingDate: months === 1 ? endDate : null,
        features: processedFeatures
    };

    const subscription = new SubscriptionModel(newSubscriptionData);
    await subscription.save({ session });

    payment.subscriptionId = subscription._id;
    if (proratedCredit > 0) {
        payment.metadata = payment.metadata || {};
        payment.metadata.proratedCredit = proratedCredit;
        payment.metadata.originalAmount = payment.amount;
        payment.amount = Math.max(0, payment.amount - proratedCredit);
    }
    await payment.save({ session });

    await logSubscriptionEvent('SUBSCRIPTION_UPGRADED', {
        subscriptionId: subscription._id,
        userId: existingSubscription.userId,
        oldPackageId: existingSubscription.packageId,
        newPackageId: newPackage._id,
        paymentId: payment._id,
        proratedCredit,
        ipAddress,
        userAgent
    });

    return subscription;
}

module.exports = {
    upgradeSubscription
};


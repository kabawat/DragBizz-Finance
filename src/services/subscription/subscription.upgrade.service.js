const { SubscriptionModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { processFeatures, calculateProratedCredit } = require('./subscription.helpers');

async function upgradeSubscription(existingSubscription, newPackage, payment, months, ipAddress, userAgent) {
    const proratedCredit = calculateProratedCredit(existingSubscription, months);
    
    existingSubscription.status = 'CANCELLED';
    existingSubscription.cancelledAt = new Date();
    existingSubscription.cancellationReason = 'Upgraded to higher package';
    existingSubscription.autoRenew = false;
    await existingSubscription.save();
    
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
    
    let trialEndDate = null;
    if (newPackage.trialPeriod && newPackage.trialPeriod.enabled) {
        trialEndDate = new Date(startDate);
        trialEndDate.setDate(trialEndDate.getDate() + newPackage.trialPeriod.days);
    }
    
    const processedFeatures = processFeatures(newPackage.featureUsageLimits);
    
    const newSubscriptionData = {
        userId: existingSubscription.userId,
        packageId: newPackage._id,
        paymentId: payment._id,
        status: trialEndDate ? 'TRIAL' : 'ACTIVE',
        billingCycle: payment.billingCycle,
        startDate,
        endDate,
        trialEndDate,
        autoRenew: false,
        nextBillingDate: months === 1 ? endDate : null,
        maxSubscribersSnapshot: newPackage.maxSubscribers ?? null,
        features: processedFeatures
    };
    
    const subscription = new SubscriptionModel(newSubscriptionData);
    await subscription.save();
    
    payment.subscriptionId = subscription._id;
    if (proratedCredit > 0) {
        payment.metadata = payment.metadata || {};
        payment.metadata.proratedCredit = proratedCredit;
        payment.metadata.originalAmount = payment.amount;
        payment.amount = Math.max(0, payment.amount - proratedCredit);
    }
    await payment.save();
    
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


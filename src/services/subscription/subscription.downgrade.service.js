const { SubscriptionModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { processFeatures } = require('./subscription.helpers');

async function downgradeSubscription(existingSubscription, newPackage, payment, months, ipAddress, userAgent) {
    const currentEndDate = new Date(existingSubscription.endDate);
    const now = new Date();
    
    if (currentEndDate <= now) {
        existingSubscription.status = 'CANCELLED';
        existingSubscription.cancelledAt = new Date();
        existingSubscription.cancellationReason = 'Downgraded to lower package';
        existingSubscription.autoRenew = false;
        await existingSubscription.save();
        
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
        await payment.save();
        
        await logSubscriptionEvent('SUBSCRIPTION_DOWNGRADED', {
            subscriptionId: subscription._id,
            userId: existingSubscription.userId,
            oldPackageId: existingSubscription.packageId,
            newPackageId: newPackage._id,
            paymentId: payment._id,
            ipAddress,
            userAgent
        });
        
        return subscription;
    }
    
    existingSubscription.status = 'CANCELLED';
    existingSubscription.cancelledAt = currentEndDate;
    existingSubscription.cancellationReason = 'Scheduled downgrade to lower package';
    existingSubscription.autoRenew = false;
    await existingSubscription.save();
    
    const startDate = new Date(currentEndDate);
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
        status: 'PENDING',
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
    await payment.save();
    
    await logSubscriptionEvent('SUBSCRIPTION_DOWNGRADE_SCHEDULED', {
        subscriptionId: subscription._id,
        userId: existingSubscription.userId,
        oldPackageId: existingSubscription.packageId,
        newPackageId: newPackage._id,
        paymentId: payment._id,
        scheduledStartDate: startDate,
        ipAddress,
        userAgent
    });
    
    return subscription;
}

module.exports = {
    downgradeSubscription
};


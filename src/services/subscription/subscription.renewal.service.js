const { SubscriptionModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');

async function renewSubscription(existingSubscription, payment, months) {
    const currentEndDate = new Date(existingSubscription.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);
    
    existingSubscription.endDate = newEndDate;
    existingSubscription.paymentId = payment._id;
    existingSubscription.nextBillingDate = months === 1 ? newEndDate : null;
    await existingSubscription.save();
    
    payment.subscriptionId = existingSubscription._id;
    await payment.save();
    
    await logSubscriptionEvent('SUBSCRIPTION_RENEWED', {
        subscriptionId: existingSubscription._id,
        userId: existingSubscription.userId,
        packageId: existingSubscription.packageId,
        paymentId: payment._id,
        newEndDate: newEndDate,
        ipAddress: null,
        userAgent: null
    });
    
    return existingSubscription;
}

module.exports = {
    renewSubscription
};


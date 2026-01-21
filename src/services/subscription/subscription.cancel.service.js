const { SubscriptionModel } = require('@src/models');
const { deleteCache } = require('@src/services/cache.service');
const {
    ACTIVE_STATUSES,
    getCacheKey
} = require('./subscription.helpers');

async function cancelSubscription(subscriptionId, userId, reason = null) {
    try {
        const subscription = await SubscriptionModel.findOne({
            _id: subscriptionId,
            userId,
            status: { $in: ACTIVE_STATUSES }
        });

        if (!subscription) {
            throw new Error('Active subscription not found');
        }

        subscription.status = 'CANCELLED';
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = reason;
        subscription.autoRenew = false;

        await subscription.save();

        const cacheKey = getCacheKey(subscription.userId);
        await deleteCache(cacheKey);

        return subscription;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    cancelSubscription
};


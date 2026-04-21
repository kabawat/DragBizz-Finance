const { SubscriptionModel } = require('@src/models');
const { deleteCache } = require('@src/services/cache.service');
const createSubscriptionGrpc = require('@src/lib/grpc/clients/retailer/services/createSubscription.service');
const logger = require('@src/utils/logger');
const {
    ACTIVE_STATUSES,
    getCacheKey
} = require('./helpers');

async function cancelSubscription(subscriptionId, userId, reason = null) {
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

    // Notify Retailer service so it immediately stops granting access
    try {
        await createSubscriptionGrpc({
            userId: subscription.userId.toString(),
            agencyId: subscription.agencyId ? subscription.agencyId.toString() : '',
            subscriptionId: subscription._id.toString(),
            startDate: subscription.startDate.toISOString(),
            endDate: subscription.endDate.toISOString(),
            status: 'CANCELLED',
            features: []
        });
    } catch (grpcErr) {
        logger.error('[ALERT] Failed to sync subscription CANCELLED with Retailer service', {
            error: grpcErr.message,
            subscriptionId: subscription._id.toString(),
            userId
        });
    }

    return subscription;
}

module.exports = {
    cancelSubscription
};

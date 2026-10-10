const { SubscriptionModel } = require('@src/models');
const { getCache, setCache, deleteCache } = require('@src/services/cache.service');
const {
    getCacheKey,
    populateSubscription,
    getActiveSubscriptionQuery,
    isSubscriptionActive
} = require('./helpers');

const SUBSCRIPTION_CACHE_TTL = 300;
const LOG = "[SUB_ACTIVE]";

async function getActiveSubscription(userId, options = {}) {
    const { populatePackage = true, agencyId } = options;
    const cacheKey = agencyId ? `sub:active:agency:${agencyId}` : getCacheKey(userId);


    try {
        const cachedSubscription = await getCache(cacheKey);

        if (cachedSubscription && isSubscriptionActive(cachedSubscription)) {
            if (!populatePackage && cachedSubscription.packageId && cachedSubscription.packageId._id) {
                cachedSubscription.packageId = cachedSubscription.packageId._id;
            }
            return cachedSubscription;
        }

        if (cachedSubscription) {
            await deleteCache(cacheKey).catch(() => { });
        }
    } catch (cacheError) {
    }

    const now = new Date();
    const mongoQuery = getActiveSubscriptionQuery(userId, now, agencyId);

    const query = SubscriptionModel.findOne(mongoQuery)
        .select('_id status billingCycle startDate endDate nextBillingDate features packageId paymentId createdAt');

    const subscription = await (populatePackage ? populateSubscription(query) : query.populate('paymentId', 'amount currency status'))
        .sort({ createdAt: -1 })
        .lean();


    if (subscription) {
        if (!populatePackage && subscription.packageId) {
            subscription.packageId = subscription.packageId._id || subscription.packageId;
        }
        await setCache(cacheKey, subscription, SUBSCRIPTION_CACHE_TTL).catch(() => { });
    } else {
        await setCache(cacheKey, null, 60).catch(() => { });
    }

    return subscription;
}

module.exports = {
    getActiveSubscription
};

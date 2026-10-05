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

    console.log(`${LOG} [11] getActiveSubscription: start`, { userId, agencyId, populatePackage, cacheKey });

    try {
        const cachedSubscription = await getCache(cacheKey);
        console.log(`${LOG} [12] getActiveSubscription: cache lookup`, {
            hit: !!cachedSubscription,
            cacheActive: cachedSubscription ? isSubscriptionActive(cachedSubscription) : false,
        });

        if (cachedSubscription && isSubscriptionActive(cachedSubscription)) {
            console.log(`${LOG} [13] getActiveSubscription: return from cache`);
            if (!populatePackage && cachedSubscription.packageId && cachedSubscription.packageId._id) {
                cachedSubscription.packageId = cachedSubscription.packageId._id;
            }
            return cachedSubscription;
        }

        if (cachedSubscription) {
            console.log(`${LOG} [12a] getActiveSubscription: stale cache, deleting`);
            await deleteCache(cacheKey).catch(() => { });
        }
    } catch (cacheError) {
        console.log(`${LOG} [12b] getActiveSubscription: cache error (continuing)`, cacheError.message);
    }

    const now = new Date();
    const mongoQuery = getActiveSubscriptionQuery(userId, now, agencyId);
    console.log(`${LOG} [14] getActiveSubscription: DB query`, { mongoQuery, now: now.toISOString() });

    const query = SubscriptionModel.findOne(mongoQuery)
        .select('_id status billingCycle startDate endDate nextBillingDate features packageId paymentId createdAt');

    const subscription = await (populatePackage ? populateSubscription(query) : query.populate('paymentId', 'amount currency status'))
        .sort({ createdAt: -1 })
        .lean();

    console.log(`${LOG} [15] getActiveSubscription: DB result`, {
        found: !!subscription,
        id: subscription?._id?.toString?.(),
        status: subscription?.status,
        startDate: subscription?.startDate,
        endDate: subscription?.endDate,
    });

    if (subscription) {
        if (!populatePackage && subscription.packageId) {
            subscription.packageId = subscription.packageId._id || subscription.packageId;
        }
        await setCache(cacheKey, subscription, SUBSCRIPTION_CACHE_TTL).catch(() => { });
        console.log(`${LOG} [16] getActiveSubscription: cached & returning subscription`);
    } else {
        await setCache(cacheKey, null, 60).catch(() => { });
        console.log(`${LOG} [16a] getActiveSubscription: no row found, negative cache set`);
    }

    return subscription;
}

module.exports = {
    getActiveSubscription
};

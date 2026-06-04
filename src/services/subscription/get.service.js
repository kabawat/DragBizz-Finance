const { SubscriptionModel } = require('@src/models');
const { getCache, setCache, deleteCache } = require('@src/services/cache.service');
const {
    PAYMENT_POPULATE_FIELDS_WITH_ORDER,
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

async function getUserSubscriptions(userId, options = {}) {
    const {
        page = 1,
        limit = 10,
        status
    } = options;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId };
    if (status) {
        query.status = status;
    }

    const total = await SubscriptionModel.countDocuments(query);
    const subscriptions = await populateSubscription(
        SubscriptionModel.find(query)
    )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    return {
        subscriptions,
        pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
        }
    };
}

async function getSubscriptionById(subscriptionId, userId) {
    const subscription = await populateSubscription(
        SubscriptionModel.findOne({
            _id: subscriptionId,
            userId
        }),
        PAYMENT_POPULATE_FIELDS_WITH_ORDER
    ).lean();

    if (!subscription) {
        throw new Error('Subscription not found');
    }

    return subscription;
}

module.exports = {
    getActiveSubscription,
    getUserSubscriptions,
    getSubscriptionById
};

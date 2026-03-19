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
        // Ignore cache errors and proceed to DB fetch
    }

    const now = new Date();
    let query = SubscriptionModel.findOne(getActiveSubscriptionQuery(userId, now, agencyId));

    if (populatePackage) {
        query = populateSubscription(query);
    } else {
        query = query.populate('paymentId', 'amount currency status');
    }

    const subscription = await query
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

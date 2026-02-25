const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL'];
const PACKAGE_POPULATE_FIELDS = 'name description pricing isAIFeature planType';
const PAYMENT_POPULATE_FIELDS_BASIC = 'amount currency status';
const PAYMENT_POPULATE_FIELDS_FULL = 'amount currency status notes metadata razorpayResponse';
const PAYMENT_POPULATE_FIELDS_WITH_ORDER = 'amount currency status razorpayOrderId';

function getCacheKey(userId) {
    return `sub:active:${userId}`;
}

function populateSubscription(query, paymentFields = PAYMENT_POPULATE_FIELDS_BASIC) {
    return query
        .populate('packageId', PACKAGE_POPULATE_FIELDS)
        .populate('paymentId', paymentFields);
}

function getActiveSubscriptionQuery(userId, now = new Date(), agencyId = null) {
    const query = {
        status: { $in: ACTIVE_STATUSES },
        startDate: { $lte: now },
        endDate: { $gte: now }
    };

    if (agencyId) {
        query.agencyId = agencyId;
    } else {
        query.userId = userId;
    }

    return query;
}

function isSubscriptionActive(subscription, now = new Date()) {
    if (!subscription) return false;
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    return (
        ACTIVE_STATUSES.includes(subscription.status) &&
        startDate <= now &&
        endDate >= now
    );
}

function extractUserEmail(payment) {
    if (payment?.metadata?.email) {
        return payment.metadata.email;
    }
    if (payment?.razorpayResponse?.notes?.email) {
        return payment.razorpayResponse.notes.email;
    }
    if (payment?.notes) {
        try {
            const notesObj = typeof payment.notes === 'string' ? JSON.parse(payment.notes) : payment.notes;
            return notesObj?.email || null;
        } catch {
            return null;
        }
    }
    return null;
}

function processFeatures(featureUsageLimits) {
    return Array.isArray(featureUsageLimits)
        ? featureUsageLimits
            .filter(limit => limit && limit.featureKey)
            .map(limit => ({
                featureKey: limit.featureKey,
                featureName: FEATURE_DISPLAY_NAMES[limit.featureKey] || limit.featureKey,
                enabled: limit.enabled !== false,
                usageLimits: {
                    usageType: limit.usageType || 'UNLIMITED',
                    totalLimit: limit.totalLimit ?? null,
                    customDailyLimit: limit.customDailyLimit ?? null
                },
                metadata: limit.metadata || {}
            }))
        : [];
}

function comparePackages(oldPackage, newPackage) {
    const planTypeOrder = { 'BASIC': 1, 'PROFESSIONAL': 2, 'ENTERPRISE': 3, 'CUSTOM': 4 };
    const oldOrder = planTypeOrder[oldPackage.planType] || 0;
    const newOrder = planTypeOrder[newPackage.planType] || 0;

    if (newOrder > oldOrder) return 'UPGRADE';
    if (newOrder < oldOrder) return 'DOWNGRADE';

    const oldPrice = oldPackage.pricing?.[0]?.price || 0;
    const newPrice = newPackage.pricing?.[0]?.price || 0;

    if (newPrice > oldPrice) return 'UPGRADE';
    if (newPrice < oldPrice) return 'DOWNGRADE';

    return 'SAME';
}

function calculateProratedCredit(subscription, months) {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const startDate = new Date(subscription.startDate);

    if (endDate <= now) return 0;

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0 || remainingDays <= 0) return 0;

    const subscriptionPayment = subscription.paymentId;
    const totalAmount = subscriptionPayment?.amount || 0;
    const proratedAmount = (totalAmount / totalDays) * remainingDays;

    return Math.max(0, Math.round(proratedAmount * 100) / 100);
}

module.exports = {
    ACTIVE_STATUSES,
    PAYMENT_POPULATE_FIELDS_FULL,
    PAYMENT_POPULATE_FIELDS_WITH_ORDER,
    getCacheKey,
    populateSubscription,
    getActiveSubscriptionQuery,
    isSubscriptionActive,
    extractUserEmail,
    processFeatures,
    comparePackages,
    calculateProratedCredit
};


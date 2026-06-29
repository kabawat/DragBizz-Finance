const { SubscriptionModel } = require('@src/models');
const {
    getActiveSubscriptionQuery,
    isSubscriptionActive,
} = require('@src/services/subscription/helpers');
const { hasValidInternalSecret } = require('@src/utils/internalAuth');
const logger = require('@src/utils/logger');

function unauthorizedCallback(callback) {
    callback({
        code: 16, // UNAUTHENTICATED
        message: 'Invalid or missing internal secret',
    });
}

function checkFeatureLogic(agencyId, moduleName) {
    const now = new Date();
    return SubscriptionModel.findOne(getActiveSubscriptionQuery(null, now, agencyId))
        .lean()
        .then((subscription) => {
            if (!subscription || !isSubscriptionActive(subscription, now)) {
                return {
                    entitled: false,
                    code: 'FEATURE_NOT_AVAILABLE',
                    message: 'No active subscription found',
                    usage_type: '',
                    max_limit: 0,
                    current_usage: 0,
                    remaining: 0,
                };
            }

            const feature = (subscription.features || []).find((f) => f.module === moduleName);
            if (!feature) {
                return {
                    entitled: false,
                    code: 'FEATURE_NOT_AVAILABLE',
                    message: `Feature ${moduleName} not in plan`,
                    usage_type: '',
                    max_limit: 0,
                    current_usage: 0,
                    remaining: 0,
                };
            }

            const usageType = feature.usageType || 'UNLIMITED';
            const maxLimit = feature.usageLimit != null ? Number(feature.usageLimit) : null;
            const currentUsage = Number(feature.currentUsage || 0);

            if (usageType === 'UNLIMITED' || maxLimit === null) {
                return {
                    entitled: true,
                    code: '',
                    message: 'OK',
                    usage_type: usageType,
                    max_limit: -1,
                    current_usage: currentUsage,
                    remaining: -1,
                };
            }

            if (maxLimit <= 0) {
                return {
                    entitled: false,
                    code: 'FEATURE_NOT_AVAILABLE',
                    message: `Feature ${moduleName} is disabled on this plan`,
                    usage_type: usageType,
                    max_limit: maxLimit,
                    current_usage: currentUsage,
                    remaining: 0,
                };
            }

            const dateStr = now.toLocaleDateString('en-CA');
            const monthStr = dateStr.substring(0, 7);
            let effectiveUsage = currentUsage;

            if (usageType === 'DAILY_FIXED' && feature.lastUsedDate !== dateStr) {
                effectiveUsage = 0;
            }
            if (usageType === 'MONTHLY_TOTAL' && feature.lastUsedMonth !== monthStr) {
                effectiveUsage = 0;
            }

            const remaining = Math.max(0, maxLimit - effectiveUsage);
            if (effectiveUsage >= maxLimit) {
                return {
                    entitled: false,
                    code: 'QUOTA_EXCEEDED',
                    message: `Quota exceeded for ${moduleName}`,
                    usage_type: usageType,
                    max_limit: maxLimit,
                    current_usage: effectiveUsage,
                    remaining: 0,
                };
            }

            return {
                entitled: true,
                code: '',
                message: 'OK',
                usage_type: usageType,
                max_limit: maxLimit,
                current_usage: effectiveUsage,
                remaining,
            };
        });
}

async function incrementUsageLogic(agencyId, moduleName, amount) {
    const now = new Date();
    const subscription = await SubscriptionModel.findOne(
        getActiveSubscriptionQuery(null, now, agencyId),
    );
    if (!subscription) {
        return { success: false, current_usage: 0, remaining: 0, code: 'FEATURE_NOT_AVAILABLE' };
    }

    const features = subscription.features || [];
    const idx = features.findIndex((f) => f.module === moduleName);
    if (idx < 0) {
        return { success: false, current_usage: 0, remaining: 0, code: 'FEATURE_NOT_AVAILABLE' };
    }

    const feature = features[idx];
    const usageType = feature.usageType || 'UNLIMITED';
    const maxLimit = feature.usageLimit != null ? Number(feature.usageLimit) : null;

    if (usageType === 'UNLIMITED' || maxLimit === null) {
        return { success: true, current_usage: 0, remaining: -1, code: '' };
    }

    const dateStr = now.toLocaleDateString('en-CA');
    const monthStr = dateStr.substring(0, 7);
    let currentUsage = Number(feature.currentUsage || 0);

    if (usageType === 'DAILY_FIXED') {
        if (feature.lastUsedDate !== dateStr) currentUsage = 0;
        feature.lastUsedDate = dateStr;
    }
    if (usageType === 'MONTHLY_TOTAL') {
        if (feature.lastUsedMonth !== monthStr) currentUsage = 0;
        feature.lastUsedMonth = monthStr;
    }

    currentUsage += amount;
    feature.currentUsage = currentUsage;
    features[idx] = feature;
    subscription.features = features;
    subscription.markModified('features');
    await subscription.save();

    const remaining = Math.max(0, maxLimit - currentUsage);
    return {
        success: currentUsage <= maxLimit,
        current_usage: currentUsage,
        remaining,
        code: currentUsage > maxLimit ? 'QUOTA_EXCEEDED' : '',
    };
}

function createEntitlementHandlers() {
    return {
        CheckFeature: (call, callback) => {
            const metadata = call.metadata.get('x-internal-secret');
            const secret = metadata && metadata[0];
            const fakeReq = { headers: { 'x-internal-secret': secret } };
            if (!hasValidInternalSecret(fakeReq)) {
                return unauthorizedCallback(callback);
            }

            const agencyId = call.request.agency_id || call.request.agencyId;
            const moduleName = call.request.module || 'ai';

            checkFeatureLogic(agencyId, moduleName)
                .then((result) => {
                    callback(null, {
                        entitled: result.entitled,
                        code: result.code,
                        message: result.message,
                        usage_type: result.usage_type,
                        max_limit: result.max_limit,
                        current_usage: result.current_usage,
                        remaining: result.remaining,
                    });
                })
                .catch((err) => {
                    logger.error('CheckFeature failed', { error: err.message });
                    callback(err);
                });
        },

        IncrementUsage: (call, callback) => {
            const metadata = call.metadata.get('x-internal-secret');
            const secret = metadata && metadata[0];
            const fakeReq = { headers: { 'x-internal-secret': secret } };
            if (!hasValidInternalSecret(fakeReq)) {
                return unauthorizedCallback(callback);
            }

            const agencyId = call.request.agency_id || call.request.agencyId;
            const moduleName = call.request.module || 'ai';
            const amount = Number(call.request.amount || 1);

            incrementUsageLogic(agencyId, moduleName, amount)
                .then((result) => {
                    callback(null, {
                        success: result.success,
                        current_usage: result.current_usage,
                        remaining: result.remaining,
                        code: result.code,
                    });
                })
                .catch((err) => {
                    logger.error('IncrementUsage failed', { error: err.message });
                    callback(err);
                });
        },
    };
}

module.exports = { createEntitlementHandlers, checkFeatureLogic, incrementUsageLogic };

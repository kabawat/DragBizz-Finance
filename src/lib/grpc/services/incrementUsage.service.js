const grpc = require('@grpc/grpc-js');
const logger = require('@src/utils/logger');
const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');

async function handleIncrementUsage(call, callback) {
    try {
        const { user_id, module: feature_key, quantity, metadata, agency_id } = call.request;

        if (!user_id || !feature_key) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: 'user_id and module are required'
            });
        }

        const subscription = await SubscriptionService.getActiveSubscription(user_id, { agencyId: agency_id });

        if (!subscription) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'No active subscription found'
            });
        }

        const canUse = await UsageService.canUseFeature(
            subscription._id.toString(),
            feature_key,
            quantity || 1
        );

        if (!canUse.allowed) {
            return callback({
                code: grpc.status.RESOURCE_EXHAUSTED,
                message: canUse.reason || 'Quota exceeded'
            });
        }

        const usage = await UsageService.incrementUsage(
            subscription._id.toString(),
            user_id,
            feature_key,
            quantity || 1,
            metadata || {}
        );

        const updatedQuota = await UsageService.getRemainingQuota(
            subscription._id.toString(),
            feature_key
        );

        const response = {
            success: true,
            usage: {
                count: usage.count || 0,
                date: usage.date || '',
                month: usage.month || '',
                year: usage.year || 0
            },
            quota: {
                has_access: updatedQuota.hasAccess || false,
                remaining: updatedQuota.remaining !== undefined ? updatedQuota.remaining : -1,
                limit: updatedQuota.limit !== undefined ? updatedQuota.limit : -1,
                usage_type: updatedQuota.usageType || 'UNLIMITED',
                used: updatedQuota.used || 0,
                daily_limit: updatedQuota.dailyLimit !== undefined ? updatedQuota.dailyLimit : null,
                monthly_limit: updatedQuota.monthlyLimit !== undefined ? updatedQuota.monthlyLimit : null,
                monthly_used: updatedQuota.monthlyUsed !== undefined ? updatedQuota.monthlyUsed : null
            }
        };

        callback(null, response);
    } catch (error) {
        logger.error('Error in IncrementUsage', { error: error?.message, stack: error?.stack });
        callback({
            code: grpc.status.INTERNAL,
            message: error.message || 'Internal server error'
        });
    }
}

module.exports = handleIncrementUsage;

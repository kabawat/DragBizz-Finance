const grpc = require('@grpc/grpc-js');
const logger = require('@src/utils/logger');
const UsageService = require('@src/services/usage/usage.service');
const SubscriptionService = require('@src/services/subscription/subscription.service');

async function handleCheckUsage(call, callback) {
    try {
        const { user_id, module: feature_key, quantity, agency_id } = call.request;
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

        let result = await UsageService.canUseFeature(
            subscription._id.toString(),
            feature_key,
            quantity || 1
        );

        const quota = result.quota || {};

        const response = {
            allowed: result.allowed,
            reason: result.reason || '',
            quota: {
                has_access: quota.hasAccess || false,
                remaining: quota.remaining !== undefined ? quota.remaining : -1,
                limit: quota.limit !== undefined ? quota.limit : -1,
                usage_type: quota.usageType || 'UNLIMITED',
                used: quota.used || 0,
                daily_limit: quota.dailyLimit !== undefined ? quota.dailyLimit : null,
                monthly_limit: quota.monthlyLimit !== undefined ? quota.monthlyLimit : null,
                monthly_used: quota.monthlyUsed !== undefined ? quota.monthlyUsed : null
            }
        };

        callback(null, response);
    } catch (error) {
        logger.error('Error in CheckUsage', { error: error?.message, stack: error?.stack });
        callback({
            code: grpc.status.INTERNAL,
            message: error.message || 'Internal server error'
        });
    }
}

module.exports = handleCheckUsage;

const grpc = require('@grpc/grpc-js');
const logger = require('@src/utils/logger');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

async function handleGetActiveSubscription(call, callback) {
    try {
        const { user_id, agency_id } = call.request;

        if (!user_id) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: 'user_id is required'
            });
        }

        const subscription = await SubscriptionService.getActiveSubscription(user_id, { agencyId: agency_id });

        if (!subscription) {
            return callback(null, {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'No active subscription found'
                }
            });
        }

        const features = (subscription.features || []).map(feature => ({
            module: feature.module || '',
            report: feature.report !== false,
            analytics: feature.analytics !== false,
            usage_type: feature.usageType || 'UNLIMITED',
            usage_limit: feature.usageLimit || 0,
            custom_daily_limit: feature.customDailyLimit || 0,
            feature_name: FEATURE_DISPLAY_NAMES[feature.module] || feature.module || '',
            metadata: feature.metadata || {}
        }));

        const packageData = subscription.packageId || {};
        const featureUsageLimits = (packageData.features || []).map(feature => ({
            module: feature.module || '',
            report: feature.report !== false,
            analytics: feature.analytics !== false,
            usage_type: feature.usageType || 'UNLIMITED',
            usage_limit: feature.usageLimit || 0,
            custom_daily_limit: feature.customDailyLimit || 0,
            feature_name: FEATURE_DISPLAY_NAMES[feature.module] || feature.module || '',
            metadata: feature.metadata || {}
        }));

        const toISOString = (date) => {
            if (!date) return '';
            if (date instanceof Date) return date.toISOString();
            if (typeof date === 'string') {
                const dateObj = new Date(date);
                return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString();
            }
            return '';
        };

        const response = {
            success: true,
            id: subscription._id?.toString() || '',
            user_id: subscription.userId?.toString() || '',
            package: {
                id: packageData._id?.toString() || '',
                name: packageData.name || '',
                description: packageData.description || '',
                pricing: (packageData.pricing || []).map(p => ({
                    months: p.months || 0,
                    price: p.price || 0,
                    discount: p.discount || 0,
                    discounted_price: p.discountedPrice || 0
                })),
                feature_usage_limits: featureUsageLimits
            },
            payment: subscription.paymentId ? {
                id: subscription.paymentId._id?.toString() || '',
                amount: subscription.paymentId.amount || 0,
                currency: subscription.paymentId.currency || 'INR',
                status: subscription.paymentId.status || ''
            } : null,
            status: subscription.status || '',
            billing_cycle: subscription.billingCycle || '',
            start_date: toISOString(subscription.startDate),
            end_date: toISOString(subscription.endDate),
            trial_end_date: toISOString(subscription.trialEndDate),
            auto_renew: subscription.autoRenew || false,
            next_billing_date: toISOString(subscription.nextBillingDate),
            features: features,
            max_subscribers_snapshot: subscription.maxSubscribersSnapshot || 0
        };

        callback(null, response);
    } catch (error) {
        logger.error('Error in GetActiveSubscription', { error: error?.message, stack: error?.stack });
        callback({
            code: grpc.status.INTERNAL,
            message: error.message || 'Internal server error'
        });
    }
}

module.exports = handleGetActiveSubscription;

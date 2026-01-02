const { SubscriptionModel, PaymentModel, PackageModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');
const { getCache, setCache, deleteCache } = require('@src/services/cache.service');
const mongoose = require('mongoose');

// Cache configuration
const SUBSCRIPTION_CACHE_TTL = 300; // 5 minutes
const SUBSCRIPTION_CACHE_PREFIX = 'sub:active:';

class SubscriptionService {
    static async createSubscription(subscriptionData) {
        try {
            const { userId, paymentId, ipAddress, userAgent } = subscriptionData;

            if (!mongoose.Types.ObjectId.isValid(paymentId)) {
                throw new Error('Invalid payment ID format');
            }

            const payment = await PaymentModel.findById(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.status !== 'SUCCESS') {
                throw new Error('Payment not successful');
            }

            if (payment.userId !== userId) {
                throw new Error('Payment does not belong to user');
            }

            // Check if subscription already exists for this payment
            const existingSubscription = await SubscriptionModel.findOne({ paymentId });
            if (existingSubscription) {
                const populatedSubscription = await SubscriptionModel.findById(existingSubscription._id)
                    .populate('packageId', 'name description pricing featureUsageLimits isAIFeature')
                    .populate('paymentId', 'amount currency status')
                    .lean();
                return populatedSubscription;
            }

            // Check if user already has an active subscription
            const now = new Date();
            const existingActiveSubscription = await SubscriptionModel.findOne({
                userId,
                status: { $in: ['ACTIVE', 'TRIAL'] },
                startDate: { $lte: now },
                endDate: { $gte: now }
            });

            // Cancel existing active subscription if found
            if (existingActiveSubscription) {
                existingActiveSubscription.status = 'CANCELLED';
                existingActiveSubscription.cancelledAt = new Date();
                existingActiveSubscription.cancellationReason = 'Replaced by new subscription';
                existingActiveSubscription.autoRenew = false;
                await existingActiveSubscription.save();

                // Log cancellation event
                await logSubscriptionEvent('SUBSCRIPTION_CANCELLED', {
                    subscriptionId: existingActiveSubscription._id,
                    userId,
                    packageId: existingActiveSubscription.packageId,
                    reason: 'Replaced by new subscription',
                    ipAddress,
                    userAgent
                });
            }

            const packageDoc = await PackageModel.findById(payment.packageId).lean();
            
            if (!packageDoc) {
                throw new Error('Package not found');
            }

            if (packageDoc.status !== 'ACTIVE') {
                throw new Error('Package is not active');
            }

            const startDate = new Date();
            const endDate = new Date(startDate);
            const months = payment.months || 1;
            endDate.setMonth(endDate.getMonth() + months);

            let trialEndDate = null;
            if (packageDoc.trialPeriod && packageDoc.trialPeriod.enabled) {
                trialEndDate = new Date(startDate);
                trialEndDate.setDate(trialEndDate.getDate() + packageDoc.trialPeriod.days);
            }

            const processedFeatures = Array.isArray(packageDoc.featureUsageLimits)
                ? packageDoc.featureUsageLimits
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

            const newSubscriptionData = {
                userId,
                packageId: payment.packageId,
                paymentId: payment._id,
                status: trialEndDate ? 'TRIAL' : 'ACTIVE',
                billingCycle: payment.billingCycle,
                startDate,
                endDate,
                trialEndDate,
                autoRenew: months === 1,
                nextBillingDate: months === 1 ? endDate : null,
                maxSubscribersSnapshot: packageDoc.maxSubscribers ?? null,
                features: processedFeatures
            };

            const subscription = new SubscriptionModel(newSubscriptionData);
            await subscription.save();

            payment.subscriptionId = subscription._id;
            await payment.save();

            await logSubscriptionEvent('SUBSCRIPTION_CREATED', {
                subscriptionId: subscription._id,
                userId,
                packageId: payment.packageId,
                paymentId: payment._id,
                status: subscription.status,
                ipAddress,
                userAgent
            });

            const populatedSubscription = await SubscriptionModel.findById(subscription._id)
                .populate('packageId', 'name description pricing featureUsageLimits isAIFeature')
                .populate('paymentId', 'amount currency status')
                .lean();

            const cacheKey = `${SUBSCRIPTION_CACHE_PREFIX}${userId}`;
            await deleteCache(cacheKey);
            
            if (populatedSubscription) {
                await setCache(cacheKey, populatedSubscription, SUBSCRIPTION_CACHE_TTL);
            }

            return populatedSubscription;
        } catch (error) {
            console.log('Error creating subscription:', error);
            throw error;
        }
    }

    static async getActiveSubscription(userId) {
        try {
            // Check cache first
            const cacheKey = `${SUBSCRIPTION_CACHE_PREFIX}${userId}`;
            const cachedSubscription = await getCache(cacheKey);
            
            if (cachedSubscription) {
                // Verify cached subscription is still active
                const now = new Date();
                const cachedStartDate = new Date(cachedSubscription.startDate);
                const cachedEndDate = new Date(cachedSubscription.endDate);
                
                // If cached subscription is still valid, return it
                if (
                    (cachedSubscription.status === 'ACTIVE' || cachedSubscription.status === 'TRIAL') &&
                    cachedStartDate <= now &&
                    cachedEndDate >= now
                ) {
                    return cachedSubscription;
                }
                
                // Cached subscription expired, delete from cache
                await deleteCache(cacheKey);
            }

            // Cache miss or expired - fetch from database
            const now = new Date();
            const subscription = await SubscriptionModel.findOne({
                userId,
                status: { $in: ['ACTIVE', 'TRIAL'] },
                startDate: { $lte: now },
                endDate: { $gte: now }
            })
                .populate('packageId', 'name description pricing featureUsageLimits isAIFeature')
                .populate('paymentId', 'amount currency status')
                .sort({ createdAt: -1 })
                .lean();

            // Cache the result (even if null, to prevent repeated queries)
            if (subscription) {
                await setCache(cacheKey, subscription, SUBSCRIPTION_CACHE_TTL);
            } else {
                // Cache null result for shorter time to allow retry
                await setCache(cacheKey, null, 60); // 1 minute for null results
            }

            return subscription;
        } catch (error) {
            // If cache fails, still try database
            console.log('Error in getActiveSubscription (cache failed, trying DB):', error);
            try {
                const now = new Date();
                const subscription = await SubscriptionModel.findOne({
                    userId,
                    status: { $in: ['ACTIVE', 'TRIAL'] },
                    startDate: { $lte: now },
                    endDate: { $gte: now }
                })
                    .populate('packageId', 'name description pricing featureUsageLimits isAIFeature')
                    .populate('paymentId', 'amount currency status')
                    .sort({ createdAt: -1 })
                    .lean();
                return subscription;
            } catch (dbError) {
                throw dbError;
            }
        }
    }

    static async getUserSubscriptions(userId, options = {}) {
        try {
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
            const subscriptions = await SubscriptionModel.find(query)
                .populate('packageId', 'name description pricing featureUsageLimits isAIFeature')
                .populate('paymentId', 'amount currency status')
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
        } catch (error) {
            throw error;
        }
    }

    static async getSubscriptionById(subscriptionId, userId) {
        try {
            const subscription = await SubscriptionModel.findOne({
                _id: subscriptionId,
                userId
            })
                .populate('packageId', 'name description pricing featureUsageLimits isAIFeature')
                .populate('paymentId', 'amount currency status razorpayOrderId')
                .lean();

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            return subscription;
        } catch (error) {
            throw error;
        }
    }

    static async cancelSubscription(subscriptionId, userId, reason = null) {
        try {
            const subscription = await SubscriptionModel.findOne({
                _id: subscriptionId,
                userId,
                status: { $in: ['ACTIVE', 'TRIAL'] }
            });

            if (!subscription) {
                throw new Error('Active subscription not found');
            }

            subscription.status = 'CANCELLED';
            subscription.cancelledAt = new Date();
            subscription.cancellationReason = reason;
            subscription.autoRenew = false;

            await subscription.save();

            // Invalidate cache for this user
            const cacheKey = `${SUBSCRIPTION_CACHE_PREFIX}${subscription.userId}`;
            await deleteCache(cacheKey);

            return subscription;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = SubscriptionService;


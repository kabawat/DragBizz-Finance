const { UsageTrackingModel, SubscriptionModel } = require('@src/models');
const { USAGE_TYPES, FEATURE_DISPLAY_NAMES } = require('@src/constants/features');
const { getCache, setCache, deleteCache } = require('@src/services/cache.service');
const mongoose = require('mongoose');

const QUOTA_CACHE_TTL = 60;
const QUOTA_CACHE_PREFIX = 'quota:';
const USAGE_DATE_CACHE_TTL = 60;
const USAGE_MONTH_CACHE_TTL = 300;

class UsageService {
    static getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    static calculateDailyLimit(totalLimit, customDailyLimit = null) {
        if (customDailyLimit !== null) {
            return customDailyLimit;
        }
        return Math.floor(totalLimit / 30);
    }

    /**
     * Get usage for a specific date
     */
    static async getUsageForDate(subscriptionId, featureKey, date = null) {
        try {
            const targetDate = date || this.getCurrentDate();
            
            // Check cache first
            const cacheKey = `usage:date:${subscriptionId}:${featureKey}:${targetDate}`;
            const cached = await getCache(cacheKey);
            if (cached !== null) {
                return cached;
            }
            
            const usage = await UsageTrackingModel.findOne({
                subscriptionId,
                featureKey,
                date: targetDate
            }).lean();

            const count = usage ? usage.count : 0;
            
            // Cache the result
            await setCache(cacheKey, count, USAGE_DATE_CACHE_TTL);
            
            return count;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get usage for current month (Optimized with aggregation pipeline)
     */
    static async getUsageForMonth(subscriptionId, featureKey, month = null) {
        try {
            const targetMonth = month || this.getCurrentMonth();
            
            // Check cache first
            const cacheKey = `usage:month:${subscriptionId}:${featureKey}:${targetMonth}`;
            const cached = await getCache(cacheKey);
            if (cached !== null) {
                return cached;
            }
            
            // Use aggregation pipeline for better performance
            const result = await UsageTrackingModel.aggregate([
                {
                    $match: {
                        subscriptionId: new mongoose.Types.ObjectId(subscriptionId),
                        featureKey: featureKey,
                        month: targetMonth
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$count' }
                    }
                }
            ]);
            
            const total = result[0]?.total || 0;
            
            // Cache the result
            await setCache(cacheKey, total, USAGE_MONTH_CACHE_TTL);
            
            return total;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get total usage for subscription period (for TOTAL usage type)
     * Counts all usage from subscription start date to now
     */
    static async getUsageForSubscription(subscriptionId, featureKey) {
        try {
            // Check cache first
            const cacheKey = `usage:subscription:${subscriptionId}:${featureKey}`;
            const cached = await getCache(cacheKey);
            if (cached !== null) {
                return cached;
            }
            
            // Get subscription to know start date
            const subscription = await SubscriptionModel.findById(subscriptionId)
                .select('startDate')
                .lean();
            
            if (!subscription) {
                return 0;
            }
            
            // Use aggregation pipeline to sum all usage from subscription start
            const result = await UsageTrackingModel.aggregate([
                {
                    $match: {
                        subscriptionId: new mongoose.Types.ObjectId(subscriptionId),
                        featureKey: featureKey
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$count' }
                    }
                }
            ]);
            
            const total = result[0]?.total || 0;
            
            // Cache the result (longer TTL since it's overall usage)
            await setCache(cacheKey, total, 300); // 5 minutes
            
            return total;
        } catch (error) {
            throw error;
        }
    }

    // Get remaining quota for a feature
    static async getRemainingQuota(subscriptionId, featureKey) {
        try {
            const date = this.getCurrentDate();
            
            // Check cache first
            const cacheKey = `${QUOTA_CACHE_PREFIX}${subscriptionId}:${featureKey}:${date}`;
            const cached = await getCache(cacheKey);
            if (cached) {
                return cached;
            }
            
            const subscription = await SubscriptionModel.findById(subscriptionId)
                .populate('packageId', 'isAIFeature planType')
                .lean();

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            const isAIFeature = featureKey === 'VOICE_AI';
            let packageHasAI = subscription.packageId?.isAIFeature === true;
            
            if (!packageHasAI && subscription.packageId?.planType) {
                const planType = subscription.packageId.planType;
                if (planType === 'PROFESSIONAL' || planType === 'ENTERPRISE') {
                    packageHasAI = true;
                }
            }
            if (isAIFeature) {
                if (!packageHasAI) {
                    const result = {
                        hasAccess: false,
                        remaining: 0,
                        limit: 0,
                        usageType: 'UNLIMITED'
                    };
                    await setCache(cacheKey, result, 30);
                    return result;
                }
                const result = {
                    hasAccess: true,
                    remaining: -1,
                    limit: -1,
                    usageType: 'UNLIMITED',
                    used: 0
                };
                await setCache(cacheKey, result, 300);
                return result;
            }

            const feature = subscription.features?.find(f => f.featureKey === featureKey);

            if (!feature || !feature.enabled) {
                const result = {
                    hasAccess: false,
                    remaining: 0,
                    limit: 0,
                    usageType: 'UNLIMITED'
                };
                await setCache(cacheKey, result, 30);
                return result;
            }

            const usageLimits = feature.usageLimits || {};

            if (usageLimits.usageType === USAGE_TYPES.UNLIMITED || !usageLimits.totalLimit) {
                const result = {
                    hasAccess: true,
                    remaining: -1,
                    limit: -1,
                    usageType: USAGE_TYPES.UNLIMITED,
                    used: 0
                };
                await setCache(cacheKey, result, 300);
                return result;
            }

            const usageType = usageLimits.usageType || USAGE_TYPES.UNLIMITED;
            const totalLimit = usageLimits.totalLimit;
            const customDailyLimit = usageLimits.customDailyLimit;

            let used = 0;
            let remaining = 0;
            let dailyLimit = 0;
            let monthlyLimit = 0;

            if (usageType === USAGE_TYPES.DAILY_FIXED) {
                dailyLimit = totalLimit;
                used = await this.getUsageForDate(subscriptionId, featureKey);
                remaining = Math.max(0, dailyLimit - used);
            } else if (usageType === USAGE_TYPES.DAILY_ROLLING) {
                monthlyLimit = totalLimit;
                dailyLimit = this.calculateDailyLimit(totalLimit, customDailyLimit);
                
                const monthlyUsed = await this.getUsageForMonth(subscriptionId, featureKey);
                const dailyUsed = await this.getUsageForDate(subscriptionId, featureKey);
                
                const remainingMonthly = Math.max(0, monthlyLimit - monthlyUsed);
                dailyLimit = Math.min(dailyLimit, remainingMonthly);
                
                used = dailyUsed;
                remaining = Math.max(0, dailyLimit - used);
            } else if (usageType === USAGE_TYPES.MONTHLY_TOTAL) {
                monthlyLimit = totalLimit;
                used = await this.getUsageForMonth(subscriptionId, featureKey);
                remaining = Math.max(0, monthlyLimit - used);
            } else if (usageType === USAGE_TYPES.TOTAL) {
                const totalLimitValue = totalLimit;
                used = await this.getUsageForSubscription(subscriptionId, featureKey);
                remaining = Math.max(0, totalLimitValue - used);
            }

            const result = {
                hasAccess: true,
                remaining,
                limit: usageType === USAGE_TYPES.MONTHLY_TOTAL ? monthlyLimit : (usageType === USAGE_TYPES.TOTAL ? totalLimit : dailyLimit),
                usageType,
                used,
                dailyLimit: usageType !== USAGE_TYPES.MONTHLY_TOTAL && usageType !== USAGE_TYPES.TOTAL ? dailyLimit : null,
                monthlyLimit: usageType === USAGE_TYPES.MONTHLY_TOTAL || usageType === USAGE_TYPES.DAILY_ROLLING ? monthlyLimit : null,
                monthlyUsed: usageType === USAGE_TYPES.MONTHLY_TOTAL || usageType === USAGE_TYPES.DAILY_ROLLING ? used : null
            };
            
            await setCache(cacheKey, result, QUOTA_CACHE_TTL);
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if user can use a feature (has quota available)
     */
    static async canUseFeature(subscriptionId, featureKey, quantity = 1) {
        try {
            const quota = await this.getRemainingQuota(subscriptionId, featureKey);
            
            if (!quota.hasAccess) {
                return {
                    allowed: false,
                    reason: 'Feature not available in subscription',
                    quota
                };
            }

            if (quota.usageType === USAGE_TYPES.UNLIMITED) {
                return {
                    allowed: true,
                    quota
                };
            }

            if (quota.remaining === -1) {
                return {
                    allowed: true,
                    quota
                };
            }

            if (quota.remaining >= quantity) {
                return {
                    allowed: true,
                    quota
                };
            }

            return {
                allowed: false,
                reason: `Quota exceeded. Remaining: ${quota.remaining}, Required: ${quantity}`,
                quota
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Increment usage for a feature
     */
    static async incrementUsage(subscriptionId, userId, featureKey, quantity = 1, metadata = {}) {
        try {
            if (featureKey === 'VOICE_AI') {
                return {
                    count: 0,
                    date: this.getCurrentDate(),
                    message: 'AI features do not track usage'
                };
            }

            const date = this.getCurrentDate();
            const month = this.getCurrentMonth();
            const year = new Date().getFullYear();

            // Find or create usage record
            const usage = await UsageTrackingModel.findOneAndUpdate(
                {
                    subscriptionId,
                    featureKey,
                    date
                },
                {
                    $inc: { count: quantity },
                    $setOnInsert: {
                        userId,
                        month,
                        year,
                        metadata
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            );

            // Invalidate cache for this date and month
            const dateCacheKey = `usage:date:${subscriptionId}:${featureKey}:${date}`;
            const monthCacheKey = `usage:month:${subscriptionId}:${featureKey}:${month}`;
            const quotaCacheKey = `${QUOTA_CACHE_PREFIX}${subscriptionId}:${featureKey}:${date}`;
            
            await Promise.all([
                deleteCache(dateCacheKey),
                deleteCache(monthCacheKey),
                deleteCache(quotaCacheKey)
            ]);

            return usage;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get usage summary for a subscription
     */
    static async getUsageSummary(subscriptionId, featureKey = null) {
        try {
            const subscription = await SubscriptionModel.findById(subscriptionId)
                .lean();

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            const features = subscription.features || [];
            const summary = [];

            for (const feature of features) {
                const key = feature.featureKey;

                if (!key) {
                    continue;
                }

                if (featureKey && key !== featureKey) {
                    continue;
                }

                const quota = await this.getRemainingQuota(subscriptionId, key);
                summary.push({
                    featureKey: key,
                    featureName: feature.featureName || FEATURE_DISPLAY_NAMES[key] || key,
                    enabled: feature.enabled,
                    quota
                });
            }

            return summary;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UsageService;


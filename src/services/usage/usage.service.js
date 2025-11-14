const { UsageTrackingModel, SubscriptionModel } = require('@src/models');
const { USAGE_TYPES, FEATURE_DISPLAY_NAMES } = require('@src/constants/features');
const { getCache, setCache, deleteCache } = require('@src/services/cache.service');
const mongoose = require('mongoose');

// Cache configuration
const QUOTA_CACHE_TTL = 60; // 1 minute (short for accuracy)
const QUOTA_CACHE_PREFIX = 'quota:';
const USAGE_DATE_CACHE_TTL = 60; // 1 minute
const USAGE_MONTH_CACHE_TTL = 300; // 5 minutes (monthly data changes less frequently)

/**
 * Usage Service
 * Handles feature usage tracking and quota management
 */
class UsageService {
    /**
     * Get current date string (YYYY-MM-DD)
     */
    static getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get current month string (YYYY-MM)
     */
    static getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Calculate daily limit for DAILY_ROLLING type
     */
    static calculateDailyLimit(totalLimit, customDailyLimit = null) {
        if (customDailyLimit !== null) {
            return customDailyLimit;
        }
        // Calculate average per day (assuming 30 days in month)
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
            console.error('Error getting usage for date:', error);
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
            console.error('Error getting usage for month:', error);
            throw error;
        }
    }

    /**
     * Get remaining quota for a feature (with caching)
     */
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
                .lean();

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            // Find feature in subscription
            const feature = subscription.features?.find(f => f.featureKey === featureKey);

            if (!feature || !feature.enabled) {
                const result = {
                    hasAccess: false,
                    remaining: 0,
                    limit: 0,
                    usageType: 'UNLIMITED'
                };
                // Cache negative result for shorter time
                await setCache(cacheKey, result, 30); // 30 seconds for negative results
                return result;
            }

            const usageLimits = feature.usageLimits || {};

            // If unlimited, return unlimited
            if (usageLimits.usageType === USAGE_TYPES.UNLIMITED || !usageLimits.totalLimit) {
                const result = {
                    hasAccess: true,
                    remaining: -1, // -1 means unlimited
                    limit: -1,
                    usageType: USAGE_TYPES.UNLIMITED,
                    used: 0
                };
                // Cache unlimited results for longer time
                await setCache(cacheKey, result, 300); // 5 minutes for unlimited
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
                // Daily fixed limit
                dailyLimit = totalLimit;
                used = await this.getUsageForDate(subscriptionId, featureKey);
                remaining = Math.max(0, dailyLimit - used);
            } else if (usageType === USAGE_TYPES.DAILY_ROLLING) {
                // Daily rolling with monthly total
                monthlyLimit = totalLimit;
                dailyLimit = this.calculateDailyLimit(totalLimit, customDailyLimit);
                
                const monthlyUsed = await this.getUsageForMonth(subscriptionId, featureKey);
                const dailyUsed = await this.getUsageForDate(subscriptionId, featureKey);
                
                // Calculate remaining monthly quota
                const remainingMonthly = Math.max(0, monthlyLimit - monthlyUsed);
                
                // For rolling, daily limit can be adjusted based on remaining monthly quota
                // If remaining monthly is less than daily limit, use remaining monthly
                dailyLimit = Math.min(dailyLimit, remainingMonthly);
                
                used = dailyUsed;
                remaining = Math.max(0, dailyLimit - used);
            } else if (usageType === USAGE_TYPES.MONTHLY_TOTAL) {
                // Monthly total limit
                monthlyLimit = totalLimit;
                used = await this.getUsageForMonth(subscriptionId, featureKey);
                remaining = Math.max(0, monthlyLimit - used);
            }

            const result = {
                hasAccess: true,
                remaining,
                limit: usageType === USAGE_TYPES.MONTHLY_TOTAL ? monthlyLimit : dailyLimit,
                usageType,
                used,
                dailyLimit: usageType !== USAGE_TYPES.MONTHLY_TOTAL ? dailyLimit : null,
                monthlyLimit: usageType === USAGE_TYPES.MONTHLY_TOTAL || usageType === USAGE_TYPES.DAILY_ROLLING ? monthlyLimit : null,
                monthlyUsed: usageType === USAGE_TYPES.MONTHLY_TOTAL || usageType === USAGE_TYPES.DAILY_ROLLING ? used : null
            };
            
            // Cache the result
            await setCache(cacheKey, result, QUOTA_CACHE_TTL);
            
            return result;
        } catch (error) {
            console.error('Error getting remaining quota:', error);
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
            console.error('Error checking feature usage:', error);
            throw error;
        }
    }

    /**
     * Increment usage for a feature
     */
    static async incrementUsage(subscriptionId, userId, featureKey, quantity = 1, metadata = {}) {
        try {
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
            console.error('Error incrementing usage:', error);
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
            console.error('Error getting usage summary:', error);
            throw error;
        }
    }
}

module.exports = UsageService;


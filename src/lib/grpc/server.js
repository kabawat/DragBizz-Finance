const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const SECRET = require('@src/config/env.config');
const logger = require('@src/utils/logger');

/**
 * gRPC Server Setup
 * Production-ready gRPC server with proper error handling and logging
 */
class GrpcServer {
    constructor() {
        this.server = null;
        this.services = {};
    }

    /**
     * Load proto file and create package definition
     */
    loadProto(protoPath, options = {}) {
        const defaultOptions = {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: [path.join(__dirname, '../../../proto')]
        };

        const packageDefinition = protoLoader.loadSync(
            protoPath,
            { ...defaultOptions, ...options }
        );

        return grpc.loadPackageDefinition(packageDefinition);
    }

    /**
     * Initialize gRPC server
     */
    initialize() {
        try {
            this.server = new grpc.Server();

            // Load proto definitions
            const protoPath = path.join(__dirname, '../../../proto/subscription.proto');
            const packageDefinition = this.loadProto(protoPath);
            const subscriptionProto = packageDefinition.subscription;

            // Register services
            this.registerServices(subscriptionProto);

            // Get gRPC port from config
            const grpcPort = process.env.GRPC_PORT || SECRET.grpc?.port || 50052;
            const grpcHost = process.env.GRPC_HOST || SECRET.grpc?.host || '0.0.0.0';

            // Bind server to port
            this.server.bindAsync(
                `${grpcHost}:${grpcPort}`,
                grpc.ServerCredentials.createInsecure(),
                (error, port) => {
                    if (error) {
                        logger.error('gRPC Server failed to start', { error: error?.message, stack: error?.stack });
                        process.exit(1);
                    }

                    logger.info(`gRPC Server listening on ${grpcHost}:${port}`);
                    this.server.start();
                }
            );

            return this.server;
        } catch (error) {
            logger.error('Error initializing gRPC server', { error: error?.message, stack: error?.stack });
            throw error;
        }
    }

    /**
     * Register gRPC services
     */
    registerServices(proto) {
        // Register Usage Service
        this.server.addService(proto.UsageService.service, {
            CheckUsage: this.handleCheckUsage.bind(this),
            IncrementUsage: this.handleIncrementUsage.bind(this),
            GetQuota: this.handleGetQuota.bind(this)
        });

        // Register Subscription Service
        this.server.addService(proto.SubscriptionService.service, {
            GetActiveSubscription: this.handleGetActiveSubscription.bind(this)
        });

        logger.info('gRPC Services registered successfully');
    }

    /**
     * Handle CheckUsage RPC
     */
    async handleCheckUsage(call, callback) {
        try {
            const UsageService = require('@src/services/usage/usage.service');
            const { SubscriptionModel } = require('@src/models');

            const { user_id, feature_key, quantity } = call.request;

            if (!user_id || !feature_key) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'user_id and feature_key are required'
                });
            }

            const SubscriptionService = require('@src/services/subscription/subscription.service');
            const subscription = await SubscriptionService.getActiveSubscription(user_id);

            if (!subscription) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'No active subscription found'
                });
            }

            let result;
            if (feature_key === 'VOICE_AI') {
                let packageHasAI = subscription.packageId?.isAIFeature === true;
                
                if (!packageHasAI && subscription.packageId?.planType) {
                    const planType = subscription.packageId.planType;
                    if (planType === 'PROFESSIONAL' || planType === 'ENTERPRISE') {
                        packageHasAI = true;
                    }
                }
                
                result = {
                    allowed: packageHasAI,
                    reason: packageHasAI ? '' : 'Feature not available in subscription',
                    quota: {
                        hasAccess: packageHasAI,
                        remaining: packageHasAI ? -1 : 0,
                        limit: packageHasAI ? -1 : 0,
                        usageType: 'UNLIMITED',
                        used: 0
                    }
                };
            } else {
                result = await UsageService.canUseFeature(
                    subscription._id.toString(),
                    feature_key,
                    quantity || 1
                );
            }

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

    /**
     * Handle IncrementUsage RPC
     */
    async handleIncrementUsage(call, callback) {
        try {
            const UsageService = require('@src/services/usage/usage.service');
            const { SubscriptionModel } = require('@src/models');

            const { user_id, feature_key, quantity, metadata } = call.request;

            if (!user_id || !feature_key) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'user_id and feature_key are required'
                });
            }

            const SubscriptionService = require('@src/services/subscription/subscription.service');
            const subscription = await SubscriptionService.getActiveSubscription(user_id);

            if (!subscription) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'No active subscription found'
                });
            }

            if (feature_key === 'VOICE_AI') {
                let packageHasAI = subscription.packageId?.isAIFeature === true;
                
                if (!packageHasAI && subscription.packageId?.planType) {
                    const planType = subscription.packageId.planType;
                    if (planType === 'PROFESSIONAL' || planType === 'ENTERPRISE') {
                        packageHasAI = true;
                    }
                }
                
                if (!packageHasAI) {
                    return callback({
                        code: grpc.status.PERMISSION_DENIED,
                        message: 'Voice AI feature is not available in your subscription plan'
                    });
                }
                const response = {
                    success: true,
                    usage: {
                        count: 0,
                        date: new Date().toISOString().split('T')[0],
                        month: new Date().toISOString().substring(0, 7),
                        year: new Date().getFullYear()
                    },
                    quota: {
                        has_access: true,
                        remaining: -1,
                        limit: -1,
                        usage_type: 'UNLIMITED',
                        used: 0
                    }
                };
                return callback(null, response);
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

    /**
     * Handle GetQuota RPC
     */
    async handleGetQuota(call, callback) {
        try {
            const UsageService = require('@src/services/usage/usage.service');
            const { SubscriptionModel } = require('@src/models');

            const { user_id, feature_key } = call.request;

            if (!user_id || !feature_key) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'user_id and feature_key are required'
                });
            }

            const SubscriptionService = require('@src/services/subscription/subscription.service');
            const subscription = await SubscriptionService.getActiveSubscription(user_id);

            if (!subscription) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'No active subscription found'
                });
            }

            let quota;
            if (feature_key === 'VOICE_AI') {
                let packageHasAI = subscription.packageId?.isAIFeature === true;
                
                if (!packageHasAI && subscription.packageId?.planType) {
                    const planType = subscription.packageId.planType;
                    if (planType === 'PROFESSIONAL' || planType === 'ENTERPRISE') {
                        packageHasAI = true;
                    }
                }
                
                quota = {
                    hasAccess: packageHasAI,
                    remaining: packageHasAI ? -1 : 0,
                    limit: packageHasAI ? -1 : 0,
                    usageType: 'UNLIMITED',
                    used: 0
                };
            } else {
                quota = await UsageService.getRemainingQuota(
                    subscription._id.toString(),
                    feature_key
                );
            }

            const response = {
                success: true,
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
            logger.error('Error in GetQuota', { error: error?.message, stack: error?.stack });
            callback({
                code: grpc.status.INTERNAL,
                message: error.message || 'Internal server error'
            });
        }
    }

    /**
     * Handle GetActiveSubscription RPC
     */
    async handleGetActiveSubscription(call, callback) {
        try {
            const SubscriptionService = require('@src/services/subscription/subscription.service');
            const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');

            const { user_id } = call.request;

            if (!user_id) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'user_id is required'
                });
            }

            const subscription = await SubscriptionService.getActiveSubscription(user_id);

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
                feature_key: feature.featureKey || '',
                feature_name: feature.featureName || '',
                enabled: feature.enabled !== false,
                usage_limits: {
                    usage_type: feature.usageLimits?.usageType || 'UNLIMITED',
                    total_limit: feature.usageLimits?.totalLimit || 0,
                    custom_daily_limit: feature.usageLimits?.customDailyLimit || 0
                },
                metadata: feature.metadata || {}
            }));

            const packageData = subscription.packageId || {};
            const featureUsageLimits = (packageData.featureUsageLimits || []).map(limit => ({
                feature_key: limit.featureKey || '',
                enabled: limit.enabled !== false,
                usage_type: limit.usageType || 'UNLIMITED',
                total_limit: limit.totalLimit || 0,
                custom_daily_limit: limit.customDailyLimit || 0,
                feature_name: limit.featureName || FEATURE_DISPLAY_NAMES[limit.featureKey] || '',
                metadata: limit.metadata || {}
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

    /**
     * Graceful shutdown
     */
    shutdown() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.tryShutdown(() => {
                    logger.info('gRPC Server shut down gracefully');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new GrpcServer();


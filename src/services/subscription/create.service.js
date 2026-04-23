const createSubscriptionGrpc = require('@src/lib/grpc/clients/retailer/services/createSubscription.service');
const { SubscriptionModel, PaymentModel, PackageModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');
const { PACKAGE_MODULES } = require('@src/constants/enum/package.enum');
const { setCache, deleteCache } = require('@src/services/cache.service');
const sendEmailService = require('@src/services/email.service');
const mongoose = require('mongoose');
const logger = require('@src/utils/logger');
const {
    getCacheKey,
    extractUserEmail,
    processFeatures,
    comparePackages
} = require('./helpers');
const { renewSubscription } = require('./renewal.service');
const { changeSubscription } = require('./change.service');

const SUBSCRIPTION_CACHE_TTL = 300;

async function createSubscription(subscriptionData) {
    try {
        const { userId, agencyId, paymentId, ipAddress, userAgent } = subscriptionData;

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            throw new Error('Invalid payment ID format');
        }

        const existingSubscription = await SubscriptionModel.findOne({ paymentId }).select('_id').lean();
        if (existingSubscription) return existingSubscription;

        const payment = await PaymentModel.findOne({
            _id: paymentId,
            status: 'SUCCESS',
            userId: userId
        });

        if (!payment) {
            throw new Error('Valid successful payment not found for user');
        }

        const now = new Date();
        const activeSubQuery = {
            status: { $in: ['ACTIVE', 'TRIAL'] },
            startDate: { $lte: now },
            endDate: { $gte: now }
        };

        if (agencyId) {
            activeSubQuery.agencyId = agencyId;
        } else {
            activeSubQuery.userId = userId;
        }

        const activeSub = await SubscriptionModel.findOne(activeSubQuery)
            .populate('packageId', 'planType pricing')
            .populate('paymentId', 'amount');

        const paymentQuery = {
            _id: payment.packageId,
            status: 'ACTIVE'
        }
        const packageDoc = await PackageModel.findOne(paymentQuery).select('features planType pricing').lean();

        if (!packageDoc) {
            throw new Error('Package not found or not active');
        }

        const months = Number(payment.months) || 1;
        let subscription;

        if (activeSub) {
            const comparison = comparePackages(activeSub.packageId, packageDoc, months);

            if (comparison === 'SAME') {
                await renewSubscription(activeSub, payment, months, ipAddress, userAgent);
                subscription = activeSub;
            } else {
                subscription = await changeSubscription(
                    comparison,
                    activeSub,
                    packageDoc,
                    payment,
                    months,
                    ipAddress,
                    userAgent
                );
            }
        } else {
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + months);

            const processedFeatures = processFeatures(packageDoc.features)
                .filter(f => PACKAGE_MODULES.includes(f.module));

            const newSubscriptionData = {
                userId,
                agencyId,
                packageId: payment.packageId,
                paymentId: payment._id,
                status: 'ACTIVE',
                billingCycle: payment.billingCycle,
                startDate,
                endDate,
                autoRenew: false,
                nextBillingDate: months === 1 ? endDate : null,
                features: processedFeatures
            };

            subscription = new SubscriptionModel(newSubscriptionData);
            await subscription.save();

            payment.subscriptionId = subscription._id;
            await payment.save();

            await logSubscriptionEvent('SUBSCRIPTION_CREATED', {
                subscriptionId: subscription._id,
                userId,
                packageId: payment.packageId,
                paymentId: payment._id,
                status: subscription.status || 'ACTIVE',
                ipAddress,
                userAgent
            });
        }

        const subscriptionId = subscription._id;

        const populatedSubscription = await SubscriptionModel.findById(subscriptionId)
            .populate('packageId', 'name features')
            .populate('paymentId', 'amount currency paymentMethod metadata razorpayResponse notes')
            .lean();

        const cacheKey = getCacheKey(userId);
        await deleteCache(cacheKey);

        if (populatedSubscription) {
            await setCache(cacheKey, populatedSubscription, SUBSCRIPTION_CACHE_TTL);

            // Sync with Retailer Microservice
            // Sync with Retailer Microservice — with Retry Logic
            let grpcSuccess = false;
            const featuresSync = (populatedSubscription.features || [])
                .filter(f => PACKAGE_MODULES.includes(f.module))
                .map(f => ({
                    module: f.module,
                    report: Boolean(f.report),
                    analytics: Boolean(f.analytics),
                    usageType: f.usageType || 'UNLIMITED',
                    maxLimit: f.usageLimit ? Number(f.usageLimit) : 0,
                    customDailyLimit: f.customDailyLimit ? Number(f.customDailyLimit) : 0
                }));

            const grpcPayload = {
                userId: populatedSubscription.userId.toString(),
                agencyId: populatedSubscription.agencyId ? populatedSubscription.agencyId.toString() : "",
                subscriptionId: populatedSubscription._id.toString(),
                startDate: populatedSubscription.startDate.toISOString(),
                endDate: populatedSubscription.endDate.toISOString(),
                status: populatedSubscription.status,
                features: featuresSync
            };

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await createSubscriptionGrpc(grpcPayload);
                    grpcSuccess = true;
                    break;
                } catch (grpcErr) {
                    logger.warn(`[gRPC] Retailer sync attempt ${attempt} failed`, {
                        error: grpcErr.message,
                        subscriptionId: subscriptionId.toString()
                    });
                    if (attempt < 3) {
                        const delay = attempt * 500;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (!grpcSuccess) {
                logger.error('[ALERT] Retailer sync failed after 3 attempts — marking subscription as PENDING_SYNC', {
                    subscriptionId: subscriptionId.toString(),
                    userId,
                    agencyId: populatedSubscription.agencyId ? populatedSubscription.agencyId.toString() : null
                });
                // Update sync status to PENDING for background worker retry
                await SubscriptionModel.findByIdAndUpdate(subscriptionId, { syncStatus: 'PENDING' });
            }

            const populatedPayment = populatedSubscription.paymentId;
            const packageData = populatedSubscription.packageId;

            const userEmail = extractUserEmail(populatedPayment);

            if (userEmail) {
                const features = ((packageData && packageData.features) ? packageData.features : [])
                    .map(limit => FEATURE_DISPLAY_NAMES[limit.module] || limit.module);

                const emailPayload = {
                    userName: (populatedPayment && populatedPayment.metadata && populatedPayment.metadata.name)
                        || (populatedPayment && populatedPayment.notes && (typeof populatedPayment.notes === 'object' ? populatedPayment.notes.name : null))
                        || "User",
                    name: (populatedPayment && populatedPayment.metadata && populatedPayment.metadata.name)
                        || "User",
                    planName: (packageData && packageData.name) ? packageData.name : "Subscription Plan",
                    planDuration: populatedSubscription.billingCycle || "Monthly",
                    amount: (populatedPayment && populatedPayment.amount) ? populatedPayment.amount : 0,
                    currency: (populatedPayment && populatedPayment.currency) ? populatedPayment.currency : "INR",
                    startDate: populatedSubscription.startDate,
                    endDate: populatedSubscription.endDate,
                    features: features,
                    transactionId: (populatedPayment && populatedPayment._id) ? populatedPayment._id.toString() : undefined,
                    paymentMethod: (populatedPayment && populatedPayment.paymentMethod) ? populatedPayment.paymentMethod : "Online"
                };

                sendEmailService(
                    userEmail,
                    "SUBSCRIPTION_SUCCESS",
                    emailPayload
                ).catch(() => { });
            }
        }

        return populatedSubscription;
    } catch (error) {
        // Handle race condition: If another process successfully inserted this paymentId
        if (error.code === 11000 && error.keyPattern && error.keyPattern.paymentId) {
            const safePaymentId = subscriptionData && subscriptionData.paymentId;
            logger.warn('Concurrent subscription creation prevented by DB constraint', { paymentId: safePaymentId });

            const existingSub = await SubscriptionModel.findOne({ paymentId: safePaymentId }).select('_id').lean();
            if (existingSub) return existingSub;
        }

        throw error;
    }
}

module.exports = {
    createSubscription
};

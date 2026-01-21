const { SubscriptionModel, PaymentModel, PackageModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { FEATURE_DISPLAY_NAMES } = require('@src/constants/features');
const { getCache, setCache, deleteCache } = require('@src/services/cache.service');
const sendEmailService = require('@src/services/email.service');
const mongoose = require('mongoose');
const {
    PAYMENT_POPULATE_FIELDS_FULL,
    getCacheKey,
    populateSubscription,
    getActiveSubscriptionQuery,
    extractUserEmail,
    processFeatures,
    comparePackages
} = require('./subscription.helpers');
const { renewSubscription } = require('./subscription.renewal.service');
const { upgradeSubscription } = require('./subscription.upgrade.service');
const { downgradeSubscription } = require('./subscription.downgrade.service');

const SUBSCRIPTION_CACHE_TTL = 300;

async function createSubscription(subscriptionData) {
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

        const existingSubscription = await SubscriptionModel.findOne({ paymentId });
        if (existingSubscription) {
            const populatedSubscription = await populateSubscription(
                SubscriptionModel.findById(existingSubscription._id)
            ).lean();
            return populatedSubscription;
        }

        const now = new Date();
        const existingActiveSubscription = await SubscriptionModel.findOne(
            getActiveSubscriptionQuery(userId, now)
        ).populate('packageId').lean();

        const packageDoc = await PackageModel.findById(payment.packageId).lean();
        
        if (!packageDoc) {
            throw new Error('Package not found');
        }

        if (packageDoc.status !== 'ACTIVE') {
            throw new Error('Package is not active');
        }

        const months = payment.months || 1;
        let subscription;

        if (existingActiveSubscription) {
            const existingPackage = await PackageModel.findById(existingActiveSubscription.packageId).lean();
            const comparison = comparePackages(existingPackage, packageDoc);
            
            if (comparison === 'SAME') {
                const populatedExisting = await SubscriptionModel.findById(existingActiveSubscription._id);
                await renewSubscription(populatedExisting, payment, months);
                subscription = populatedExisting;
            } else if (comparison === 'UPGRADE') {
                subscription = await upgradeSubscription(
                    await SubscriptionModel.findById(existingActiveSubscription._id),
                    packageDoc,
                    payment,
                    months,
                    ipAddress,
                    userAgent
                );
            } else {
                subscription = await downgradeSubscription(
                    await SubscriptionModel.findById(existingActiveSubscription._id),
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

            let trialEndDate = null;
            if (packageDoc.trialPeriod && packageDoc.trialPeriod.enabled) {
                trialEndDate = new Date(startDate);
                trialEndDate.setDate(trialEndDate.getDate() + packageDoc.trialPeriod.days);
            }

            const processedFeatures = processFeatures(packageDoc.featureUsageLimits);

            const newSubscriptionData = {
                userId,
                packageId: payment.packageId,
                paymentId: payment._id,
                status: trialEndDate ? 'TRIAL' : 'ACTIVE',
                billingCycle: payment.billingCycle,
                startDate,
                endDate,
                trialEndDate,
                autoRenew: false,
                nextBillingDate: months === 1 ? endDate : null,
                maxSubscribersSnapshot: packageDoc.maxSubscribers ?? null,
                features: processedFeatures
            };

            subscription = new SubscriptionModel(newSubscriptionData);
            await subscription.save();

            payment.subscriptionId = subscription._id;
            await payment.save();
        }

        const subscriptionId = subscription._id || subscription.id;
        
        if (subscriptionId) {
            await logSubscriptionEvent('SUBSCRIPTION_CREATED', {
                subscriptionId: subscriptionId,
                userId,
                packageId: payment.packageId,
                paymentId: payment._id,
                status: subscription.status || 'ACTIVE',
                ipAddress,
                userAgent
            });
        }

        const populatedSubscription = await populateSubscription(
            SubscriptionModel.findById(subscriptionId),
            PAYMENT_POPULATE_FIELDS_FULL
        ).lean();

        const cacheKey = getCacheKey(userId);
        await deleteCache(cacheKey);
        
        if (populatedSubscription) {
            await setCache(cacheKey, populatedSubscription, SUBSCRIPTION_CACHE_TTL);
        }

        if (populatedSubscription) {
            const payment = populatedSubscription.paymentId;
            const packageData = populatedSubscription.packageId;
            
            const userEmail = extractUserEmail(payment);
            
            if (userEmail) {
                const features = (packageData?.featureUsageLimits || [])
                    .filter(limit => limit && limit.featureKey && limit.enabled !== false)
                    .map(limit => FEATURE_DISPLAY_NAMES[limit.featureKey] || limit.featureKey);

                const emailPayload = {
                    userName: "User",
                    name: "User",
                    planName: packageData?.name || "Subscription Plan",
                    planDuration: populatedSubscription.billingCycle || "Monthly",
                    amount: payment?.amount || 0,
                    currency: payment?.currency || "INR",
                    startDate: populatedSubscription.startDate,
                    endDate: populatedSubscription.endDate,
                    features: features,
                    transactionId: payment?._id?.toString(),
                    paymentMethod: payment?.paymentMethod || "Online"
                };

                sendEmailService(
                    userEmail,
                    "SUBSCRIPTION_SUCCESS",
                    emailPayload
                ).catch(() => {});
            }
        }

        return populatedSubscription;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    createSubscription
};


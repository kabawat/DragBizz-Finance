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

let _isReplicaSet = null;
async function checkIsReplicaSet() {
    if (_isReplicaSet !== null) return _isReplicaSet;
    try {
        // In testing environments where mongoose connection isn't fully initialized, default to true
        if (!mongoose.connection || !mongoose.connection.db) {
            _isReplicaSet = true;
            return _isReplicaSet;
        }
        const adminDb = mongoose.connection.db.admin();
        await adminDb.command({ replSetGetStatus: 1 });
        _isReplicaSet = true;
    } catch (e) {
        _isReplicaSet = false;
    }
    return _isReplicaSet;
}

async function createSubscription(subscriptionData) {
    const isRS = await checkIsReplicaSet();
    const session = await mongoose.startSession();
    if (isRS) {
        session.startTransaction();
    }

    try {
        const { userId, agencyId, paymentId, ipAddress, userAgent } = subscriptionData;

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            throw new Error('Invalid payment ID format');
        }

        const payment = await PaymentModel.findById(paymentId).session(session);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== 'SUCCESS') {
            throw new Error('Payment not successful');
        }

        if (payment.userId !== userId) {
            throw new Error('Payment does not belong to user');
        }

        const existingSubscription = await SubscriptionModel.findOne({ paymentId }).session(session);
        if (existingSubscription) {
            if (isRS && session.inTransaction && session.inTransaction()) {
                await session.commitTransaction();
            }
            if (session) session.endSession();

            const populatedSubscription = await populateSubscription(
                SubscriptionModel.findById(existingSubscription._id)
            ).lean();
            return populatedSubscription;
        }

        const now = new Date();
        const existingActiveSubscription = await SubscriptionModel.findOne(
            getActiveSubscriptionQuery(userId, now)
        ).session(session).populate('packageId').lean();

        const packageDoc = await PackageModel.findById(payment.packageId).session(session).lean();

        if (!packageDoc) {
            throw new Error('Package not found');
        }

        if (packageDoc.status !== 'ACTIVE') {
            throw new Error('Package is not active');
        }

        const months = payment.months || 1;
        let subscription;

        if (existingActiveSubscription) {
            const existingPackage = await PackageModel.findById(existingActiveSubscription.packageId).session(session).lean();
            const comparison = comparePackages(existingPackage, packageDoc);

            if (comparison === 'SAME') {
                const populatedExisting = await SubscriptionModel.findById(existingActiveSubscription._id).session(session);
                await renewSubscription(populatedExisting, payment, months, session);
                subscription = populatedExisting;
            } else if (comparison === 'UPGRADE') {
                subscription = await upgradeSubscription(
                    await SubscriptionModel.findById(existingActiveSubscription._id).session(session),
                    packageDoc,
                    payment,
                    months,
                    ipAddress,
                    userAgent,
                    session
                );
            } else {
                subscription = await downgradeSubscription(
                    await SubscriptionModel.findById(existingActiveSubscription._id).session(session),
                    packageDoc,
                    payment,
                    months,
                    ipAddress,
                    userAgent,
                    session
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
                agencyId,
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
            await subscription.save({ session });

            payment.subscriptionId = subscription._id;
            await payment.save({ session });
        }

        if (isRS && session.inTransaction && session.inTransaction()) {
            await session.commitTransaction();
        }
        if (session) session.endSession();

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
                ).catch(() => { });
            }
        }

        return populatedSubscription;
    } catch (error) {
        if (isRS && session && session.inTransaction && session.inTransaction()) {
            await session.abortTransaction();
        }
        if (session) session.endSession();
        throw error;
    }
}

module.exports = {
    createSubscription
};


const { SubscriptionModel, PaymentModel, PackageModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const mongoose = require('mongoose');

class SubscriptionService {
    static async createSubscription(subscriptionData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { userId, paymentId, ipAddress, userAgent } = subscriptionData;

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
                await session.commitTransaction();
                return existingSubscription;
            }

            const packageDoc = await PackageModel.findById(payment.packageId).session(session).lean();
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
                limits: {
                    maxStores: packageDoc.maxStores || 1,
                    maxUsers: packageDoc.maxUsers || 1,
                    maxProducts: packageDoc.maxProducts || null,
                    maxStorage: packageDoc.maxStorage || null
                },
                features: packageDoc.features || []
            };

            const subscription = new SubscriptionModel(newSubscriptionData);
            await subscription.save({ session });

            payment.subscriptionId = subscription._id;
            await payment.save({ session });

            await session.commitTransaction();

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
                .populate('packageId', 'name description pricing')
                .populate('paymentId', 'amount currency status')
                .lean();

            return populatedSubscription;
        } catch (error) {
            await session.abortTransaction();
            console.error('Error creating subscription:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async createSubscriptionInTransaction(subscriptionData) {
        const { userId, paymentId, session, ipAddress, userAgent } = subscriptionData;

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
            return existingSubscription;
        }

        const packageDoc = await PackageModel.findById(payment.packageId).session(session).lean();
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
            limits: {
                maxStores: packageDoc.maxStores || 1,
                maxUsers: packageDoc.maxUsers || 1,
                maxProducts: packageDoc.maxProducts || null,
                maxStorage: packageDoc.maxStorage || null
            },
            features: packageDoc.features || []
        };

        const subscription = new SubscriptionModel(newSubscriptionData);
        await subscription.save({ session });

        await logSubscriptionEvent('SUBSCRIPTION_CREATED', {
            subscriptionId: subscription._id,
            userId,
            packageId: payment.packageId,
            paymentId: payment._id,
            status: subscription.status,
            ipAddress,
            userAgent
        });

        return subscription;
    }

    static async getActiveSubscription(userId) {
        try {
            const now = new Date();
            const subscription = await SubscriptionModel.findOne({
                userId,
                status: { $in: ['ACTIVE', 'TRIAL'] },
                startDate: { $lte: now },
                endDate: { $gte: now }
            })
                .populate('packageId', 'name description pricing features')
                .populate('paymentId', 'amount currency status')
                .sort({ createdAt: -1 })
                .lean();

            return subscription;
        } catch (error) {
            throw error;
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
                .populate('packageId', 'name description pricing')
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
                .populate('packageId', 'name description pricing features')
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

            return subscription;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = SubscriptionService;


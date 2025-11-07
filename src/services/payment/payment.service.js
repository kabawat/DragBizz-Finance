const getRazorpayInstance = require('@src/lib/payment/razorpay.instance');
const { PaymentModel, PackageModel } = require('@src/models');
const { verifyPaymentSignature } = require('@src/utils/payment/razorpay.verify');
const { validateAmount, validateAmountBreakdown } = require('@src/utils/security/amount.validation');
const { generateIdempotencyKey } = require('@src/utils/security/idempotency');
const { logPaymentEvent } = require('@src/utils/audit/audit.logger');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

class PaymentService {
    static async createOrder(orderData) {
        try {
            const { userId, packageId, billingCycle, couponCode, idempotencyKey, ipAddress, userAgent } = orderData;

            if (!mongoose.Types.ObjectId.isValid(packageId)) {
                throw new Error('Invalid package ID format');
            }

            const packageDoc = await PackageModel.findOne({
                _id: packageId,
                status: 'ACTIVE',
                isVisible: true,
                deletedAt: null
            }).lean();

            if (!packageDoc) {
                throw new Error('Package not found or not available');
            }

            const pricing = packageDoc.pricing;
            if (pricing.billingCycle !== billingCycle) {
                throw new Error(`Package does not support ${billingCycle} billing cycle`);
            }

            const baseAmount = pricing.discountedAmount || pricing.amount;
            const amountValidation = validateAmount(baseAmount);
            if (!amountValidation.isValid) {
                throw new Error(amountValidation.error);
            }

            const discountAmount = couponCode ? await this._calculateCouponDiscount(baseAmount, couponCode) : 0;
            const finalAmount = Math.max(0, baseAmount - discountAmount);

            const finalAmountValidation = validateAmount(finalAmount);
            if (!finalAmountValidation.isValid) {
                throw new Error(finalAmountValidation.error);
            }

            const breakdownValidation = validateAmountBreakdown(baseAmount, discountAmount, 0, finalAmount);
            if (!breakdownValidation.isValid) {
                throw new Error(breakdownValidation.error);
            }

            const amountInPaise = Math.round(finalAmount * 100);
            if (amountInPaise < 100) {
                throw new Error('Minimum amount is ₹1.00');
            }

            const orderId = `order_${nanoid(16)}`;
            const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(userId, packageId, finalAmount);

            const razorpayOrder = await getRazorpayInstance().orders.create({
                amount: amountInPaise,
                currency: pricing.currency || 'INR',
                receipt: orderId,
                notes: {
                    userId,
                    packageId: packageId.toString(),
                    billingCycle,
                    packageName: packageDoc.name
                }
            });

            const paymentData = {
                userId,
                packageId: new mongoose.Types.ObjectId(packageId),
                orderId,
                razorpayOrderId: razorpayOrder.id,
                amount: finalAmount,
                currency: pricing.currency || 'INR',
                baseAmount: pricing.amount,
                discountAmount,
                taxAmount: 0,
                finalAmount,
                billingCycle,
                status: 'PENDING',
                gateway: 'RAZORPAY',
                couponCode: couponCode || null,
                discountPercentage: discountAmount > 0 ? (discountAmount / baseAmount) * 100 : 0,
                razorpayResponse: razorpayOrder,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                metadata: {
                    idempotencyKey: finalIdempotencyKey,
                    ipAddress,
                    userAgent
                }
            };

            const payment = new PaymentModel(paymentData);
            await payment.save();

            await logPaymentEvent('PAYMENT_ORDER_CREATED', {
                paymentId: payment._id,
                orderId,
                userId,
                amount: finalAmount,
                status: 'PENDING',
                ipAddress,
                userAgent
            });

            return {
                orderId,
                razorpayOrderId: razorpayOrder.id,
                amount: finalAmount,
                currency: pricing.currency || 'INR',
                keyId: require('@config/env.config').razorpay.keyId,
                payment
            };
        } catch (error) {
            console.error('Error creating payment order:', error);
            throw error;
        }
    }

    static async verifyPayment(paymentData) {
        try {
            const { razorpayOrderId, razorpayPaymentId, razorpaySignature, ipAddress, userAgent } = paymentData;

            if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
                throw new Error('Missing required payment verification data');
            }

            const isValidSignature = verifyPaymentSignature(
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            );

            if (!isValidSignature) {
                await logPaymentEvent('PAYMENT_VERIFICATION_FAILED', {
                    orderId: razorpayOrderId,
                    paymentId: razorpayPaymentId,
                    reason: 'Invalid signature',
                    ipAddress,
                    userAgent
                });
                throw new Error('Invalid payment signature');
            }

            const razorpayPayment = await getRazorpayInstance().payments.fetch(razorpayPaymentId);

            const amountValidation = validateAmount(razorpayPayment.amount / 100);
            if (!amountValidation.isValid) {
                throw new Error(`Invalid payment amount: ${amountValidation.error}`);
            }

            const payment = await PaymentModel.findOne({
                razorpayOrderId,
                razorpayPaymentId: null
            });

            if (!payment) {
                throw new Error('Payment order not found or already processed');
            }

            if (payment.status !== 'PENDING') {
                throw new Error(`Payment already processed with status: ${payment.status}`);
            }

            const expectedAmount = Math.round(payment.finalAmount * 100);
            const receivedAmount = razorpayPayment.amount;

            if (expectedAmount !== receivedAmount) {
                await logPaymentEvent('PAYMENT_AMOUNT_MISMATCH', {
                    paymentId: payment._id,
                    orderId: razorpayOrderId,
                    expectedAmount: payment.finalAmount,
                    receivedAmount: receivedAmount / 100,
                    ipAddress,
                    userAgent
                });
                throw new Error('Payment amount mismatch');
            }

            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;
            payment.status = razorpayPayment.status === 'captured' ? 'SUCCESS' : 'FAILED';
            payment.paymentMethod = razorpayPayment.method;
            payment.paidAt = new Date();
            payment.razorpayResponse = razorpayPayment;

            if (razorpayPayment.status !== 'captured') {
                payment.failureReason = razorpayPayment.error_description || 'Payment failed';
                payment.failureCode = razorpayPayment.error_code || 'PAYMENT_FAILED';
            }

            await payment.save();

            await logPaymentEvent(payment.status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED', {
                paymentId: payment._id,
                orderId: razorpayOrderId,
                userId: payment.userId,
                amount: payment.finalAmount,
                status: payment.status,
                ipAddress,
                userAgent
            });

            return payment;
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw error;
        }
    }

    static async getPaymentByOrderId(orderId) {
        try {
            const payment = await PaymentModel.findOne({ orderId })
                .populate('packageId', 'name description pricing')
                .lean();

            if (!payment) {
                throw new Error('Payment not found');
            }

            return payment;
        } catch (error) {
            throw error;
        }
    }

    static async getPaymentByRazorpayId(razorpayPaymentId) {
        try {
            const payment = await PaymentModel.findOne({ razorpayPaymentId })
                .populate('packageId', 'name description pricing')
                .populate('subscriptionId')
                .lean();

            if (!payment) {
                throw new Error('Payment not found');
            }

            return payment;
        } catch (error) {
            throw error;
        }
    }

    static async getUserPayments(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                fromDate,
                toDate
            } = options;

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);
            const skip = (pageNum - 1) * limitNum;

            const query = { userId };

            if (status) {
                query.status = status;
            }

            if (fromDate || toDate) {
                query.createdAt = {};
                if (fromDate) query.createdAt.$gte = new Date(fromDate);
                if (toDate) query.createdAt.$lte = new Date(toDate);
            }

            const total = await PaymentModel.countDocuments(query);
            const payments = await PaymentModel.find(query)
                .populate('packageId', 'name description')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();

            return {
                payments,
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

    static async _calculateCouponDiscount(amount, couponCode) {
        // TODO: Implement coupon validation logic
        return 0;
    }
}

module.exports = PaymentService;


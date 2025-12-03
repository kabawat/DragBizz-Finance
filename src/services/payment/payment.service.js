const getRazorpayInstance = require('@src/lib/payment/razorpay.instance');
const { PaymentModel, PackageModel } = require('@src/models');
const { verifyPaymentSignature } = require('@src/utils/payment/razorpay.verify');
const { validateAmount, validateAmountBreakdown } = require('@src/utils/security/amount.validation');
const { generateIdempotencyKey } = require('@src/utils/security/idempotency');
const { logPaymentEvent } = require('@src/utils/audit/audit.logger');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const SECRET = require('@config/env.config');

class PaymentService {
    static async createOrder(orderData) {
        try {
            const { userId, packageId, months, couponCode, email, phone, idempotencyKey, ipAddress, userAgent } = orderData;

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

            const monthsNum = parseInt(months);
            if (isNaN(monthsNum) || monthsNum < 1) {
                throw new Error('Invalid number of months');
            }

            const validMonths = [1, 3, 6, 12, 18, 24, 36, 48];
            if (!validMonths.includes(monthsNum)) {
                throw new Error(`Months must be one of: ${validMonths.join(', ')}`);
            }

            const pricing = packageDoc.pricing;
            if (!Array.isArray(pricing) || pricing.length === 0) {
                throw new Error('Package pricing not available');
            }
            
            const pricingOption = pricing.find(p => p.months === monthsNum);
            
            if (!pricingOption) {
                throw new Error(`Pricing not available for ${monthsNum} month(s)`);
            }

            const baseAmount = pricingOption.discountedPrice || pricingOption.price;
            const baseValidation = validateAmount(baseAmount);
            if (!baseValidation.isValid) {
                throw new Error(baseValidation.error);
            }

            const discountAmount = couponCode ? await this._calculateCouponDiscount(baseAmount, couponCode) : 0;
            const amountAfterDiscount = Math.max(0, baseAmount - discountAmount);
            
            // No GST in new structure, final amount is after discount
            const finalAmount = amountAfterDiscount;

            const finalAmountValidation = validateAmount(finalAmount);
            if (!finalAmountValidation.isValid) {
                throw new Error(finalAmountValidation.error);
            }

            const taxAmount = 0; // No tax in new structure
            const breakdownValidation = validateAmountBreakdown(baseAmount, discountAmount, taxAmount, finalAmount);
            if (!breakdownValidation.isValid) {
                throw new Error(breakdownValidation.error);
            }

            const billingCycle = this._getBillingCycleFromMonths(monthsNum);
            const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(userId, packageId, finalAmount);

            // Idempotency: reuse existing pending order when available
            const existingPayment = await PaymentModel.findOne({
                userId,
                status: { $in: ['PENDING', 'PROCESSING', 'SUCCESS'] },
                'metadata.idempotencyKey': finalIdempotencyKey
            });

            if (existingPayment) {
                const now = new Date();
                if (existingPayment.expiresAt && existingPayment.expiresAt <= now) {
                    existingPayment.status = 'CANCELLED';
                    existingPayment.failureReason = 'Payment order expired before completion';
                    existingPayment.failureCode = 'ORDER_EXPIRED';
                    existingPayment.expiresAt = now;
                    await existingPayment.save();

                    await logPaymentEvent('PAYMENT_ORDER_EXPIRED', {
                        paymentId: existingPayment._id,
                        orderId: existingPayment.orderId,
                        userId,
                        amount: existingPayment.finalAmount,
                        status: existingPayment.status,
                        ipAddress,
                        userAgent
                    });
                } else {
                    await logPaymentEvent('PAYMENT_ORDER_REUSED', {
                        paymentId: existingPayment._id,
                        orderId: existingPayment.orderId,
                        userId,
                        amount: existingPayment.finalAmount,
                        status: existingPayment.status,
                        ipAddress,
                        userAgent
                    });
                    return this._buildOrderResponse(existingPayment);
                }
            }

            if (finalAmount === 0) {
                const orderId = `free_${nanoid(16)}`;
                const freeRazorpayId = `free_rzp_${nanoid(16)}`;

                const paymentData = {
                    userId,
                    packageId: new mongoose.Types.ObjectId(packageId),
                    paymentId: new mongoose.Types.ObjectId(),
                    orderId,
                    razorpayOrderId: freeRazorpayId,
                    amount: 0,
                    currency: 'INR',
                    baseAmount,
                    discountAmount,
                    taxAmount: 0,
                    finalAmount: 0,
                    billingCycle,
                    months: monthsNum,
                    status: 'SUCCESS',
                    gateway: 'INTERNAL',
                    paymentMethod: 'FREE',
                    couponCode: couponCode || null,
                    discountPercentage: baseAmount > 0 ? (discountAmount / baseAmount) * 100 : 0,
                    gstPercentage: 0,
                    razorpayResponse: { freeOrder: true },
                    expiresAt: null,
                    metadata: {
                        idempotencyKey: finalIdempotencyKey,
                        ipAddress,
                        userAgent
                    },
                    paidAt: new Date()
                };

                const payment = await PaymentModel.create(paymentData);

                await logPaymentEvent('PAYMENT_ORDER_CREATED', {
                    paymentId: payment._id,
                    orderId,
                    userId,
                    amount: 0,
                    status: payment.status,
                    ipAddress,
                    userAgent
                });

                await logPaymentEvent('PAYMENT_SUCCESS', {
                    paymentId: payment._id,
                    orderId,
                    userId,
                    amount: 0,
                    status: payment.status,
                    ipAddress,
                    userAgent
                });

                try {
                    await SubscriptionService.createSubscription({
                        userId,
                        paymentId: payment._id,
                        ipAddress,
                        userAgent
                    });
                } catch (subError) {
                    console.log('Error creating subscription for free package:', subError);
                }

                return this._buildOrderResponse(payment);
            }

            const amountInPaise = Math.round(finalAmount * 100);
            if (amountInPaise < 100) {
                throw new Error('Minimum amount is ₹1.00');
            }

            const orderId = `order_${nanoid(16)}`;

            let razorpayOrder;
            try {
                razorpayOrder = await getRazorpayInstance().orders.create({
                    amount: amountInPaise,
                    currency: 'INR', // Default currency
                    receipt: orderId,
                    notes: {
                        userId,
                        packageId: packageId.toString(),
                        months: monthsNum,
                        billingCycle,
                        packageName: packageDoc.name,
                        ...(email && { email }),
                        ...(phone && { phone })
                    }
                });
            } catch (razorpayError) {
                console.error('Razorpay order creation failed:', razorpayError);
                throw new Error(`Failed to create Razorpay order: ${razorpayError.message || 'Unknown error'}`);
            }

            if (!razorpayOrder || !razorpayOrder.id) {
                throw new Error('Invalid response from Razorpay: Order ID not found');
            }

            const paymentData = {
                userId,
                packageId: new mongoose.Types.ObjectId(packageId),
                paymentId: new mongoose.Types.ObjectId(),
                orderId,
                razorpayOrderId: razorpayOrder.id,
                amount: finalAmount,
                currency: 'INR', // Default currency
                baseAmount,
                discountAmount,
                taxAmount: 0, // No tax in new structure
                finalAmount,
                billingCycle,
                months: monthsNum,
                status: 'PENDING',
                gateway: 'RAZORPAY',
                couponCode: couponCode || null,
                discountPercentage: discountAmount > 0 ? (discountAmount / baseAmount) * 100 : 0,
                gstPercentage: 0, // No GST in new structure
                razorpayResponse: razorpayOrder,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                metadata: {
                    idempotencyKey: finalIdempotencyKey,
                    ipAddress,
                    userAgent
                }
            };

            const payment = new PaymentModel(paymentData);
            let savedPayment;

            try {
                savedPayment = await payment.save();
            } catch (error) {
                if (error.code === 11000) {
                    const duplicateField = Object.keys(error.keyPattern || {})[0];
                    let duplicateQuery = null;

                    if (duplicateField === 'orderId') {
                        duplicateQuery = { orderId };
                    } else if (duplicateField === 'razorpayOrderId') {
                        duplicateQuery = { razorpayOrderId: razorpayOrder.id };
                    } else if (duplicateField === '_id') {
                        duplicateQuery = { _id: payment._id };
                    } else if (duplicateField === 'paymentId' && error.keyValue?.paymentId) {
                        duplicateQuery = { _id: error.keyValue.paymentId };
                    }

                    let duplicatePayment = duplicateQuery
                        ? await PaymentModel.findOne(duplicateQuery)
                        : null;

                    if (!duplicatePayment) {
                        duplicatePayment = await PaymentModel.findOne({
                            userId,
                            status: { $in: ['PENDING', 'PROCESSING'] },
                            'metadata.idempotencyKey': finalIdempotencyKey
                        });
                    }

                    if (duplicatePayment) {
                        await logPaymentEvent('PAYMENT_ORDER_DUPLICATE_REUSED', {
                            paymentId: duplicatePayment._id,
                            orderId: duplicatePayment.orderId,
                            userId,
                            amount: duplicatePayment.finalAmount,
                            status: duplicatePayment.status,
                            ipAddress,
                            userAgent
                        });
                        return this._buildOrderResponse(duplicatePayment);
                    }
                }

                throw error;
            }

            await logPaymentEvent('PAYMENT_ORDER_CREATED', {
                paymentId: savedPayment._id,
                orderId,
                userId,
                amount: savedPayment.finalAmount,
                status: savedPayment.status,
                ipAddress,
                userAgent
            });

            return this._buildOrderResponse(savedPayment);
        } catch (error) {
            console.log('Error creating payment order:', error);
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
            console.log('Error verifying payment:', error);
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

    static _getBillingCycleFromMonths(months) {
        if (months === 1) return 'MONTHLY';
        if (months === 3) return 'QUARTERLY';
        if (months === 12) return 'YEARLY';
        return 'ONE_TIME';
    }

    static async _calculateCouponDiscount(amount, couponCode) {
        return 0;
    }

    static _buildOrderResponse(paymentDoc) {
        if (!paymentDoc) {
            throw new Error('Payment document is required to build order response');
        }
        
        const requiresPayment = (paymentDoc.finalAmount || 0) > 0;
        return {
            orderId: paymentDoc.orderId || null,
            razorpayOrderId: paymentDoc.razorpayOrderId || null,
            amount: paymentDoc.finalAmount || 0,
            currency: paymentDoc.currency || 'INR',
            keyId: requiresPayment ? SECRET.razorpay.keyId : null,
            status: paymentDoc.status || 'PENDING',
            requiresPayment,
            payment: paymentDoc
        };
    }
}

module.exports = PaymentService;


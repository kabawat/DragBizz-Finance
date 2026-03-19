const getRazorpayInstance = require('@src/lib/payment/razorpay.instance');
const { PaymentModel, PackageModel } = require('@src/models');
const { generateIdempotencyKey, checkIdempotency } = require('@src/utils/security/idempotency');
const { validateAmount } = require('@src/utils/security/amount.validation');
const { logPaymentEvent } = require('@src/utils/audit/audit.logger');
const { nanoid } = require('nanoid');
const logger = require('@src/utils/logger');
const mongoose = require('mongoose');


const { getBillingCycleFromMonths, calculateFinalPricing, buildOrderResponse } = require('./helpers');

async function createOrder(orderData) {
    const { userId, agencyId = null, packageId, months, couponCode, email, phone, idempotencyKey, ipAddress, userAgent } = orderData;

    const packageDoc = await PackageModel.findOne({
        _id: packageId,
        status: 'ACTIVE',
        isVisible: true,
        deletedAt: null
    }).select('name pricing').lean();

    if (!packageDoc) {
        throw new Error('Package not found or not available');
    }

    const monthsNum = parseInt(months, 10);

    const pricingOption = packageDoc.pricing?.find(p => p.months === monthsNum);

    if (!pricingOption) {
        throw new Error(`Pricing not available for ${monthsNum} month(s)`);
    }

    const { baseAmount, discountAmount, taxAmount, finalAmount } = await calculateFinalPricing(pricingOption, couponCode);

    const amountValidation = validateAmount(finalAmount);
    if (!amountValidation.isValid) {
        throw new Error(`Invalid final amount: ${amountValidation.error}`);
    }

    const billingCycle = getBillingCycleFromMonths(monthsNum);
    const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(userId, packageId, finalAmount);

    const idempotencyCheck = await checkIdempotency(finalIdempotencyKey, userId);

    if (idempotencyCheck.isDuplicate) {
        return buildOrderResponse(idempotencyCheck.payment);
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
            currency: 'INR', // Default INR
            receipt: orderId,
            notes: {
                userId,
                packageId: packageId.toString(),
                months: monthsNum,
                billingCycle,
                packageName: packageDoc.name ? packageDoc.name.substring(0, 250) : '',
                ...(email && { email }),
                ...(phone && { phone })
            }
        });
    } catch (razorpayError) {
        logger.error('Razorpay order creation failed', { error: razorpayError?.message, stack: razorpayError?.stack });
        throw new Error(`Failed to create Razorpay order: ${razorpayError.message || 'Unknown error'}`);
    }

    if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error('Invalid response from Razorpay: Order ID not found');
    }

    const paymentData = {
        userId,
        agencyId: agencyId || null,
        packageId: packageId,
        paymentId: new mongoose.Types.ObjectId(),
        orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency: 'INR',
        baseAmount,
        discountAmount,
        taxAmount: 0,
        finalAmount,
        billingCycle,
        months: monthsNum,
        status: 'PENDING',
        gateway: 'RAZORPAY',
        couponCode: couponCode || null,
        discountPercentage: discountAmount > 0 ? (discountAmount / baseAmount) * 100 : 0,
        gstPercentage: 0,
        razorpayResponse: razorpayOrder,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        metadata: {
            idempotencyKey: finalIdempotencyKey,
            ipAddress,
            userAgent,
            ...(email && { email }),
            ...(phone && { phone })
        }
    };

    const payment = new PaymentModel(paymentData);
    let savedPayment;

    try {
        savedPayment = await payment.save();
    } catch (err) {
        if (err.code === 11000) {
            const existing = await PaymentModel.findOne({ 'metadata.idempotencyKey': finalIdempotencyKey, userId });
            if (existing) {
                return buildOrderResponse(existing);
            }
        }
        throw err;
    }

    // Log event async
    setImmediate(() => {
        logPaymentEvent('PAYMENT_ORDER_CREATED', {
            paymentId: savedPayment._id,
            orderId,
            userId,
            amount: savedPayment.finalAmount,
            status: savedPayment.status,
            ipAddress,
            userAgent
        }).catch(error => {
            logger.error('Background log event failed', { error: error?.message, stack: error?.stack });
        });
    });

    return buildOrderResponse(savedPayment);
}

module.exports = {
    createOrder
};

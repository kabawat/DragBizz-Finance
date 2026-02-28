const getRazorpayInstance = require('@src/lib/payment/razorpay.instance');
const { PaymentModel } = require('@src/models');
const { verifyPaymentSignature } = require('@src/utils/payment/razorpay.verify');
const { validateAmount } = require('@src/utils/security/amount.validation');
const { logPaymentEvent } = require('@src/utils/audit/audit.logger');
const logger = require('@src/utils/logger');

async function verifyPayment(paymentData) {
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

    const payment = await PaymentModel.findOne({
        razorpayOrderId
    });

    if (!payment) {
        throw new Error('Payment order not found');
    }

    // Handle Idempotency / Race Condition
    if (payment.status === 'SUCCESS' && payment.razorpayPaymentId === razorpayPaymentId) {
        return payment;
    }

    if (payment.status !== 'PENDING') {
        throw new Error(`Payment already processed with status: ${payment.status}`);
    }

    const paymentStatus = 'SUCCESS';

    const updatedPayment = await PaymentModel.findOneAndUpdate(
        {
            _id: payment._id,
            status: 'PENDING'
        },
        {
            $set: {
                razorpayPaymentId,
                razorpaySignature,
                status: paymentStatus,
                paidAt: new Date()
            }
        },
        { new: true }
    );

    // If null, webhook already updated it
    const finalPaymentDoc = updatedPayment || payment;

    await logPaymentEvent(paymentStatus === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED', {
        paymentId: payment._id,
        orderId: razorpayOrderId,
        userId: payment.userId,
        amount: payment.finalAmount,
        status: paymentStatus,
        ipAddress,
        userAgent
    });

    return finalPaymentDoc;
}

module.exports = {
    verifyPayment
};

const { PaymentModel } = require('@src/models');
const { logPaymentEvent } = require('@src/utils/audit/audit.logger');
const { notifyPaymentSettled } = require('./hooks.service');
const { getActiveGateway } = require('@src/lib/payment/gateway.factory');
const { GatewayError } = require('@src/lib/payment/errors');
const { PaymentStatus } = require('@src/lib/payment/events');
const { amountsMatch } = require('@src/lib/payment/money');
const { findPaymentByReference } = require('./lookup.service');

const SUCCESS_FROM = ['PENDING', 'PROCESSING', 'CANCELLED', 'FAILED'];

async function verifyPayment(paymentData) {
    const gateway = getActiveGateway();
    const payment = await findPaymentByReference({
        gatewayOrderId: paymentData.gatewayOrderId || paymentData.orderId,
        merchantOrderId: paymentData.orderId
    });

    if (!payment) {
        throw new Error('Payment order not found');
    }

    let result;
    try {
        result = await gateway.verifyPayment({
            ...paymentData,
            gatewayOrderId: paymentData.gatewayOrderId || payment.gatewayOrderId,
            orderId: paymentData.orderId || payment.orderId,
            expectedAmount: payment.finalAmount,
            email: paymentData.email || payment.metadata?.email,
            phone: paymentData.phone || payment.metadata?.phone
        });
    } catch (error) {
        if (error.code === 'INVALID_SIGNATURE') {
            await logPaymentEvent('PAYMENT_VERIFICATION_FAILED', {
                orderId: payment.orderId,
                paymentId: payment._id,
                reason: 'Invalid signature',
                gateway: gateway.schemaId,
                ipAddress: paymentData.ipAddress,
                userAgent: paymentData.userAgent
            });
        }
        throw error;
    }

    if (result.amount != null && !amountsMatch(payment.finalAmount, result.amount)) {
        throw new GatewayError('Paid amount does not match the order', { code: 'AMOUNT_MISMATCH', statusCode: 400 });
    }

    if (result.status !== PaymentStatus.SUCCESS) {
        if (payment.status === PaymentStatus.SUCCESS) {
            await notifyPaymentSettled(payment);
            return payment;
        }
        throw new GatewayError('Payment is not completed', { code: 'PAYMENT_PENDING', statusCode: 400 });
    }

    return settleSuccess(payment, result, paymentData);
}

async function settleSuccess(payment, result, context = {}) {
    if (payment.status === PaymentStatus.SUCCESS) {
        await notifyPaymentSettled(payment);
        return payment;
    }

    if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.PARTIALLY_REFUNDED) {
        return payment;
    }

    const updated = await PaymentModel.findOneAndUpdate(
        { _id: payment._id, status: { $in: SUCCESS_FROM } },
        {
            $set: {
                status: PaymentStatus.SUCCESS,
                paidAt: result.paidAt || new Date(),
                paymentMethod: result.paymentMethod || payment.paymentMethod,
                gatewayPaymentId: result.gatewayPaymentId || payment.gatewayPaymentId,
                ...(result.persistence || {})
            }
        },
        { new: true }
    );

    const finalPayment = updated || await PaymentModel.findById(payment._id);
    await logPaymentEvent('PAYMENT_SUCCESS', {
        paymentId: finalPayment._id,
        orderId: finalPayment.orderId,
        userId: finalPayment.userId,
        amount: finalPayment.finalAmount,
        status: finalPayment.status,
        gateway: finalPayment.gateway,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
    });

    if (finalPayment.status === PaymentStatus.SUCCESS) {
        await notifyPaymentSettled(finalPayment);
    }
    return finalPayment;
}

module.exports = { verifyPayment, settleSuccess };

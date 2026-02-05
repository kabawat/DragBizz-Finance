const { verifyWebhookSignature } = require('@src/utils/payment/razorpay.verify');
const { PaymentModel } = require('@src/models');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');

function extractEntity(payload, entityType) {
    return payload[entityType]?.entity;
}

function extractRazorpayIds(paymentEntity) {
    return {
        razorpayPaymentId: paymentEntity.id,
        razorpayOrderId: paymentEntity.order_id
    };
}

async function findPaymentByOrderId(razorpayOrderId, additionalQuery = {}) {
    return PaymentModel.findOne({
        razorpayOrderId,
        ...additionalQuery
    });
}

async function razorpayWebhookController(req, res) {
    try {
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return Response.validationError(res, 'Webhook signature missing');
        }

        const rawBody = JSON.stringify(req.body);
        const isValidSignature = verifyWebhookSignature(rawBody, signature);
        if (!isValidSignature) {
            return Response.validationError(res, 'Invalid webhook signature');
        }

        const event = req.body.event;
        const payload = req.body.payload;

        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(payload);
                break;

            case 'payment.failed':
                await handlePaymentFailed(payload);
                break;

            case 'order.paid':
                await handleOrderPaid(payload);
                break;

            case 'refund.created':
                await handleRefundCreated(payload);
                break;

            case 'refund.processed':
                await handleRefundProcessed(payload);
                break;

            default:
                logger.warn(`Unhandled webhook event: ${event}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(200).json({ received: true, error: error.message });
    }
}

async function handlePaymentCaptured(payload) {
    try {
        const paymentEntity = extractEntity(payload, 'payment');
        if (!paymentEntity) return;

        const { razorpayPaymentId, razorpayOrderId } = extractRazorpayIds(paymentEntity);

        const payment = await findPaymentByOrderId(razorpayOrderId, {
            razorpayPaymentId: { $ne: null }
        });

        if (!payment) {
            return;
        }

        if (payment.status !== 'SUCCESS') {
            payment.status = 'SUCCESS';
            payment.paidAt = new Date(paymentEntity.created_at * 1000);
            payment.paymentMethod = paymentEntity.method;
            payment.razorpayResponse = paymentEntity;
            await payment.save();

            if (!payment.subscriptionId) {
                try {
                    await SubscriptionService.createSubscription({
                        userId: payment.userId,
                        paymentId: payment._id
                    });
                } catch (subError) {
                    logger.error('Error creating subscription from webhook', { error: subError?.message, stack: subError?.stack });
                }
            }
        }
    } catch (error) {
        throw error;
    }
}

async function handlePaymentFailed(payload) {
    try {
        const paymentEntity = extractEntity(payload, 'payment');
        if (!paymentEntity) return;

        const { razorpayPaymentId, razorpayOrderId } = extractRazorpayIds(paymentEntity);

        const payment = await findPaymentByOrderId(razorpayOrderId, {
            razorpayPaymentId
        });

        if (payment && payment.status === 'PENDING') {
            payment.status = 'FAILED';
            payment.failureReason = paymentEntity.error_description || 'Payment failed';
            payment.failureCode = paymentEntity.error_code || 'PAYMENT_FAILED';
            payment.razorpayResponse = paymentEntity;
            await payment.save();
        }
    } catch (error) {
        logger.error('Error handling payment.failed', { error: error?.message, stack: error?.stack });
        throw error;
    }
}

async function handleOrderPaid(payload) {
    try {
        const orderEntity = extractEntity(payload, 'order');
        if (!orderEntity) return;

        const razorpayOrderId = orderEntity.id;
        const payment = await findPaymentByOrderId(razorpayOrderId);

        if (payment && payment.status === 'PENDING') {
            try {
                const getRazorpayInstance = require('@src/lib/payment/razorpay.instance');
                const payments = await getRazorpayInstance().orders.fetchPayments(razorpayOrderId);
                
                if (payments.items && payments.items.length > 0) {
                    const latestPayment = payments.items[0];
                    if (latestPayment.status === 'captured') {
                        await handlePaymentCaptured({ payment: { entity: latestPayment } });
                    }
                }
            } catch (error) {
                logger.error('Error fetching payment details', { error: error?.message, stack: error?.stack });
            }
        }
    } catch (error) {
        logger.error('Error handling order.paid', { error: error?.message, stack: error?.stack });
        throw error;
    }
}

async function handleRefundCreated(payload) {
    try {
        const refundEntity = extractEntity(payload, 'refund');
        if (!refundEntity) return;

        const razorpayPaymentId = refundEntity.payment_id;
        const refundAmount = refundEntity.amount / 100;

        const payment = await PaymentModel.findOne({ razorpayPaymentId });

        if (payment) {
            payment.refundAmount = refundAmount;
            payment.refundStatus = 'PENDING';
            payment.refundedAt = new Date(refundEntity.created_at * 1000);
            
            if (refundAmount >= payment.finalAmount) {
                payment.status = 'REFUNDED';
            } else {
                payment.status = 'PARTIALLY_REFUNDED';
            }
            
            await payment.save();
        }
    } catch (error) {
        throw error;
    }
}

async function handleRefundProcessed(payload) {
    try {
        const refundEntity = extractEntity(payload, 'refund');
        if (!refundEntity) return;

        const razorpayPaymentId = refundEntity.payment_id;
        const payment = await PaymentModel.findOne({ razorpayPaymentId });

        if (payment) {
            payment.refundStatus = 'SUCCESS';
            await payment.save();
        }
    } catch (error) {
        logger.error('Error handling refund.processed', { error: error?.message, stack: error?.stack });
        throw error;
    }
}

module.exports = razorpayWebhookController;


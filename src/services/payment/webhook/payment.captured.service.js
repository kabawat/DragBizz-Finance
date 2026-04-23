
const logger = require('@src/utils/logger');
const { extractEntity, extractRazorpayIds, findPaymentByOrderId } = require('./helpers');
const SubscriptionService = require('@src/services/subscription');

async function handlePaymentCaptured(payload) {
    let razorpayOrderId = 'unknown';
    try {
        const paymentEntity = extractEntity(payload, 'payment');
        if (!paymentEntity) return;

        const ids = extractRazorpayIds(paymentEntity);
        razorpayOrderId = ids.razorpayOrderId;
        const { razorpayPaymentId } = ids;

        const payment = await findPaymentByOrderId(razorpayOrderId);

        if (!payment) {
            return;
        }

        let updated = false;
        if (payment.status !== 'SUCCESS') {
            payment.status = 'SUCCESS';
            payment.paidAt = new Date(paymentEntity.created_at * 1000);
            payment.paymentMethod = paymentEntity.method;
            payment.razorpayResponse = paymentEntity;
            await payment.save();
            updated = true;
        }

        if ((updated || payment.status === 'SUCCESS') && !payment.subscriptionId) {
            await SubscriptionService.createSubscription({
                userId: payment.userId,
                agencyId: payment.agencyId || null,
                paymentId: payment._id,
                ipAddress: payment.metadata ? payment.metadata.ipAddress : null,
                userAgent: payment.metadata ? payment.metadata.userAgent : null
            });
        }
    } catch (error) {
        logger.error('[WEBHOOK] payment.captured handler failed', {
            error: error.message,
            stack: error.stack,
            razorpayOrderId: razorpayOrderId || 'unknown'
        });
        throw error;
    }
}

module.exports = {
    handlePaymentCaptured
};

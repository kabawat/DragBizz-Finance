
const logger = require('@src/utils/logger');
const { extractEntity, extractRazorpayIds, findPaymentByOrderId } = require('./helpers');
const { activateSubscriptionAfterPayment } = require('@src/services/payment/activateSubscription.service');

const LOG = '[WEBHOOK]';

async function handlePaymentCaptured(payload) {
    let razorpayOrderId = 'unknown';
    try {
        console.log(`${LOG} [3a] payment.captured: payload keys`, Object.keys(payload || {}));

        const paymentEntity = extractEntity(payload, 'payment');
        if (!paymentEntity) {
            console.log(`${LOG} [3a] STOP no payment entity in payload`);
            return;
        }

        const ids = extractRazorpayIds(paymentEntity);
        razorpayOrderId = ids.razorpayOrderId;
        const { razorpayPaymentId } = ids;
        console.log(`${LOG} [3b] razorpay ids`, { razorpayOrderId, razorpayPaymentId });

        const payment = await findPaymentByOrderId(razorpayOrderId);

        if (!payment) {
            console.log(`${LOG} [3c] STOP payment not found in DB for order`, razorpayOrderId);
            return;
        }

        console.log(`${LOG} [3d] payment found`, {
            paymentId: payment._id?.toString?.(),
            status: payment.status,
            userId: payment.userId,
            agencyId: payment.agencyId?.toString?.(),
            hasSubscriptionId: Boolean(payment.subscriptionId),
        });

        let updated = false;
        if (payment.status !== 'SUCCESS') {
            payment.status = 'SUCCESS';
            payment.paidAt = new Date(paymentEntity.created_at * 1000);
            payment.paymentMethod = paymentEntity.method;
            payment.razorpayResponse = paymentEntity;
            await payment.save();
            updated = true;
            console.log(`${LOG} [3e] payment marked SUCCESS`);
        }

        if (updated || payment.status === 'SUCCESS') {
            console.log(`${LOG} [3f] activating subscription...`);
            await activateSubscriptionAfterPayment(payment);
            console.log(`${LOG} [3g] subscription activation done`);
        }
    } catch (error) {
        console.log(`${LOG} [ERR] payment.captured`, { razorpayOrderId, message: error.message });
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

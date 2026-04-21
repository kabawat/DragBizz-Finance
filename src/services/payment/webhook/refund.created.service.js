const { extractEntity, findPaymentByPaymentId } = require('./helpers');
const logger = require('@src/utils/logger');

async function handleRefundCreated(payload) {
    try {
        const refundEntity = extractEntity(payload, 'refund');
        if (!refundEntity) return;

        const razorpayPaymentId = refundEntity.payment_id;
        const refundAmount = refundEntity.amount / 100;

        const payment = await findPaymentByPaymentId(razorpayPaymentId);

        if (payment) {
            payment.refundAmount = refundAmount;
            payment.refundStatus = 'PENDING';
            payment.refundedAt = new Date(refundEntity.created_at * 1000);

            const finalAmount = typeof payment.finalAmount === 'number' ? payment.finalAmount : 0;
            if (finalAmount > 0 && refundAmount >= finalAmount) {
                payment.status = 'REFUNDED';
            } else {
                payment.status = 'PARTIALLY_REFUNDED';
            }

            await payment.save();
        }
    } catch (error) {
        logger.error('Error handling refund.created', { error: error?.message, stack: error?.stack });
        throw error;
    }
}

module.exports = {
    handleRefundCreated
};

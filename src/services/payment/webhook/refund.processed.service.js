const { extractEntity, findPaymentByPaymentId } = require('./helpers');
const logger = require('@src/utils/logger');

async function handleRefundProcessed(payload) {
    try {
        const refundEntity = extractEntity(payload, 'refund');
        if (!refundEntity) return;

        const razorpayPaymentId = refundEntity.payment_id;
        const payment = await findPaymentByPaymentId(razorpayPaymentId);

        if (payment) {
            payment.refundStatus = 'SUCCESS';
            await payment.save();
        }
    } catch (error) {
        logger.error('Error handling refund.processed', { error: error?.message, stack: error?.stack });
        throw error;
    }
}

module.exports = {
    handleRefundProcessed
};

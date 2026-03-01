const logger = require('@src/utils/logger');
const { extractEntity, extractRazorpayIds, findPaymentByOrderId } = require('./helpers');

async function handlePaymentFailed(payload) {
    try {
        const paymentEntity = extractEntity(payload, 'payment');
        if (!paymentEntity) return;

        const { razorpayPaymentId, razorpayOrderId } = extractRazorpayIds(paymentEntity);

        const payment = await findPaymentByOrderId(razorpayOrderId);

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

module.exports = {
    handlePaymentFailed
};

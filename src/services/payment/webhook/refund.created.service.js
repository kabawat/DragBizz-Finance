const { extractEntity, findPaymentByPaymentId } = require('./helpers');

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

module.exports = {
    handleRefundCreated
};

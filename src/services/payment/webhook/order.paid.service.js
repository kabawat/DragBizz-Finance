const logger = require('@src/utils/logger');
const getRazorpayInstance = require('@src/lib/payment/razorpay.instance');
const { extractEntity, findPaymentByOrderId } = require('./helpers');
const { handlePaymentCaptured } = require('./payment.captured.service');

async function handleOrderPaid(payload) {
    try {
        const orderEntity = extractEntity(payload, 'order');
        if (!orderEntity) return;

        const razorpayOrderId = orderEntity.id;
        const payment = await findPaymentByOrderId(razorpayOrderId);

        if (payment && payment.status === 'PENDING') {
            try {
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

module.exports = {
    handleOrderPaid
};

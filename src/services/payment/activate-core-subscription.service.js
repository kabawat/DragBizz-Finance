const { createSubscriptionFromPayment } = require('@src/services/coreSubscription.service');
const logger = require('@src/utils/logger');

async function activateCoreSubscriptionAfterPayment(payment) {
    if (!payment || payment.status !== 'SUCCESS' || !payment.packageId) {
        return null;
    }

    try {
        const result = await createSubscriptionFromPayment(payment);
        payment.subscriptionId = result.subscriptionId;
        payment.subscriptionType = result.operationType;
        await payment.save();
        return result;
    } catch (error) {
        logger.error('Core subscription activation after payment failed', {
            paymentId: payment._id?.toString?.(),
            userId: payment.userId,
            error: error.message,
        });
        throw error;
    }
}

module.exports = { activateCoreSubscriptionAfterPayment };

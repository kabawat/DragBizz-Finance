const { createSubscription } = require('@src/services/subscription');
const logger = require('@src/utils/logger');

async function activateSubscription(payment) {
    if (!payment || payment.status !== 'SUCCESS' || !payment.packageId) {
        return null;
    }

    try {
        const result = await createSubscription(payment);
        payment.subscriptionId = result.subscriptionId;
        payment.subscriptionType = result.operationType;
        await payment.save();
        return result;
    } catch (error) {
        logger.error('Subscription activation failed', {
            paymentId: payment._id?.toString?.(),
            userId: payment.userId,
            error: error.message,
        });
        throw error;
    }
}

module.exports = { activateSubscription };

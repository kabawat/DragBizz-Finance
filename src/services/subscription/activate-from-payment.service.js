const SubscriptionService = require('@src/services/subscription');
const logger = require('@src/utils/logger');

async function activateSubscriptionAfterPayment(payment) {
    if (!payment || payment.status !== 'SUCCESS' || !payment.packageId || payment.subscriptionId) {
        return null;
    }

    try {
        await SubscriptionService.createSubscription({
            userId: payment.userId,
            agencyId: payment.agencyId || null,
            paymentId: payment._id,
            ipAddress: payment.metadata?.ipAddress || null,
            userAgent: payment.metadata?.userAgent || null,
        });
        return true;
    } catch (error) {
        logger.error('Subscription activation after payment failed', {
            paymentId: payment._id?.toString?.(),
            userId: payment.userId,
            error: error.message,
        });
        throw error;
    }
}

module.exports = { activateSubscriptionAfterPayment };

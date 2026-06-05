const SubscriptionService = require('@src/services/subscription');
const logger = require('@src/utils/logger');

// Create subscription after payment SUCCESS (idempotent — same as webhook)
async function activateSubscriptionAfterPayment(payment) {
    if (!payment || payment.status !== 'SUCCESS' || payment.subscriptionId) {
        console.log('[PAY] activate skip', {
            hasPayment: Boolean(payment),
            status: payment?.status,
            hasSubscriptionId: Boolean(payment?.subscriptionId),
        });
        return null;
    }

    try {
        console.log('[PAY] activate createSubscription', {
            userId: payment.userId,
            agencyId: payment.agencyId?.toString?.(),
            paymentId: payment._id?.toString?.(),
        });
        await SubscriptionService.createSubscription({
            userId: payment.userId,
            agencyId: payment.agencyId || null,
            paymentId: payment._id,
            ipAddress: payment.metadata?.ipAddress || null,
            userAgent: payment.metadata?.userAgent || null,
        });
        console.log('[PAY] activate createSubscription OK');
        return true;
    } catch (error) {
        console.log('[PAY] activate createSubscription failed', error.message);
        logger.error('[PAY] activateSubscriptionAfterPayment failed', {
            paymentId: payment._id?.toString?.(),
            userId: payment.userId,
            agencyId: payment.agencyId?.toString?.(),
            error: error.message,
        });
        throw error;
    }
}

module.exports = { activateSubscriptionAfterPayment };

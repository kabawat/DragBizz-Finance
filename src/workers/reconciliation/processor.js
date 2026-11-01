const { RetailPaymentAttemptModel } = require('@src/models');
const { getCredentials } = require('@src/services/payment/retail/checkout');
const gateway = require('@src/services/payment/retail/gateway');
const { recordConfirmedPayment } = require('@src/services/payment/retail/webhook');

async function reconcileAttempt(attempt) {
    const config = await getCredentials(attempt, 'VERIFY_WEBHOOK');
    if (!attempt.gatewayOrderId) {
        const recovered = await gateway.recoverOrder(attempt, config);
        if (!recovered) return; // Ambiguous creation is never blindly repeated.
        await RetailPaymentAttemptModel.updateOne(
            { _id: attempt._id, gatewayOrderId: null },
            {
                $set: {
                    gatewayOrderId: recovered.gatewayOrderId,
                    checkout: recovered,
                    status: 'CHECKOUT_READY',
                },
            }
        );
        attempt.gatewayOrderId = recovered.gatewayOrderId;
    }
    const paid = await gateway.confirmPayment(attempt, config);
    if (paid) {
        await recordConfirmedPayment(attempt, paid, {
            dedupeKey: `reconcile:${paid.gatewayPaymentId}`,
            providerEventId: `reconcile:${paid.gatewayPaymentId}`,
        });
    }
}

module.exports = {
    reconcileAttempt,
};


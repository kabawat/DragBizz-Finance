const { SubscriptionActivationJobModel } = require('@src/models');

async function activateSubscription(payment) {
    if (!payment || payment.status !== 'SUCCESS' || !payment.packageId) {
        return null;
    }

    const job = await SubscriptionActivationJobModel.findOneAndUpdate(
        { paymentId: payment._id },
        {
            $setOnInsert: {
                paymentId: payment._id,
                idempotencyKey: `subscription-activation:${payment._id}`,
                status: 'PENDING',
                nextRunAt: new Date(),
            },
        },
        { upsert: true, new: true }
    );
    return { queued: true, jobId: job._id };
}

module.exports = { activateSubscription };

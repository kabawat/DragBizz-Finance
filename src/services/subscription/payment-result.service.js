const { SubscriptionModel } = require('@src/models');
const SubscriptionService = require('@src/services/subscription');

async function getPaymentSubscriptionSummary({ payment, userId, agencyId }) {
    if (!payment || payment.status !== 'SUCCESS') {
        return null;
    }

    let subscription = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        subscription = await SubscriptionModel.findOne({ paymentId: payment._id })
            .populate('packageId', 'name')
            .lean();
        if (subscription) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!subscription) return null;

    const existingSubscription = await SubscriptionService.getActiveSubscription(userId, { agencyId });
    let type = 'NEW';

    if (subscription.status === 'PENDING') {
        type = 'DOWNGRADE';
    } else if (existingSubscription && existingSubscription._id.toString() !== subscription._id.toString()) {
        const existingPackageId = existingSubscription.packageId?._id?.toString() || existingSubscription.packageId?.toString();
        const newPackageId = subscription.packageId?._id?.toString() || subscription.packageId?.toString();
        type = existingPackageId === newPackageId ? 'RENEWAL' : 'UPGRADE';
    }

    const proratedCredit = payment.metadata?.proratedCredit || 0;

    return {
        id: subscription._id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        package: subscription.packageId ? {
            id: subscription.packageId._id,
            name: subscription.packageId.name
        } : null,
        type,
        proratedCredit: proratedCredit > 0 ? proratedCredit : null
    };
}

module.exports = { getPaymentSubscriptionSummary };

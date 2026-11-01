const { getByPayment, getPackageById } = require('@src/services/subscription');

async function getSummary({ payment }) {
    if (!payment || payment.status !== 'SUCCESS') return null;

    const subscription = await getByPayment(payment._id);
    if (!subscription) return null;

    const packageId = subscription.packageId?._id || subscription.packageId;
    let packageData = null;
    if (packageId) {
        try {
            packageData = await getPackageById(packageId, { includeInactive: true });
        } catch (_error) {
            packageData = null;
        }
    }

    return {
        id: subscription.subscriptionId || subscription._id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        package: packageId ? {
            id: packageData?._id || packageId,
            name: packageData?.name || null,
        } : null,
        type: payment.subscriptionType || subscription.lastPaymentType || 'NEW',
        proratedCredit: payment.metadata?.proratedCredit > 0 ? payment.metadata.proratedCredit : null,
    };
}

module.exports = { getSummary };

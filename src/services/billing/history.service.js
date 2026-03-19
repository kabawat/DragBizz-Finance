const mongoose = require('mongoose');
const { SubscriptionModel } = require('@src/models');

async function getPurchaseHistory(agencyId, userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(agencyId)) {
        throw new Error('Invalid agency ID format');
    }

    const agencyObjectId = new mongoose.Types.ObjectId(agencyId);

    const [subscriptions, total] = await Promise.all([
        SubscriptionModel.find({ agencyId: agencyObjectId })
            .populate('packageId', 'name description planType')
            .select('_id status billingCycle startDate endDate autoRenew nextBillingDate cancelledAt packageId createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        SubscriptionModel.countDocuments({ agencyId: agencyObjectId })
    ]);

    const history = subscriptions.map(s => ({
        subscriptionId: s._id,
        status: s.status,
        planName: s.packageId?.name || null,
        planType: s.packageId?.planType || null,
        billingCycle: s.billingCycle,
        startDate: s.startDate,
        endDate: s.endDate,
        nextBillingDate: s.nextBillingDate || null,
        autoRenew: s.autoRenew,
        cancelledAt: s.cancelledAt || null,
        purchasedAt: s.createdAt
    }));

    return {
        history,
        pagination: {
            currentPage: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
        }
    };
}

module.exports = { getPurchaseHistory };

const { PaymentModel } = require('@src/models');

async function getPaymentByOrderId(orderId) {
    const payment = await PaymentModel.findOne({ orderId })
        .populate('packageId', 'name description pricing')
        .lean();

    if (!payment) {
        throw new Error('Payment not found');
    }

    return payment;
}

async function getPaymentByRazorpayId(razorpayPaymentId) {
    const payment = await PaymentModel.findOne({ razorpayPaymentId })
        .populate('packageId', 'name description pricing')
        .populate('subscriptionId')
        .lean();

    if (!payment) {
        throw new Error('Payment not found');
    }

    return payment;
}

async function getUserPayments(userId, options = {}) {
    const { page = 1, limit = 10, status, fromDate, toDate } = options;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId };

    if (status) {
        query.status = status;
    }

    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const total = await PaymentModel.countDocuments(query);
    const payments = await PaymentModel.find(query)
        .populate('packageId', 'name description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    return {
        payments,
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

module.exports = {
    getPaymentByOrderId,
    getPaymentByRazorpayId,
    getUserPayments
};

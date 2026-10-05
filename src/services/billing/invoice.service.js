const mongoose = require('mongoose');
const { PaymentModel } = require('@src/models');

async function getInvoices(agencyId, userId, options = {}) {
    const { limit = 10, cursor } = options;
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100);

    if (!mongoose.Types.ObjectId.isValid(agencyId)) {
        throw new Error('Invalid agency ID format');
    }

    const agencyObjectId = new mongoose.Types.ObjectId(agencyId);

    const query = { agencyId: agencyObjectId, userId };

    // Cursor: fetch records older than the given cursor (_id)
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
        query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Fetch one extra to detect hasNextPage
    const payments = await PaymentModel.find(query)
        .select('_id orderId gateway gatewayPaymentId razorpayPaymentId amount currency baseAmount discountAmount taxAmount finalAmount billingCycle months status paymentMethod couponCode discountPercentage gstPercentage receipt paidAt createdAt')
        .sort({ _id: -1 })
        .limit(limitNum + 1)
        .lean();

    const hasNextPage = payments.length > limitNum;
    if (hasNextPage) payments.pop();

    const nextCursor = hasNextPage ? payments[payments.length - 1]._id.toString() : null;

    const invoices = payments.map(p => ({
        invoiceId: p._id,
        orderId: p.orderId,
        gateway: p.gateway || null,
        gatewayPaymentId: p.gatewayPaymentId || p.razorpayPaymentId || null,
        razorpayPaymentId: p.razorpayPaymentId || null,
        currency: p.currency,
        baseAmount: p.baseAmount,
        discountAmount: p.discountAmount,
        discountPercentage: p.discountPercentage,
        taxAmount: p.taxAmount,
        gstPercentage: p.gstPercentage,
        finalAmount: p.finalAmount,
        billingCycle: p.billingCycle,
        months: p.months,
        status: p.status,
        paymentMethod: p.paymentMethod || null,
        couponCode: p.couponCode || null,
        receipt: p.receipt || null,
        paidAt: p.paidAt || null,
        createdAt: p.createdAt
    }));

    return {
        invoices,
        pagination: {
            limit: limitNum,
            nextCursor,
            hasNextPage
        }
    };
}

module.exports = { getInvoices };

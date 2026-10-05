const { PaymentModel } = require('@src/models');

async function findPaymentByReference({ gatewayOrderId, gatewayPaymentId, merchantOrderId }) {
    const clauses = [];
    const orderIds = [gatewayOrderId, merchantOrderId].filter(Boolean);
    for (const id of orderIds) {
        clauses.push(
            { gatewayOrderId: id },
            { orderId: id },
            { razorpayOrderId: id },
            { cashfreeOrderId: id }
        );
    }
    if (gatewayPaymentId) {
        clauses.push(
            { gatewayPaymentId },
            { razorpayPaymentId: gatewayPaymentId },
            { cashfreePaymentId: gatewayPaymentId }
        );
    }
    if (!clauses.length) return null;
    return PaymentModel.findOne({ $or: clauses });
}

module.exports = { findPaymentByReference };

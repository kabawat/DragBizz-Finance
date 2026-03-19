const { PaymentModel } = require('@src/models');

function extractEntity(payload, entityType) {
    return payload[entityType]?.entity;
}

function extractRazorpayIds(paymentEntity) {
    return {
        razorpayPaymentId: paymentEntity.id,
        razorpayOrderId: paymentEntity.order_id
    };
}

async function findPaymentByOrderId(razorpayOrderId, additionalQuery = {}) {
    return PaymentModel.findOne({
        razorpayOrderId,
        ...additionalQuery
    });
}

async function findPaymentByPaymentId(razorpayPaymentId) {
    return PaymentModel.findOne({ razorpayPaymentId });
}

module.exports = {
    extractEntity,
    extractRazorpayIds,
    findPaymentByOrderId,
    findPaymentByPaymentId
};

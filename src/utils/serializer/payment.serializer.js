/**
 * Serialize payment order response
 * @param {Object} orderData - Order data
 * @returns {Object} - Serialized response
 */
function serializeOrderResponse(orderData) {
    return {
        orderId: orderData.orderId,
        razorpayOrderId: orderData.razorpayOrderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        status: orderData.payment?.status || 'PENDING',
        expiresAt: orderData.payment?.expiresAt
    };
}

/**
 * Serialize payment details
 * @param {Object} payment - Payment document
 * @returns {Object} - Serialized payment
 */
function serializePayment(payment) {
    if (!payment) return null;

    return {
        id: payment._id,
        orderId: payment.orderId,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        billingCycle: payment.billingCycle,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        package: payment.packageId ? {
            id: payment.packageId._id || payment.packageId,
            name: payment.packageId.name
        } : null
    };
}

/**
 * Serialize payment list
 * @param {Array} payments - Array of payments
 * @returns {Array} - Serialized payments
 */
function serializePaymentList(payments) {
    return payments.map(payment => serializePayment(payment));
}

module.exports = {
    serializeOrderResponse,
    serializePayment,
    serializePaymentList
};


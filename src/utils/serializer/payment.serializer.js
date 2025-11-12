/**
// Serialize payment order response
 */
function serializeOrderResponse(orderData) {
    const paymentStatus = orderData.payment?.status || orderData.status || 'PENDING';
    const requiresPayment = typeof orderData.requiresPayment === 'boolean'
        ? orderData.requiresPayment
        : (orderData.payment?.finalAmount ?? orderData.amount) > 0;

    return {
        orderId: orderData.orderId,
        razorpayOrderId: orderData.razorpayOrderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId || null,
        status: paymentStatus,
        expiresAt: orderData.payment?.expiresAt,
        requiresPayment
    };
}

// Serialize payment details
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

// Serialize payment list
function serializePaymentList(payments) {
    return payments.map(payment => serializePayment(payment));
}

module.exports = {
    serializeOrderResponse,
    serializePayment,
    serializePaymentList
};


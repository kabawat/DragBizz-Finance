function presentOrder(paymentDoc) {
    if (!paymentDoc) {
        throw new Error('Payment document is required to build order response');
    }

    const checkout = paymentDoc.checkout || {};
    const requiresPayment = (paymentDoc.finalAmount || 0) > 0;

    return {
        ...checkout,
        orderId: paymentDoc.orderId || null,
        gateway: paymentDoc.gateway || null,
        gatewayOrderId: paymentDoc.gatewayOrderId || checkout.gatewayOrderId || null,
        checkout,
        amount: paymentDoc.finalAmount || 0,
        currency: paymentDoc.currency || 'INR',
        status: paymentDoc.status || 'PENDING',
        requiresPayment,
        keyId: requiresPayment ? (checkout.keyId || null) : null,
        payment: paymentDoc
    };
}

module.exports = { presentOrder };

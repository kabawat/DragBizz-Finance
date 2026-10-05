function serializeOrderResponse(orderData) {
    // Defensive guard – if something went wrong upstream, avoid crashing the controller
    if (!orderData) {
        return {
            orderId: null,
            razorpayOrderId: null,
            gateway: null,
            gatewayOrderId: null,
            checkout: null,
            amount: 0,
            currency: 'INR',
            keyId: null,
            status: 'PENDING',
            expiresAt: null,
            requiresPayment: false
        };
    }

    const paymentStatus = orderData.payment?.status || orderData.status || 'PENDING';
    const requiresPayment =
        typeof orderData.requiresPayment === 'boolean'
            ? orderData.requiresPayment
            : (orderData.payment?.finalAmount ?? orderData.amount) > 0;
    const gateway = orderData.gateway || orderData.payment?.gateway || null;
    const sourceCheckout = orderData.checkout && typeof orderData.checkout === 'object'
        ? orderData.checkout
        : {};
    const checkout = { ...sourceCheckout, gateway };

    return {
        orderId: orderData.orderId,
        gateway,
        gatewayOrderId: orderData.gatewayOrderId || sourceCheckout.gatewayOrderId || null,
        checkout,
        razorpayOrderId: orderData.razorpayOrderId || sourceCheckout.razorpayOrderId || null,
        paymentSessionId: orderData.paymentSessionId || sourceCheckout.paymentSessionId || null,
        cashfreeOrderId: orderData.cashfreeOrderId || sourceCheckout.cashfreeOrderId || null,
        cashfreeMode: orderData.cashfreeMode || sourceCheckout.cashfreeMode || null,
        clientSecret: orderData.clientSecret || sourceCheckout.clientSecret || null,
        publishableKey: orderData.publishableKey || sourceCheckout.publishableKey || null,
        actionUrl: orderData.actionUrl || sourceCheckout.actionUrl || null,
        fields: orderData.fields || sourceCheckout.fields || null,
        accessKey: orderData.accessKey || sourceCheckout.accessKey || null,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId || sourceCheckout.keyId || null,
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
        gateway: payment.gateway || null,
        gatewayOrderId: payment.gatewayOrderId || null,
        gatewayPaymentId: payment.gatewayPaymentId || null,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        cashfreeOrderId: payment.cashfreeOrderId || null,
        cashfreePaymentId: payment.cashfreePaymentId || null,
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


function sanitizeCreateOrderData(data) {
    return {
        packageId: data.packageId?.trim(),
        months: data.months ? parseInt(data.months) : null,
        couponCode: data.couponCode?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        customerName: data.customerName?.trim() || data.name?.trim() || null,
        gateway: typeof data.gateway === 'string' ? data.gateway.trim() : null
    };
}

function sanitizeVerifyPaymentData(data) {
    return {
        orderId: data.orderId?.trim() || data.txnid?.trim() || null,
        gatewayOrderId: data.gatewayOrderId?.trim() || data.razorpayOrderId?.trim() || data.cashfreeOrderId?.trim() || null,
        gatewayPaymentId: data.gatewayPaymentId?.trim() || data.razorpayPaymentId?.trim() || data.mihpayid?.trim() || null,
        signature: data.signature?.trim() || data.razorpaySignature?.trim() || null,
        hash: data.hash?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        raw: data
    };
}

module.exports = {
    sanitizeCreateOrderData,
    sanitizeVerifyPaymentData
};

// Sanitize create order data
function sanitizeCreateOrderData(data) {
    return {
        packageId: data.packageId?.trim(),
        billingCycle: data.billingCycle?.toUpperCase().trim(),
        couponCode: data.couponCode?.trim() || null
    };
}

// Sanitize verify payment data
function sanitizeVerifyPaymentData(data) {
    return {
        razorpayOrderId: data.razorpayOrderId?.trim(),
        razorpayPaymentId: data.razorpayPaymentId?.trim(),
        razorpaySignature: data.razorpaySignature?.trim()
    };
}

module.exports = {
    sanitizeCreateOrderData,
    sanitizeVerifyPaymentData
};


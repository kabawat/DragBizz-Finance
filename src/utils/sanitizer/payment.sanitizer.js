function sanitizeCreateOrderData(data) {
    return {
        packageId: data.packageId?.trim(),
        months: data.months ? parseInt(data.months) : null,
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


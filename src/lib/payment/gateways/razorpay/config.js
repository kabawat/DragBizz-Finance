function readRazorpayConfig(secret) {
    return {
        keyId: secret.razorpay.keyId,
        keySecret: secret.razorpay.keySecret,
        webhookSecret: secret.razorpay.webhookSecret,
        mode: secret.razorpay.mode
    };
}

module.exports = { readRazorpayConfig };

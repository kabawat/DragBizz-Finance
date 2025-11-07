const crypto = require('crypto');
const SECRET = require('@config/env.config');

function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
        const secret = SECRET.razorpay.keySecret;
        const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        return expectedSignature === razorpaySignature;
    } catch (error) {
        console.error('Error verifying Razorpay signature:', error);
        return false;
    }
}

function verifyWebhookSignature(payload, signature) {
    try {
        const secret = SECRET.razorpay.webhookSecret;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        return expectedSignature === signature;
    } catch (error) {
        console.error('Error verifying Razorpay webhook signature:', error);
        return false;
    }
}

module.exports = {
    verifyPaymentSignature,
    verifyWebhookSignature
};


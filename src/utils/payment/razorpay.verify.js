const crypto = require('crypto');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');

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
        logger.error('Error verifying Razorpay signature', { error: error?.message, stack: error?.stack });
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
        logger.error('Error verifying Razorpay webhook signature', { error: error?.message, stack: error?.stack });
        return false;
    }
}

module.exports = {
    verifyPaymentSignature,
    verifyWebhookSignature
};


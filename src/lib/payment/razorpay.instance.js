const Razorpay = require('razorpay');
const SECRET = require('@config/env.config');

let razorpayInstance = null;

function getRazorpayInstance() {
    if (!razorpayInstance) {
        if (!SECRET.razorpay.keyId || !SECRET.razorpay.keySecret) {
            throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        }

        razorpayInstance = new Razorpay({
            key_id: SECRET.razorpay.keyId,
            key_secret: SECRET.razorpay.keySecret
        });
    }

    return razorpayInstance;
}

module.exports = getRazorpayInstance;


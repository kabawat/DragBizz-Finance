const { createOrder } = require('./create.service');
const { verifyPayment } = require('./verify.service');
const { getPaymentByOrderId, getPaymentByRazorpayId, getUserPayments } = require('./get.service');

// Exporting as a class with static methods for backward compatibility
class PaymentService {
    static async createOrder(orderData) {
        return createOrder(orderData);
    }

    static async verifyPayment(paymentData) {
        return verifyPayment(paymentData);
    }

    static async getPaymentByOrderId(orderId) {
        return getPaymentByOrderId(orderId);
    }

    static async getPaymentByRazorpayId(razorpayPaymentId) {
        return getPaymentByRazorpayId(razorpayPaymentId);
    }

    static async getUserPayments(userId, options = {}) {
        return getUserPayments(userId, options);
    }
}

module.exports = PaymentService;

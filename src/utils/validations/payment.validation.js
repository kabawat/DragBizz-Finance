const mongoose = require('mongoose');
const { BILLING_CYCLE } = require('@src/constants/enum/package.enum');

/**
 * Validate create order request
 * @param {Object} data - Request data
 * @returns {Object} - Validation result
 */
function validateCreateOrder(data) {
    const errors = {};

    // Validate packageId
    if (!data.packageId) {
        errors.packageId = 'Package ID is required';
    } else if (!mongoose.Types.ObjectId.isValid(data.packageId)) {
        errors.packageId = 'Invalid package ID format';
    }

    // Validate billingCycle
    if (!data.billingCycle) {
        errors.billingCycle = 'Billing cycle is required';
    } else if (!BILLING_CYCLE.includes(data.billingCycle)) {
        errors.billingCycle = `Billing cycle must be one of: ${BILLING_CYCLE.join(', ')}`;
    }

    // Validate couponCode (optional)
    if (data.couponCode && typeof data.couponCode !== 'string') {
        errors.couponCode = 'Coupon code must be a string';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Validate verify payment request
 * @param {Object} data - Request data
 * @returns {Object} - Validation result
 */
function validateVerifyPayment(data) {
    const errors = {};

    if (!data.razorpayOrderId) {
        errors.razorpayOrderId = 'Razorpay order ID is required';
    }

    if (!data.razorpayPaymentId) {
        errors.razorpayPaymentId = 'Razorpay payment ID is required';
    }

    if (!data.razorpaySignature) {
        errors.razorpaySignature = 'Razorpay signature is required';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

module.exports = {
    validateCreateOrder,
    validateVerifyPayment
};


const mongoose = require('mongoose');

const VALID_MONTHS = [1, 3, 6, 12, 18, 24, 36, 48];

function validateCreateOrder(data) {
    const errors = {};

    if (!data.packageId) {
        errors.packageId = 'Package ID is required';
    } else if (!mongoose.Types.ObjectId.isValid(data.packageId)) {
        errors.packageId = 'Invalid package ID format';
    }

    if (!data.months) {
        errors.months = 'Number of months is required';
    } else {
        const months = parseInt(data.months);
        if (isNaN(months) || months < 1) {
            errors.months = 'Months must be a positive number';
        } else if (!VALID_MONTHS.includes(months)) {
            errors.months = `Months must be one of: ${VALID_MONTHS.join(', ')}`;
    }
    }

    if (data.couponCode && typeof data.couponCode !== 'string') {
        errors.couponCode = 'Coupon code must be a string';
    }

    // Optional email validation
    if (data.email && typeof data.email === 'string' && data.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
            errors.email = 'Invalid email format';
        }
    }

    // Optional phone validation
    if (data.phone && typeof data.phone === 'string' && data.phone.trim()) {
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
        const cleanPhone = data.phone.replace(/\D/g, '');
        if (!phoneRegex.test(data.phone.trim()) || cleanPhone.length < 10) {
            errors.phone = 'Invalid phone number format';
        }
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


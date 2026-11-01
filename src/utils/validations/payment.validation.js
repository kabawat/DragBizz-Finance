const mongoose = require('mongoose');
const { getActiveGateway } = require('@src/lib/payment/gateway.factory');
const { normalizeGatewayId } = require('@src/lib/payment/registry');

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

    const gateway = getActiveGateway();
    if (data.gateway && normalizeGatewayId(data.gateway) !== gateway.id) {
        errors.gateway = `Payment gateway is configured as ${gateway.schemaId}`;
    }

    if (data.couponCode && typeof data.couponCode !== 'string') {
        errors.couponCode = 'Coupon code must be a string';
    } else if (data.couponCode && (data.couponCode.length > 50 || !/^[A-Za-z0-9_-]+$/.test(data.couponCode))) {
        errors.couponCode = 'Invalid coupon code format or length';
    }

    // Optional email validation
    if (data.email && typeof data.email === 'string' && data.email.trim()) {
        const email = data.email.trim();
        if (email.length > 255) {
            errors.email = 'Email exceeds maximum length';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.email = 'Invalid email format';
            }
        }
    }

    // Optional phone validation
    if (data.phone && typeof data.phone === 'string' && data.phone.trim()) {
        const phoneStr = data.phone.trim();
        if (phoneStr.length > 20) {
            errors.phone = 'Phone number exceeds maximum length';
        } else {
            const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,20}$/;
            const cleanPhone = phoneStr.replace(/\D/g, '');
            if (!phoneRegex.test(phoneStr) || cleanPhone.length < 10) {
                errors.phone = 'Invalid phone number format';
            }
        }
    }

    if (gateway.requiresCustomerPhone && !errors.phone && !data.phone) {
        errors.phone = 'Phone number is required';
    }
    if (gateway.requiresCustomerEmail && !errors.email && !data.email) {
        errors.email = 'Email is required';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Validate verify payment request
function validateVerifyPayment(data) {
    return getActiveGateway().validateVerificationInput(data);
}

module.exports = {
    validateCreateOrder,
    validateVerifyPayment
};


// Payment Status Enum
const PAYMENT_STATUS = [
    'PENDING',      // Payment initiated but not completed
    'PROCESSING',   // Payment is being processed
    'SUCCESS',      // Payment successful
    'FAILED',       // Payment failed
    'CANCELLED',    // Payment cancelled by user
    'REFUNDED',     // Payment refunded
    'PARTIALLY_REFUNDED' // Partial refund
];

// Payment Gateway Enum
const PAYMENT_GATEWAY = ['RAZORPAY', 'STRIPE', 'CASHFREE', 'PAYU', 'EASEBUZZ', 'INTERNAL'];

// Refund Status Enum
const REFUND_STATUS = [
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'FAILED'
];

module.exports = {
    PAYMENT_STATUS,
    PAYMENT_GATEWAY,
    REFUND_STATUS
};


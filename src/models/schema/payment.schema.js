const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_GATEWAY, REFUND_STATUS } = require('@src/constants/enum/payment.enum');

const paymentSchema = new mongoose.Schema({
    // User Information
    userId: {
        type: String,
        required: true,
        index: true
    },

    agencyId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true
    },

    // Package Information
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        required: true,
        index: true
    },

    // Subscription Reference (if payment successful)
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        default: null,
        index: true
    },

    // Order Information
    orderId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },

    // Internal payment identifier (ensures uniqueness for existing indexes)
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        unique: true,
        index: true
    },

    // Razorpay Specific Fields
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    razorpayPaymentId: {
        type: String,
        default: null,
        index: true
    },
    razorpaySignature: {
        type: String,
        default: null
    },

    // Payment Details
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR'],
        required: true
    },

    // Amount Breakdown
    baseAmount: {
        type: Number,
        required: true,
        min: 0
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    finalAmount: {
        type: Number,
        required: true,
        min: 0
    },

    // Billing Information
    billingCycle: {
        type: String,
        required: true,
        enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'],
        index: true
    },
    months: {
        type: Number,
        required: true,
        min: 1,
        index: true
    },

    // Payment Status
    status: {
        type: String,
        enum: PAYMENT_STATUS,
        default: 'PENDING',
        required: true,
        index: true
    },

    // Gateway Information
    gateway: {
        type: String,
        enum: PAYMENT_GATEWAY,
        default: 'RAZORPAY',
        required: true
    },

    // Payment Method
    paymentMethod: {
        type: String,
        default: null // card, netbanking, upi, wallet, etc.
    },

    // Coupon/Discount
    couponCode: {
        type: String,
        default: null,
        index: true
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    gstPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Razorpay Response Data
    razorpayResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Failure Information
    failureReason: {
        type: String,
        default: null
    },
    failureCode: {
        type: String,
        default: null
    },

    // Refund Information
    refundAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    refundStatus: {
        type: String,
        enum: REFUND_STATUS,
        default: null
    },
    refundedAt: {
        type: Date,
        default: null
    },

    // Receipt
    receipt: {
        type: String,
        default: null
    },

    // Notes
    notes: {
        type: String,
        maxlength: 500,
        default: null
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Timestamps
    paidAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null // Order expiry time
    }
}, {
    timestamps: true,
    strict: 'throw'
});

// Indexes for better query performance
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ agencyId: 1, status: 1 });
paymentSchema.index({ packageId: 1, status: 1 });

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ agencyId: 1, createdAt: -1 });

// Ensure idempotency key is unique per user to prevent exact-millisecond race conditions
paymentSchema.index(
    { 'metadata.idempotencyKey': 1, userId: 1 },
    { unique: true, partialFilterExpression: { 'metadata.idempotencyKey': { $type: 'string' } } }
);

// Virtual for checking if payment is successful
paymentSchema.virtual('isSuccessful').get(function () {
    return this.status === 'SUCCESS';
});

// Virtual for checking if payment is refunded
paymentSchema.virtual('isRefunded').get(function () {
    return this.status === 'REFUNDED' || this.status === 'PARTIALLY_REFUNDED';
});

module.exports = paymentSchema;


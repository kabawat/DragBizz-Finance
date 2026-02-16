const mongoose = require('mongoose');
const { SUBSCRIPTION_STATUS } = require('@src/constants/enum/payment.enum');

const subscriptionSchema = new mongoose.Schema({
    // User Information
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Package Information
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        required: true,
        index: true
    },

    // Payment Reference
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
        index: true
    },

    // Subscription Status
    status: {
        type: String,
        enum: SUBSCRIPTION_STATUS,
        default: 'PENDING',
        required: true,
        index: true
    },

    // Billing Information
    billingCycle: {
        type: String,
        required: true,
        enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'],
        index: true
    },

    // Subscription Dates
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    trialEndDate: {
        type: Date,
        default: null
    },

    // Auto-renewal
    autoRenew: {
        type: Boolean,
        default: true,
        index: true
    },
    nextBillingDate: {
        type: Date,
        default: null,
        index: true
    },

    // Cancellation
    cancelledAt: {
        type: Date,
        default: null
    },
    cancellationReason: {
        type: String,
        maxlength: 500,
        default: null
    },

    // Features (snapshot at subscription time)
    features: [{
        featureKey: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        featureName: {
            type: String,
            trim: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        usageLimits: {
            usageType: {
                type: String,
                enum: ['DAILY_FIXED', 'DAILY_ROLLING', 'MONTHLY_TOTAL', 'TOTAL', 'UNLIMITED'],
                default: 'UNLIMITED'
            },
            totalLimit: {
                type: Number,
                default: null
            },
            customDailyLimit: {
                type: Number,
                default: null
            }
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],

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
    maxSubscribersSnapshot: {
        type: Number,
        default: null
    }
}, {
    timestamps: true,
    strict: 'throw'
});

// Indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ packageId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, endDate: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ createdAt: -1 });

// Compound index for optimized active subscription queries
// This index optimizes the query: findOne({ userId, status: { $in: ['ACTIVE', 'TRIAL'] }, startDate: { $lte: now }, endDate: { $gte: now } })
subscriptionSchema.index({ userId: 1, status: 1, startDate: 1, endDate: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function () {
    const now = new Date();
    return this.status === 'ACTIVE' &&
        this.startDate <= now &&
        this.endDate >= now;
});

// Virtual for checking if subscription is expired
subscriptionSchema.virtual('isExpired').get(function () {
    const now = new Date();
    return this.endDate < now;
});

// Virtual for checking if subscription is in trial
subscriptionSchema.virtual('isTrial').get(function () {
    const now = new Date();
    return this.trialEndDate && this.trialEndDate > now;
});

// Pre-save hook to set end date based on billing cycle
subscriptionSchema.pre('save', function (next) {
    if (this.isNew && this.startDate && this.billingCycle && !this.endDate) {
        const startDate = new Date(this.startDate);
        let endDate = new Date(startDate);

        switch (this.billingCycle) {
            case 'MONTHLY':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case 'QUARTERLY':
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            case 'YEARLY':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            case 'ONE_TIME':
                // For one-time, set end date far in future or based on package
                endDate.setFullYear(endDate.getFullYear() + 100);
                break;
        }

        this.endDate = endDate;
    }

    next();
});

module.exports = subscriptionSchema;


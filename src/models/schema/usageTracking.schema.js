const mongoose = require('mongoose');

/**
 * Usage Tracking Schema
 * Tracks daily and monthly usage of features per subscription
 */
const usageTrackingSchema = new mongoose.Schema({
    // Subscription Reference
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true,
        index: true
    },

    // User Reference (for quick queries)
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Feature Key (e.g., 'invoice_management', 'product_management')
    featureKey: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    // Date tracking (YYYY-MM-DD format for daily, YYYY-MM for monthly)
    date: {
        type: String,
        required: true,
        index: true
    },

    // Usage count for this date
    count: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },

    // Month for monthly tracking (YYYY-MM format)
    month: {
        type: String,
        required: true,
        index: true
    },

    // Year for yearly tracking
    year: {
        type: Number,
        required: true,
        index: true
    },

    // Metadata (can store additional info like storeId, etc.)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    strict: 'throw'
});

// Compound indexes for efficient queries
usageTrackingSchema.index({ subscriptionId: 1, featureKey: 1, date: 1 }, { unique: true });
usageTrackingSchema.index({ subscriptionId: 1, featureKey: 1, month: 1 });
usageTrackingSchema.index({ userId: 1, featureKey: 1, date: 1 });
usageTrackingSchema.index({ userId: 1, featureKey: 1, month: 1 });

// Pre-save hook to set month and year from date
usageTrackingSchema.pre('save', function (next) {
    if (this.date) {
        const dateParts = this.date.split('-');
        if (dateParts.length >= 2) {
            this.month = `${dateParts[0]}-${dateParts[1]}`;
            this.year = parseInt(dateParts[0], 10);
        }
    }
    next();
});

module.exports = usageTrackingSchema;


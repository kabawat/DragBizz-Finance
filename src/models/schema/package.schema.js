const { PACKAGE_STATUS, CURRENCIES } = require('@src/constants/enum/package.enum');
const mongoose = require('mongoose');

// Package-specific feature configuration (limit, enabled for this package)
const PackageFeatureSchema = new mongoose.Schema({
    feature: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feature',
        required: true,
        index: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    limit: {
        type: Number,
        default: null // null means unlimited
    },
    unit: {
        type: String,
        trim: true // e.g., "stores", "users", "products", "GB"
    }
}, { _id: false });

const DurationPricingSchema = new mongoose.Schema({
    months: {
        type: Number,
        required: true,
        enum: [1, 3, 6, 12, 18, 24, 36, 48],
        index: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    discountedPrice: {
        type: Number,
        min: 0
    }
}, { _id: false });

const PricingSchema = new mongoose.Schema({
    currency: {
        type: String,
        default: 'INR',
        enum: CURRENCIES
    },
    setupFee: {
        type: Number,
        default: 0,
        min: 0
    },
    gstPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    durationPricing: {
        type: [DurationPricingSchema],
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'At least one duration pricing is required'
        }
    }
}, { _id: false });

const packageSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true,
        unique: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: 200
    },

    // Pricing Information
    pricing: {
        type: PricingSchema,
        required: true
    },

    // Features - Reference to Feature model with package-specific config
    features: {
        type: [PackageFeatureSchema],
        default: []
    },

    // Plan Metadata
    planType: {
        type: String,
        enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'],
        default: 'BASIC',
        index: true
    },
    displayOrder: {
        type: Number,
        default: 0,
        index: true
    },
    isPopular: {
        type: Boolean,
        default: false,
        index: true
    },
    isRecommended: {
        type: Boolean,
        default: false,
        index: true
    },

    // Status and Visibility
    status: {
        type: String,
        enum: PACKAGE_STATUS,
        default: PACKAGE_STATUS[0],
        index: true
    },
    isVisible: {
        type: Boolean,
        default: true,
        index: true
    },

    // Limits and Restrictions
    maxStores: {
        type: Number,
        default: 1,
        min: 0
    },
    maxUsers: {
        type: Number,
        default: 1,
        min: 0
    },
    maxProducts: {
        type: Number,
        default: null, // null means unlimited
        min: 0
    },
    maxStorage: {
        type: Number,
        default: null, // in GB, null means unlimited
        min: 0
    },

    // Trial Information
    trialPeriod: {
        enabled: {
            type: Boolean,
            default: false
        },
        days: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    // Tags and Metadata
    tags: {
        type: [String],
        default: [],
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        select: false
    },

    // Soft Delete
    deletedAt: {
        type: Date,
        default: null
    },

    __v: {
        type: Number,
        select: false
    }
}, {
    timestamps: true,
    strict: 'throw'
});

// Text index for search
packageSchema.index({
    name: "text",
    description: "text",
    shortDescription: "text",
    tags: "text"
}, {
    name: "package_text_idx",
    default_language: "english",
    weights: { name: 5, shortDescription: 3, description: 2, tags: 1 }
});

// Composite indexes for common query patterns
packageSchema.index({ status: 1, isVisible: 1, displayOrder: 1 }, { name: "package_status_visible_order_idx" });
packageSchema.index({ planType: 1, status: 1 }, { name: "package_type_status_idx" });
packageSchema.index({ isPopular: 1, status: 1 }, { name: "package_popular_status_idx" });
packageSchema.index({ createdAt: -1 }, { name: "package_created_desc_idx" });
packageSchema.index({ 'features.feature': 1 }, { name: "package_features_idx" });

packageSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    if (this.pricing && this.pricing.durationPricing && this.isModified('pricing')) {
        this.pricing.durationPricing.forEach(duration => {
            if (duration.discount > 0) {
                duration.discountedPrice = duration.price - (duration.price * duration.discount / 100);
        } else {
                duration.discountedPrice = duration.price;
        }
        });
    }

    next();
});

// Virtual for checking if plan is active
packageSchema.virtual('isActive').get(function () {
    return this.status === 'ACTIVE' && this.isVisible && !this.deletedAt;
});

module.exports = packageSchema;

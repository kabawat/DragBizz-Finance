const { PACKAGE_STATUS } = require('@src/constants/enum/package.enum');
const mongoose = require('mongoose');

const PricingSchema = new mongoose.Schema({
    months: {
        type: Number,
        required: true,
        default: 1
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    discountedPrice: {
        type: Number,
        default: 0
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
        type: [PricingSchema],
        required: true,
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'At least one pricing option is required'
        }
    },

    featureUsageLimits: [{
        featureKey: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        usageType: {
            type: String,
            enum: ['DAILY_FIXED', 'DAILY_ROLLING', 'MONTHLY_TOTAL', 'TOTAL', 'UNLIMITED'],
            default: 'UNLIMITED'
        },
        totalLimit: {
            type: Number,
            default: null,
            min: 0
        },
        customDailyLimit: {
            type: Number,
            default: null,
            min: 0
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],

    highlights: {
        type: [String],
        default: []
    },

    // Plan Metadata
    planType: {
        type: String,
        enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'],
        default: 'BASIC',
        index: true
    },
    label: {
        type: String,
        trim: true,
        maxlength: 50
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

    // AI Feature Support (Package Level)
    isAIFeature: {
        type: Boolean,
        default: false,
        index: true,
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

    // Purchase Limit
    maxSubscribers: {
        type: Number,
        default: null,
        min: 0
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
packageSchema.index({ featureUsageLimits: 1 }, { name: "package_features_idx" });

packageSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    if (Array.isArray(this.pricing) && this.isModified('pricing')) {
        this.pricing.forEach(pricingOption => {
            if (pricingOption.discount > 0) {
                pricingOption.discountedPrice = pricingOption.price - (pricingOption.price * pricingOption.discount / 100);
            } else {
                pricingOption.discountedPrice = pricingOption.price;
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

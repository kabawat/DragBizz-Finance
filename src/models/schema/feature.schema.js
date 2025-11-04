// models/schema/feature.schema.js
const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    category: {
        type: String,
        trim: true,
        index: true
    },
    icon: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        select: false
    },
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
featureSchema.index({
    name: "text",
    description: "text",
    category: "text"
}, {
    name: "feature_text_idx",
    default_language: "english",
    weights: { name: 5, category: 3, description: 2 }
});

// Indexes
featureSchema.index({ isActive: 1, category: 1 }, { name: "feature_active_category_idx" });
featureSchema.index({ createdAt: -1 }, { name: "feature_created_desc_idx" });

module.exports = featureSchema;


const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        index: true
    },
    entityType: {
        type: String,
        required: true,
        enum: ['PAYMENT'],
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false,
    strict: 'throw'
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = auditLogSchema;


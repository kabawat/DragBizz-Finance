const mongoose = require('mongoose');

const PAYMENT_WEBHOOK_STATUS = [
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
];

const paymentWebhookEventSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
            trim: true,
        },
        eventId: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            default: null,
            trim: true,
        },
        status: {
            type: String,
            enum: PAYMENT_WEBHOOK_STATUS,
            default: 'RECEIVED',
            index: true,
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        error: {
            type: String,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        strict: 'throw',
    }
);

paymentWebhookEventSchema.index(
    { provider: 1, eventId: 1 },
    { unique: true }
);

module.exports = paymentWebhookEventSchema;

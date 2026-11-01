const mongoose = require('mongoose');

const RETAIL_WEBHOOK_EVENT_STATUS = [
    'RECEIVED',
    'VERIFIED',
    'IGNORED',
    'REJECTED',
    'PROCESSED',
    'FAILED',
];

const retailWebhookEventSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        dedupeKey: {
            type: String,
            required: true,
            immutable: true,
        },
        providerEventId: {
            type: String,
            default: null,
            index: true,
        },
        eventType: {
            type: String,
            default: null,
            index: true,
        },
        financeAttemptId: {
            type: String,
            default: null,
        },
        intentId: {
            type: String,
            default: null,
        },
        collectLinkId: {
            type: String,
            default: null,
        },
        gatewayOrderId: {
            type: String,
            default: null,
            index: true,
        },
        gatewayPaymentId: {
            type: String,
            default: null,
            index: true,
        },

        status: {
            type: String,
            enum: RETAIL_WEBHOOK_EVENT_STATUS,
            default: 'RECEIVED',
            required: true,
        },
        signatureValid: {
            type: Boolean,
            default: false,
            index: true,
        },
        verificationError: {
            type: String,
            default: null,
            maxlength: 2000,
        },
        processingError: {
            type: String,
            default: null,
            maxlength: 2000,
        },
        deliveryCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        payloadHash: {
            type: String,
            default: null,
        },
        payloadSizeBytes: {
            type: Number,
            default: null,
            min: 0,
        },
        occurredAt: {
            type: Date,
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        // Fetch intentionally only for audit/reconciliation. Webhook handlers
        // should keep raw bodies size-limited before inserting this field.
        rawPayload: {
            type: String,
            default: null,
            select: false,
        },
        normalizedPayload: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
            select: false,
        },
        // Optional TTL hook for a later retention policy. Null means retain.
        retentionExpiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        strict: 'throw',
    }
);

retailWebhookEventSchema.index(
    { provider: 1, dedupeKey: 1 },
    { unique: true, name: 'retail_webhook_provider_dedupe_unique' }
);
retailWebhookEventSchema.index({ financeAttemptId: 1, createdAt: -1 });
retailWebhookEventSchema.index({ status: 1, createdAt: -1 });
retailWebhookEventSchema.index({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = retailWebhookEventSchema;
module.exports.RETAIL_WEBHOOK_EVENT_STATUS = RETAIL_WEBHOOK_EVENT_STATUS;

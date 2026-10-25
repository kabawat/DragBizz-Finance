const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const CORE_SETTLEMENT_OUTBOX_STATUS = ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED'];

function isSafePositiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

const coreSettlementOutboxSchema = new mongoose.Schema(
    {
        // The same settlement ID must be sent on every retry. Core uses it (and
        // gatewayPaymentId) as an idempotency boundary.
        settlementId: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
            default: () => randomUUID(),
        },
        financeAttemptId: {
            type: String,
            required: true,
            immutable: true,
        },
        intentId: {
            type: String,
            default: null,
            immutable: true,
        },
        collectLinkId: {
            type: String,
            default: null,
            immutable: true,
        },
        provider: {
            type: String,
            required: true,
            immutable: true,
            uppercase: true,
            trim: true,
        },
        gatewayOrderId: {
            type: String,
            default: null,
            immutable: true,
        },
        gatewayPaymentId: {
            type: String,
            required: true,
            immutable: true,
        },
        gatewayEventId: {
            type: String,
            default: null,
            immutable: true,
        },
        amountPaise: {
            type: Number,
            required: true,
            immutable: true,
            min: 1,
            validate: {
                validator: isSafePositiveInteger,
                message: 'amountPaise must be a positive safe integer',
            },
        },
        currency: {
            type: String,
            required: true,
            default: 'INR',
            immutable: true,
            uppercase: true,
            trim: true,
            maxlength: 3,
        },
        paymentMethod: {
            type: String,
            default: null,
            immutable: true,
            maxlength: 64,
        },
        paidAt: {
            type: Date,
            required: true,
            immutable: true,
        },

        status: {
            type: String,
            enum: CORE_SETTLEMENT_OUTBOX_STATUS,
            default: 'PENDING',
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxAttempts: {
            type: Number,
            default: 12,
            min: 1,
            max: 100,
        },
        nextAttemptAt: {
            type: Date,
            default: Date.now,
        },
        lockedAt: {
            type: Date,
            default: null,
        },
        lockToken: {
            type: String,
            default: null,
            select: false,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        failedAt: {
            type: Date,
            default: null,
        },
        lastError: {
            type: String,
            default: null,
            maxlength: 2000,
        },
        // A minimal Core acknowledgement; normal queries do not load it.
        coreResponse: {
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

coreSettlementOutboxSchema.pre('validate', function validateCoreIntent(next) {
    if (!this.intentId && !this.collectLinkId) {
        this.invalidate('intentId', 'Either intentId or collectLinkId is required');
    }
    next();
});

// One completed gateway payment produces one durable Core settlement event.
coreSettlementOutboxSchema.index(
    { financeAttemptId: 1 },
    { unique: true, name: 'core_settlement_one_per_finance_attempt' }
);
coreSettlementOutboxSchema.index(
    { provider: 1, gatewayPaymentId: 1 },
    { unique: true, name: 'core_settlement_provider_payment_unique' }
);
coreSettlementOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
coreSettlementOutboxSchema.index({ status: 1, lockedAt: 1 });
coreSettlementOutboxSchema.index({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = coreSettlementOutboxSchema;
module.exports.CORE_SETTLEMENT_OUTBOX_STATUS = CORE_SETTLEMENT_OUTBOX_STATUS;

const mongoose = require('mongoose');

const INVOICE_JOB_STATUS = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'];

const invoiceJobSchema = new mongoose.Schema(
    {
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Payment',
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        userId: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: INVOICE_JOB_STATUS,
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
            default: 5,
            min: 1,
        },
        // When the job should next be attempted
        nextRunAt: {
            type: Date,
            default: Date.now,
        },
        // Optimistic locking: set when a worker claims the job
        lockedAt: {
            type: Date,
            default: null,
        },
        lockToken: {
            type: String,
            default: null,
        },
        // R2 object key after successful upload
        r2Key: {
            type: String,
            default: null,
        },
        errorMessage: {
            type: String,
            default: null,
            maxlength: 2000,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        strict: true,
    }
);

// Compound index for worker polling — only query PENDING/PROCESSING jobs ready to run
invoiceJobSchema.index({ status: 1, nextRunAt: 1 });

// One job per payment — idempotency
invoiceJobSchema.index({ paymentId: 1 }, { unique: true });

// Stale-lock recovery: find jobs locked too long
invoiceJobSchema.index({ lockedAt: 1, status: 1 });

module.exports = invoiceJobSchema;


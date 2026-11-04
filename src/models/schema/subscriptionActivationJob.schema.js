const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  paymentId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING', index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 20 },
  nextRunAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null },
  lockToken: { type: String, default: null },
  subscriptionId: { type: String, default: null },
  errorMessage: { type: String, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ status: 1, nextRunAt: 1 });

module.exports = schema;

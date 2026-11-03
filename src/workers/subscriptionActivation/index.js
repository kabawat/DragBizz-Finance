const { randomUUID } = require('crypto');
const { SubscriptionActivationJobModel, PaymentModel } = require('@src/models');
const { createSubscription } = require('@src/services/subscription');
const logger = require('@src/utils/logger');

const POLL_MS = Number(process.env.SUBSCRIPTION_ACTIVATION_POLL_MS || 10000);
const LOCK_TTL_MS = 5 * 60 * 1000;
const MAX_BACKOFF_MS = 30 * 60 * 1000;
let timer;
let stopping = false;

function backoff(attempt) {
  return Math.min(MAX_BACKOFF_MS, 5000 * (2 ** Math.min(attempt, 10)));
}

async function processJob(job) {
  try {
    const payment = await PaymentModel.findById(job.paymentId);
    if (!payment) throw new Error(`Payment ${job.paymentId} not found`);
    if (payment.status !== 'SUCCESS') throw new Error(`Payment is ${payment.status}, not SUCCESS`);
    if (payment.subscriptionId) {
      await SubscriptionActivationJobModel.updateOne(
        { _id: job._id, lockToken: job.lockToken },
        { $set: { status: 'COMPLETED', subscriptionId: payment.subscriptionId, completedAt: new Date(), lockedAt: null, lockToken: null } }
      );
      return;
    }

    const result = await createSubscription(payment);
    await PaymentModel.updateOne(
      { _id: payment._id, status: 'SUCCESS', subscriptionId: { $exists: false } },
      { $set: { subscriptionId: result.subscriptionId, subscriptionType: result.operationType, 'activationIntent.status': 'COMPLETED' } }
    );
    await SubscriptionActivationJobModel.updateOne(
      { _id: job._id, lockToken: job.lockToken },
      { $set: { status: 'COMPLETED', subscriptionId: result.subscriptionId, completedAt: new Date(), lockedAt: null, lockToken: null }, $inc: { attempts: 1 } }
    );
  } catch (error) {
    const attempts = (job.attempts || 0) + 1;
    const terminal = attempts >= (job.maxAttempts || 20);
    await SubscriptionActivationJobModel.updateOne(
      { _id: job._id, lockToken: job.lockToken },
      { $set: { status: terminal ? 'FAILED' : 'PENDING', nextRunAt: terminal ? null : new Date(Date.now() + backoff(attempts)), errorMessage: String(error.message).slice(0, 2000), lockedAt: null, lockToken: null }, $inc: { attempts: 1 } }
    );
    logger.error('[SubscriptionActivationWorker] Job failed', { jobId: job._id, paymentId: job.paymentId, attempts, terminal, error: error.message });
  }
}

async function runBatch() {
  if (stopping) return;
  // Recovery for the crash window between marking a payment SUCCESS and
  // inserting its activation job.
  const unsettled = await PaymentModel.find({
    status: 'SUCCESS',
    packageId: { $exists: true, $ne: null },
    $or: [{ subscriptionId: { $exists: false } }, { subscriptionId: null }],
  }).select('_id').limit(100).lean();
  if (unsettled.length) {
    await SubscriptionActivationJobModel.bulkWrite(unsettled.map(({ _id }) => ({
      updateOne: {
        filter: { paymentId: _id },
        update: { $setOnInsert: { paymentId: _id, idempotencyKey: `subscription-activation:${_id}`, status: 'PENDING', nextRunAt: new Date() } },
        upsert: true,
      },
    })));
  }
  await SubscriptionActivationJobModel.updateMany(
    { status: 'PROCESSING', lockedAt: { $lt: new Date(Date.now() - LOCK_TTL_MS) } },
    { $set: { status: 'PENDING', lockedAt: null, lockToken: null, nextRunAt: new Date(), errorMessage: 'Recovered stale lock' } }
  );
  // Failed jobs are a dead-letter state, but can be safely retried after the
  // configured cooldown; the paymentId/Core idempotency prevents duplication.
  if (process.env.SUBSCRIPTION_ACTIVATION_AUTO_REQUEUE_FAILED === 'true') {
    await SubscriptionActivationJobModel.updateMany(
      { status: 'FAILED', updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
      { $set: { status: 'PENDING', nextRunAt: new Date(), attempts: 0, errorMessage: 'Automatic dead-letter retry' } }
    );
  }
  const job = await SubscriptionActivationJobModel.findOneAndUpdate(
    { status: 'PENDING', nextRunAt: { $lte: new Date() }, $expr: { $lt: ['$attempts', '$maxAttempts'] } },
    { $set: { status: 'PROCESSING', lockedAt: new Date(), lockToken: randomUUID() } },
    { new: true, sort: { nextRunAt: 1 } }
  );
  if (job) await processJob(job);
}

function startWorker() {
  if (timer) return;
  stopping = false;
  runBatch().catch((error) => logger.error('[SubscriptionActivationWorker] Batch failed', { error: error.message }));
  timer = setInterval(() => runBatch().catch((error) => logger.error('[SubscriptionActivationWorker] Batch failed', { error: error.message })), POLL_MS);
  if (timer.unref) timer.unref();
  logger.info('[SubscriptionActivationWorker] Started', { pollMs: POLL_MS });
}

async function stopWorker() {
  stopping = true;
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startWorker, stopWorker, runBatch };

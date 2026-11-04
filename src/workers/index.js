const invoiceWorker = require('./invoice');
const settlementWorker = require('./settlement');
const reconWorker = require('./reconciliation');
const logger = require('@src/utils/logger');
const subscriptionActivationWorker = require('./subscriptionActivation');

function startWorkers() {
    logger.info('[Workers] Starting background workers...');
    invoiceWorker.startWorker();
    settlementWorker.startWorker();
    reconWorker.startWorker();
    subscriptionActivationWorker.startWorker();
}

async function stopWorkers() {
    logger.info('[Workers] Stopping background workers...');
    await Promise.all([
        invoiceWorker.stopWorker(),
        settlementWorker.stopWorker(),
        reconWorker.stopWorker(),
        subscriptionActivationWorker.stopWorker(),
    ]);
}

module.exports = { startWorkers, stopWorkers };

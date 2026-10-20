const { startWorker, stopWorker } = require('./invoiceJob.worker');
const logger = require('@src/utils/logger');

function startWorkers() {
    logger.info('[Workers] Starting background workers...');
    startWorker();
}

async function stopWorkers() {
    logger.info('[Workers] Stopping background workers...');
    await stopWorker();
}

module.exports = { startWorkers, stopWorkers };


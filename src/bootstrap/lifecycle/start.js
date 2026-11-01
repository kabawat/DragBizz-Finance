const logger = require('@src/utils/logger');
const { onPaymentSettled } = require('@src/services/payment/subscription/hooks.service');
const { activateSubscription } = require('@src/services/payment/subscription/activate.service');
const { scheduleInvoicePdf } = require('@src/services/billing/invoice.pdf.service');
const { connectDB } = require('@src/bootstrap/database');
const { connectRedis } = require('@config/redis.config');
const { startGrpc } = require('@src/bootstrap/grpc/server');
const { initializeGrpcClients } = require('@src/bootstrap/grpc/clients');
const { startHttp } = require('@src/bootstrap/http/server');
const { startWorkers } = require('@src/workers');

async function startApp() {
  try {
    onPaymentSettled(activateSubscription);
    onPaymentSettled(scheduleInvoicePdf);

    await connectDB();
    await connectRedis();

    await startGrpc();
    await initializeGrpcClients();
    await startHttp();

    startWorkers();
  } catch (error) {
    logger.error('Failed to start finance service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

module.exports = {
  startApp,
};

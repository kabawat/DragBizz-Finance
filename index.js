require('module-alias/register');
const { onPaymentSettled } = require('@src/services/payment/hooks');
const { activateCoreSubscriptionAfterPayment } = require('@src/services/payment/activate-core-subscription.service');
const { scheduleInvoicePdf } = require('@src/services/billing/invoice.pdf.service');
onPaymentSettled(activateCoreSubscriptionAfterPayment);
onPaymentSettled(scheduleInvoicePdf);

const server = require('@src/app');
const mongoose = require('mongoose');
const { connectDB } = require('@config/database.config');
const { connectRedis, disconnectRedis } = require('@config/redis.config');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');
const retailerGrpcClient = require('@src/lib/grpc/clients/retailer/retailer.client');
const utilityGrpcClient = require('@src/lib/grpc/clients/utility/utility.client');
const { startWorkers, stopWorkers } = require('@src/workers');

function logBootstrap({ httpHost, httpPort, connected }) {
  console.log(`HTTP server running (${httpHost}:${httpPort})`);
  console.log(`Connected services: ${connected.length ? connected.join(', ') : 'none'}`);
}

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    const connected = [];
    try {
      retailerGrpcClient.initialize();
      await retailerGrpcClient.waitForReady(SECRET.ENVIRONMENT === 'production' ? 10 : 5);
      connected.push(`core (${retailerGrpcClient.getAddress()})`);
    } catch (_error) {
      if (SECRET.ENVIRONMENT === 'production') {
        throw _error;
      }
    }

    try {
      utilityGrpcClient.initialize();
      await utilityGrpcClient.waitForReady(SECRET.ENVIRONMENT === 'production' ? 10 : 5);
      connected.push(`utility (${utilityGrpcClient.getAddress()})`);
    } catch (_error) {
      if (SECRET.ENVIRONMENT === 'production') {
        throw _error;
      }
    }

    const httpHost = '0.0.0.0';
    const httpPort = SECRET.server.port;

    await new Promise((resolve) => {
      server?.listen(httpPort, () => resolve());
    });

    logBootstrap({
      httpHost,
      httpPort,
      connected,
    });

    // Start background workers after server is up
    startWorkers();
  } catch (err) {
    logger.error('Connection error', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

const gracefulShutdown = async () => {
  try {
    // Stop background workers first (waits for in-flight jobs up to 30s)
    await stopWorkers();

    await disconnectRedis();
    await mongoose.connection.close();

    server?.close(() => {
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown());
process.on('SIGTERM', () => gracefulShutdown());

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown();
});

startServer().catch((e) => {
  logger.error('Error starting finance service', { error: e.message, stack: e.stack });
  process.exit(1);
});

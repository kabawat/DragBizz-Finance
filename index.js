require('module-alias/register');
const { onPaymentSettled } = require('@src/services/payment/hooks');
const { activateSubscriptionAfterPayment } = require('@src/services/subscription/activate-from-payment.service');
onPaymentSettled(activateSubscriptionAfterPayment);

const server = require('@src/app');
const mongoose = require('mongoose');
const { connectDB } = require('@config/database.config');
const { connectRedis, disconnectRedis } = require('@config/redis.config');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');
const retailerGrpcClient = require('@src/lib/grpc/clients/retailer/retailer.client');

function logBootstrap({ httpHost, httpPort, grpcHost, grpcPort, connected }) {
  console.log(`HTTP server running (${httpHost}:${httpPort})`);
  console.log(`gRPC server running (${grpcHost}:${grpcPort})`);
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

    const grpcServer = require('@src/lib/grpc/server');
    const grpcInfo = await grpcServer.initialize();

    const httpHost = '0.0.0.0';
    const httpPort = SECRET.server.port;

    await new Promise((resolve) => {
      server?.listen(httpPort, () => resolve());
    });

    logBootstrap({
      httpHost,
      httpPort,
      grpcHost: grpcInfo.host,
      grpcPort: grpcInfo.port,
      connected,
    });
  } catch (err) {
    logger.error('Connection error', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

const gracefulShutdown = async () => {
  try {
    const grpcServer = require('@src/lib/grpc/server');
    await grpcServer.shutdown();
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
  logger.error('Error starting subscription service', { error: e.message, stack: e.stack });
  process.exit(1);
});

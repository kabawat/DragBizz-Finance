const { subscriptionClient, paymentClient } = require('@src/lib/grpc/clients/retailer');
const utilityGrpcClient = require('@src/lib/grpc/clients/utility/utility.client');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');

async function initializeGrpcClients() {
  const connected = [];
  const isProduction = SECRET.ENVIRONMENT === 'production';
  const timeout = isProduction ? 10 : 5;

  try {
    subscriptionClient.initialize();
    paymentClient.initialize();
    await subscriptionClient.waitForReady(timeout);
    connected.push(`core (${subscriptionClient.getAddress()})`);
  } catch (error) {
    logger.warn('Failed to connect to core gRPC service', { error: error.message });
    if (isProduction) {
      throw error;
    }
  }

  try {
    utilityGrpcClient.initialize();
    await utilityGrpcClient.waitForReady(timeout);
    connected.push(`utility (${utilityGrpcClient.getAddress()})`);
  } catch (error) {
    logger.warn('Failed to connect to utility gRPC service', { error: error.message });
    if (isProduction) {
      throw error;
    }
  }

  console.log(`Connected services: ${connected.length ? connected.join(', ') : 'none'}`);
  return connected;
}

module.exports = {
  initializeGrpcClients,
};

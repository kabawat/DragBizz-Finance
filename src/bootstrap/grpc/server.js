const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const SECRET = require('@src/config/env.config');
const controllers = require('@src/controllers/grpc/retailPayment.grpc.controller');
const logger = require('@src/utils/logger');

let server = null;

function createServerCredentials() {
  if (SECRET.ENVIRONMENT === 'production' && !SECRET.internalServiceSecret) {
    throw new Error('Finance gRPC requires internal authentication in production');
  }
  return grpc.ServerCredentials.createInsecure();
}

async function startGrpc() {
  if (server) throw new Error('Finance payment gRPC server already started');
  const config = SECRET.grpc.finance;
  const credentials = createServerCredentials();
  const protoDir = path.resolve(__dirname, '../../../proto/server/payment');
  const protoPath = path.join(protoDir, 'financePayment.proto');
  const definition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoDir],
  });
  const service = grpc.loadPackageDefinition(definition).financePayment.FinancePaymentService;
  server = new grpc.Server({
    'grpc.max_receive_message_length': 256 * 1024,
    'grpc.max_send_message_length': 256 * 1024,
    'grpc.max_concurrent_streams': 20,
  });
  server.addService(service.service, controllers);
  try {
    const port = await new Promise((resolve, reject) => server.bindAsync(
      `${config.host}:${config.port}`, credentials,
      (error, boundPort) => error ? reject(error) : resolve(boundPort),
    ));
    console.log(`gRPC server running (${config.host}:${port})`);
    logger.info(`Finance gRPC server listening on ${config.host}:${port}`);
    return { host: config.host, port };
  } catch (error) {
    server.forceShutdown();
    server = null;
    logger.error('Failed to start Finance gRPC server', { error: error.message });
    throw error;
  }
}

function stopGrpc() {
  if (!server) return Promise.resolve();
  const activeServer = server;
  server = null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      activeServer.forceShutdown();
      logger.warn('Finance gRPC server forced shutdown after timeout');
      resolve();
    }, 10000);
    timer.unref();
    activeServer.tryShutdown(() => {
      clearTimeout(timer);
      logger.info('Finance gRPC server stopped gracefully');
      resolve();
    });
  });
}

module.exports = {
  startGrpc,
  stopGrpc,
};

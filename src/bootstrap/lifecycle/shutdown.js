const logger = require('@src/utils/logger');
const { stopWorkers } = require('@src/workers');
const { stopGrpc } = require('@src/bootstrap/grpc/server');
const { disconnectRedis } = require('@config/redis.config');
const { closeDatabase } = require('@src/bootstrap/database');
const { stopHttp } = require('@src/bootstrap/http/server');

let shutdownTimeout = null;

async function gracefulShutdown(error = null) {
  if (shutdownTimeout) return;

  if (error) {
    logger.error('Error occurred triggering shutdown', { error: error.message, stack: error.stack });
  }

  try {
    logger.info('Initiating graceful shutdown (finance)...');

    shutdownTimeout = setTimeout(() => {
      logger.warn('Forced shutdown after timeout (finance)');
      process.exit(1);
    }, 10000);
    shutdownTimeout.unref();

    await stopWorkers();
    await stopGrpc();
    await disconnectRedis();
    await closeDatabase();
    await stopHttp();

    if (shutdownTimeout) clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown complete (finance)');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown (finance)', { error: err.message, stack: err.stack });
    if (shutdownTimeout) clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

module.exports = {
  gracefulShutdown,
};

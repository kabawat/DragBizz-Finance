const logger = require('@src/utils/logger');
const { gracefulShutdown } = require('./shutdown');

function registerProcessHandlers() {
  process.on('SIGINT', () => gracefulShutdown());
  process.on('SIGTERM', () => gracefulShutdown());

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    gracefulShutdown(error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    gracefulShutdown(reason);
  });
}

module.exports = {
  registerProcessHandlers,
};


const app = require('@src/app');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');

let httpServer = null;

function startHttp(options = {}) {
  const host = options.host || '0.0.0.0';
  const port = options.port || SECRET.server?.port || 4002;

  return new Promise((resolve, reject) => {
    try {
      httpServer = app.listen(port, host, () => {
        console.log(`HTTP server running (${host}:${port})`);
        logger.info(`HTTP server listening on ${host}:${port}`);
        resolve({ host, port, server: httpServer });
      });

      httpServer.on('error', (err) => {
        logger.error('HTTP server startup error', { error: err.message, stack: err.stack });
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

function stopHttp() {
  if (!httpServer) return Promise.resolve();
  return new Promise((resolve) => {
    httpServer.close((err) => {
      if (err) {
        logger.warn('Error closing HTTP server', { error: err.message });
      } else {
        logger.info('HTTP server closed successfully');
      }
      httpServer = null;
      resolve();
    });
  });
}

module.exports = {
  startHttp,
  stopHttp,
};

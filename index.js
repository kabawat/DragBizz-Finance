require('module-alias/register');
const server = require('@src/app');
const mongoose = require('mongoose');
const { connectDB } = require('@config/database.config');
const { connectRedis, disconnectRedis } = require('@config/redis.config');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');

async function startServer() {
  server?.listen(SECRET.server.port, async () => {
    try {
      await connectDB();
      logger.info('Database connected');
      await connectRedis();
      logger.info('Redis connected');
      
      const grpcServer = require('@src/lib/grpc/server');
      grpcServer.initialize();
    } catch (err) {
      logger.error('Connection error', { error: err.message, stack: err.stack });
      process.exit(1);
    }
    logger.info(`Subscription service running at http://localhost:${SECRET.server.port}/health`);
  });
}

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    const grpcServer = require('@src/lib/grpc/server');
    await grpcServer.shutdown();
    await disconnectRedis();
    logger.info('Redis disconnected');
    await mongoose.connection.close();
    logger.info('Database disconnected');
    
    server?.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

startServer().catch((e) => {
  logger.error('Error starting subscription service', { error: e.message, stack: e.stack });
  process.exit(1);
});


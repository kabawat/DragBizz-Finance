require('module-alias/register');
const server = require('@src/app');
const mongoose = require('mongoose');
const { connectDB } = require('@config/database.config');
const { connectRedis, disconnectRedis } = require('@config/redis.config');
const SECRET = require('@config/env.config');

async function startServer() {
  server?.listen(SECRET.server.port, async () => {
    try {
      await connectDB();
      console.log('Database connected');
      await connectRedis();
      console.log('Redis connected');
      
      // Start gRPC server
      const grpcServer = require('@src/lib/grpc/server');
      grpcServer.initialize();
    } catch (err) {
      console.error('Connection error:', err.message);
      process.exit(1);
    }
    console.log(`Subscription service running at http://localhost:${SECRET.server.port}/health`);
  });
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Shutdown gRPC server
    const grpcServer = require('@src/lib/grpc/server');
    await grpcServer.shutdown();
    
    // Close Redis connection
    await disconnectRedis();
    console.log('✅ Redis disconnected');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database disconnected');
    
    // Close server
    server?.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer().catch((e) => {
  console.error('Error starting subscription service:', e);
  process.exit(1);
});


const mongoose = require('mongoose');
const SECRET = require('@config/env.config');
const logger = require('@src/utils/logger');

const IS_PROD = SECRET.ENVIRONMENT === 'production';

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: IS_PROD ? 5000 : 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      readPreference: 'primary',
      directConnection: !IS_PROD,
      retryWrites: true,
      retryReads: true,
      bufferCommands: false,
      autoIndex: false,
      autoCreate: false,
    };

    await mongoose.connect(SECRET.mongo.uri, options);
    logger.info('MongoDB connected successfully (finance)');
  } catch (err) {
    logger.error('MongoDB connection error (finance)', { error: err?.message, stack: err?.stack });
    throw err;
  }
};

const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully (finance)');
  } catch (err) {
    logger.error('Error closing MongoDB connection (finance)', { error: err?.message });
    throw err;
  }
};

module.exports = {
  connectDB,
  closeDatabase,
};


require("dotenv").config();
const logger = require("@src/utils/logger");

const ENVIRONMENT = process.env.ENVIRONMENT || "development";

const SECRET = {
  ENVIRONMENT,
  server: {
    url: process.env.SERVER_URL,
    auth: process.env.SERVER_URL,
    port: process.env.PORT || 4002,
    allowedOrigins: process.env.ALLOWED_ORIGINS || (ENVIRONMENT === "production" ? "https://dragbizz.com" : "http://localhost:3000,https://test.dragbizz.com"),
  },
  mongo: {
    uri: ENVIRONMENT === 'production' ? process.env.MONGODB_URI : process.env.MONGODB_URI_DEV,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
  },
  jwt: {
    issuer: process.env.JWT_ISSUER || "DragBizz-auth",
    algorithm: process.env.ALGORITHM || "RS256",
    audience: process.env.AUDIENCE || "DRAGBIZZ",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    mode: process.env.RAZORPAY_MODE || 'test'
  },
  provider: {
    stripeSecret: process.env.STRIPE_SECRET,
    cashfreeAppId: process.env.CF_APP_ID,
    cashfreeSecret: process.env.CF_SECRET_KEY,
  },
  grpc: {
    port: process.env.GRPC_PORT || 50052,
    host: process.env.GRPC_HOST || '0.0.0.0',
    retailerHost: process.env.RETAILER_GRPC_HOST || '192.168.1.29',
    retailerPort: process.env.RETAILER_GRPC_PORT || 8001
  },

  // Internal service auth (Voice-AI → Subscription)
  ALLOWED_IPS: process.env.ALLOWED_IPS || "127.0.0.1,::1",
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || null,
};

if (!SECRET.mongo.uri) {
  logger.error("MONGODB_URI or MONGODB_URI_DEV must be set. Refusing to start.");
  process.exit(1);
}

if (!SECRET.redis.host) {
  logger.error("REDIS_HOST must be set. Refusing to start.");
  process.exit(1);
}

if (SECRET.razorpay.mode === 'live') {
  if (!SECRET.razorpay.keyId || !SECRET.razorpay.keySecret) {
    logger.error("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) must be set for live mode. Refusing to start.");
    process.exit(1);
  }
}

if (!SECRET.jwt.issuer) {
  logger.error("JWT_ISSUER must be set. Refusing to start.");
  process.exit(1);
}

module.exports = SECRET;


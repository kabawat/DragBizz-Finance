require("dotenv").config();
const logger = require("@src/utils/logger");

const ENVIRONMENT = process.env.ENVIRONMENT || "development";

function normalizeCashfreeEnv(value) {
  return normalizeProviderEnv(value);
}

function normalizeProviderEnv(value) {
  const env = String(value || 'sandbox').trim().toLowerCase();
  if (env === 'production' || env === 'live' || env === 'prod') return 'production';
  return 'sandbox';
}

function normalizeGatewayName(value) {
  return String(value || 'razorpay').trim().toLowerCase();
}

const corsOriginEnv = (process.env.CORS_ORIGIN || "").trim();
const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || "").trim();
const corsAllowAll = corsOriginEnv === "*" || allowedOriginsEnv === "*";
const defaultAllowedOrigins =
    ENVIRONMENT === "production"
        ? "https://dragbizz.io,https://www.dragbizz.io"
        : "http://localhost:3000,https://test.dragbizz.com";

const SECRET = {
  ENVIRONMENT,
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  },
  server: {
    url: process.env.SERVER_URL,
    port: process.env.PORT || 4002,
    hostname: (process.env.HOSTNAME || ".dragbizz.io").trim(),
    corsAllowAll: ENVIRONMENT === "development" ? true : corsAllowAll,
    allowedOrigins:
      ENVIRONMENT === "development"
        ? "*"
        : corsAllowAll
          ? ""
          : allowedOriginsEnv || corsOriginEnv || defaultAllowedOrigins,
  },
  mongo: {
    uri: ENVIRONMENT === 'production' ? process.env.MONGODB_URI : process.env.MONGODB_URI_DEV,
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || undefined,
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || undefined,
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
  payment: {
    gateway: normalizeGatewayName(process.env.PAYMENT_GATEWAY || 'razorpay')
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID?.trim?.() || process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim?.() || process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim?.() || process.env.RAZORPAY_WEBHOOK_SECRET,
    mode: process.env.RAZORPAY_MODE || 'test'
  },
  stripe: {
    secretKey: (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || '').trim(),
    publishableKey: (process.env.STRIPE_PUBLISHABLE_KEY || '').trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  },
  payu: {
    key: (process.env.PAYU_KEY || '').trim(),
    salt: (process.env.PAYU_SALT || '').trim(),
    environment: normalizeProviderEnv(process.env.PAYU_ENV),
    successUrl: (process.env.PAYU_SUCCESS_URL || '').trim(),
    failureUrl: (process.env.PAYU_FAILURE_URL || '').trim()
  },
  easebuzz: {
    key: (process.env.EASEBUZZ_KEY || '').trim(),
    salt: (process.env.EASEBUZZ_SALT || '').trim(),
    environment: normalizeProviderEnv(process.env.EASEBUZZ_ENV),
    successUrl: (process.env.EASEBUZZ_SUCCESS_URL || '').trim(),
    failureUrl: (process.env.EASEBUZZ_FAILURE_URL || '').trim()
  },
  cashfree: {
    clientId: (process.env.CASHFREE_CLIENT_ID || process.env.CF_APP_ID || '').trim(),
    clientSecret: (process.env.CASHFREE_CLIENT_SECRET || process.env.CF_SECRET_KEY || '').trim(),
    // sandbox | production. "test" and "live" are accepted aliases.
    environment: normalizeCashfreeEnv(process.env.CASHFREE_ENV || process.env.CF_ENV),
    apiVersion: (process.env.CASHFREE_API_VERSION || '2026-01-01').trim(),
    returnUrl: (process.env.CASHFREE_RETURN_URL || '').trim(),
    notifyUrl: (process.env.CASHFREE_NOTIFY_URL || '').trim(),
  },
  grpc: {
    // Core gRPC client
    retailerHost: process.env.RETAILER_GRPC_HOST || '192.168.1.29',
    retailerPort: process.env.RETAILER_GRPC_PORT || 5001,
    // Utility gRPC client
    utilityHost: process.env.UTILITY_GRPC_HOST || 'localhost',
    utilityPort: parseInt(process.env.UTILITY_GRPC_PORT) || 5003,
  },

  // Internal service auth
  voiceAiWhitelistIPs: (process.env.ALLOWED_IPS || "127.0.0.1,::1")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || null,

  // Invoice worker configuration
  invoice: {
    worker: {
      batchSize: parseInt(process.env.INVOICE_WORKER_BATCH_SIZE) || 5,
      concurrency: parseInt(process.env.INVOICE_WORKER_CONCURRENCY) || 3,
      pollIntervalMs: parseInt(process.env.INVOICE_WORKER_POLL_INTERVAL_MS) || 30000,
    },
  },
};

if (!SECRET.mongo.uri) {
  logger.error("MONGODB_URI or MONGODB_URI_DEV must be set. Refusing to start.");
  process.exit(1);
}

if (!SECRET.redis.host) {
  logger.error("REDIS_HOST must be set. Refusing to start.");
  process.exit(1);
}

const activeGateway = SECRET.payment.gateway;
if (activeGateway === 'razorpay' && SECRET.razorpay.mode === 'live') {
  if (!SECRET.razorpay.keyId || !SECRET.razorpay.keySecret) {
    logger.error("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) must be set for live mode. Refusing to start.");
    process.exit(1);
  }
}

if (activeGateway === 'cashfree' && SECRET.cashfree.environment === 'production') {
  if (!SECRET.cashfree.clientId || !SECRET.cashfree.clientSecret) {
    logger.error("Cashfree credentials (CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET) must be set when CASHFREE_ENV=production. Refusing to start.");
    process.exit(1);
  }
}

if (activeGateway === 'stripe' && ENVIRONMENT === 'production' && !SECRET.stripe.secretKey) {
  logger.error("STRIPE_SECRET_KEY must be set when PAYMENT_GATEWAY=stripe in production. Refusing to start.");
  process.exit(1);
}

if (activeGateway === 'payu' && SECRET.payu.environment === 'production' && (!SECRET.payu.key || !SECRET.payu.salt)) {
  logger.error("PAYU_KEY and PAYU_SALT must be set when PAYMENT_GATEWAY=payu in production. Refusing to start.");
  process.exit(1);
}

if (activeGateway === 'easebuzz' && SECRET.easebuzz.environment === 'production' && (!SECRET.easebuzz.key || !SECRET.easebuzz.salt)) {
  logger.error("EASEBUZZ_KEY and EASEBUZZ_SALT must be set when PAYMENT_GATEWAY=easebuzz in production. Refusing to start.");
  process.exit(1);
}

if (!SECRET.jwt.issuer) {
  logger.error("JWT_ISSUER must be set. Refusing to start.");
  process.exit(1);
}

module.exports = SECRET;


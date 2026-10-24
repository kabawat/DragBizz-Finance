require("dotenv").config();
const path = require("path");
const fs = require("fs");

// Use relative import for logger to avoid hard dependency on module-alias initialization order
let logger;
try {
  logger = require("../utils/logger");
} catch {
  logger = console;
}

const ENVIRONMENT = (process.env.ENVIRONMENT || "development").trim().toLowerCase();
const IS_PRODUCTION = ENVIRONMENT === "production";
const IS_DEVELOPMENT = ENVIRONMENT === "development";

function parseInteger(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function normalizeProviderEnv(value) {
  const env = String(value || "sandbox").trim().toLowerCase();
  if (env === "production" || env === "live" || env === "prod") return "production";
  return "sandbox";
}

function normalizeGatewayName(value) {
  return String(value || "razorpay").trim().toLowerCase();
}

// CORS origins configuration
const allowedOrigins = IS_DEVELOPMENT 
  ? "*"
  : (process.env.ALLOWED_ORIGINS || "").trim();

// Allowed IPs for internal service whitelisting
const allowedIps = (process.env.ALLOWED_IPS || "127.0.0.1,::1")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const SECRET = {
  ENVIRONMENT,

  logger: {
    level: process.env.LOG_LEVEL || "info",
  },

  server: {
    url: (process.env.SERVER_URL || "").trim(),
    port: parseInteger(process.env.PORT, 4002),
    hostname: (process.env.HOSTNAME || ".dragbizz.io").trim(),
    allowedOrigins,
    corsAllowAll: allowedOrigins === "*",
  },

  mongo: {
    uri: IS_PRODUCTION
      ? (process.env.MONGODB_URI || "").trim()
      : (process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || "").trim(),
    maxPoolSize: parseInteger(process.env.MONGO_MAX_POOL_SIZE, undefined),
    minPoolSize: parseInteger(process.env.MONGO_MIN_POOL_SIZE, undefined),
  },

  redis: {
    host: (process.env.REDIS_HOST || "localhost").trim(),
    port: parseInteger(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInteger(process.env.REDIS_DB, 0),
  },

  jwt: {
    issuer: process.env.JWT_ISSUER || "DragBizz-auth",
    algorithm: process.env.ALGORITHM || "RS256",
    audience: process.env.AUDIENCE || "DRAGBIZZ",
  },

  payment: {
    gateway: normalizeGatewayName(process.env.PAYMENT_GATEWAY || "razorpay"),
  },

  razorpay: {
    keyId: (process.env.RAZORPAY_KEY_ID || "").trim(),
    keySecret: (process.env.RAZORPAY_KEY_SECRET || "").trim(),
    webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim(),
    mode: String(process.env.RAZORPAY_MODE || "test").trim().toLowerCase(),
  },

  stripe: {
    secretKey: (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || "").trim(),
    publishableKey: (process.env.STRIPE_PUBLISHABLE_KEY || "").trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || "").trim(),
  },

  payu: {
    key: (process.env.PAYU_KEY || "").trim(),
    salt: (process.env.PAYU_SALT || "").trim(),
    environment: normalizeProviderEnv(process.env.PAYU_ENV),
    successUrl: (process.env.PAYU_SUCCESS_URL || "").trim(),
    failureUrl: (process.env.PAYU_FAILURE_URL || "").trim(),
  },

  easebuzz: {
    key: (process.env.EASEBUZZ_KEY || "").trim(),
    salt: (process.env.EASEBUZZ_SALT || "").trim(),
    environment: normalizeProviderEnv(process.env.EASEBUZZ_ENV),
    successUrl: (process.env.EASEBUZZ_SUCCESS_URL || "").trim(),
    failureUrl: (process.env.EASEBUZZ_FAILURE_URL || "").trim(),
  },

  cashfree: {
    clientId: (process.env.CASHFREE_CLIENT_ID || process.env.CF_APP_ID || "").trim(),
    clientSecret: (process.env.CASHFREE_CLIENT_SECRET || process.env.CF_SECRET_KEY || "").trim(),
    environment: normalizeProviderEnv(process.env.CASHFREE_ENV || process.env.CF_ENV),
    apiVersion: (process.env.CASHFREE_API_VERSION || "2026-01-01").trim(),
    returnUrl: (process.env.CASHFREE_RETURN_URL || "").trim(),
    notifyUrl: (process.env.CASHFREE_NOTIFY_URL || "").trim(),
  },

  grpc: {
    // Inbound finance payment gRPC server
    finance: {
      host: process.env.FINANCE_HOST || "0.0.0.0",
      port: parseInteger(process.env.FINANCE_PORT, 50056),
    },
    // Outbound Core/Retailer gRPC client
    retailer: {
      host: process.env.RETAILER_GRPC_HOST || "localhost",
      port: parseInteger(process.env.RETAILER_GRPC_PORT, 5001),
    },
    // Outbound Utility gRPC client
    utility: {
      host: process.env.UTILITY_GRPC_HOST || "localhost",
      port: parseInteger(process.env.UTILITY_GRPC_PORT, 5003),
    },
    // mTLS certificate paths (used in production)
    tls: {
      coreCaPath: process.env.CORE_PAYMENT_GRPC_CA_PATH || null,
      financeKeyPath: process.env.FINANCE_PAYMENT_GRPC_KEY_PATH || null,
      financeCertPath: process.env.FINANCE_PAYMENT_GRPC_CERT_PATH || null,
    },
  },

  // Internal service security
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || null,
  allowedIps,
  voiceAiWhitelistIPs: allowedIps, // Kept for backward compatibility

  // Background workers configuration
  invoice: {
    worker: {
      batchSize: parseInteger(process.env.INVOICE_WORKER_BATCH_SIZE, 5),
      concurrency: parseInteger(process.env.INVOICE_WORKER_CONCURRENCY, 3),
      pollIntervalMs: parseInteger(process.env.INVOICE_WORKER_POLL_INTERVAL_MS, 30000),
    },
  },
};

// Backward-compatibility aliases for gRPC endpoints
SECRET.grpc.retailerHost = SECRET.grpc.retailer.host;
SECRET.grpc.retailerPort = SECRET.grpc.retailer.port;
SECRET.grpc.utilityHost = SECRET.grpc.utility.host;
SECRET.grpc.utilityPort = SECRET.grpc.utility.port;

// ── Startup Configuration Validation ─────────────────────────────────────────

function validateConfig() {
  const missingVars = [];

  // 1. Critical server configuration
  if (!SECRET.server.url) {
    missingVars.push("SERVER_URL");
  } else if (IS_PRODUCTION && !/^https:\/\//i.test(SECRET.server.url)) {
    missingVars.push("SERVER_URL (must use https:// in production)");
  }

  // 2. Database configuration
  if (!SECRET.mongo.uri) {
    missingVars.push(IS_PRODUCTION ? "MONGODB_URI" : "MONGODB_URI_DEV");
  }

  if (!SECRET.redis.host) {
    missingVars.push("REDIS_HOST");
  }

  // 3. Authentication configuration
  if (!SECRET.jwt.issuer) {
    missingVars.push("JWT_ISSUER");
  }
  if (!SECRET.jwt.audience) {
    missingVars.push("AUDIENCE");
  }

  // 4. Production internal service authentication
  if (IS_PRODUCTION && !SECRET.internalServiceSecret) {
    missingVars.push("INTERNAL_SERVICE_SECRET (required for inter-service communication in production)");
  }

  // 5. Active payment gateway credentials validation
  const activeGateway = SECRET.payment.gateway;

  if (activeGateway === "razorpay") {
    const isLive = SECRET.razorpay.mode === "live" || IS_PRODUCTION;
    if (isLive && (!SECRET.razorpay.keyId || !SECRET.razorpay.keySecret)) {
      missingVars.push("RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET (required for Razorpay live/production)");
    }
  } else if (activeGateway === "cashfree") {
    const isProd = SECRET.cashfree.environment === "production" || IS_PRODUCTION;
    if (isProd && (!SECRET.cashfree.clientId || !SECRET.cashfree.clientSecret)) {
      missingVars.push("CASHFREE_CLIENT_ID & CASHFREE_CLIENT_SECRET (required for Cashfree production)");
    }
  } else if (activeGateway === "stripe") {
    if (IS_PRODUCTION && !SECRET.stripe.secretKey) {
      missingVars.push("STRIPE_SECRET_KEY (required for Stripe in production)");
    }
  } else if (activeGateway === "payu") {
    const isProd = SECRET.payu.environment === "production" || IS_PRODUCTION;
    if (isProd && (!SECRET.payu.key || !SECRET.payu.salt)) {
      missingVars.push("PAYU_KEY & PAYU_SALT (required for PayU production)");
    }
  } else if (activeGateway === "easebuzz") {
    const isProd = SECRET.easebuzz.environment === "production" || IS_PRODUCTION;
    if (isProd && (!SECRET.easebuzz.key || !SECRET.easebuzz.salt)) {
      missingVars.push("EASEBUZZ_KEY & EASEBUZZ_SALT (required for Easebuzz production)");
    }
  }

  // 6. Report any missing configuration and fail-fast with clean diagnostic
  if (missingVars.length > 0) {
    const errorDetails = missingVars.map((v) => `  - ${v}`).join("\n");
    const errorMessage = `[Config Error] Missing or invalid configuration in ${ENVIRONMENT} environment:\n${errorDetails}`;

    console.error(errorMessage);
    if (logger?.error && logger !== console) {
      logger.error(errorMessage);
    }
    process.exit(1);
  }
}

validateConfig();

module.exports = SECRET;

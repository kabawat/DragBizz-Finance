require("dotenv").config();

const ENVIRONMENT = process.env.ENVIRONMENT || "development";

const SECRET = {
  ENVIRONMENT,
  server: {
    url: process.env.SELF_SERVER_URL,
    auth: process.env.AUTH_SERVER_URL,
    port: process.env.PORT || 4002,
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
    audience: process.env.AUDIENCE || "SUBSCRIPTION",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    mode: process.env.RAZORPAY_MODE || 'test' // test or live
  },
  provider: {
    // placeholders for integration
    stripeSecret: process.env.STRIPE_SECRET,
    cashfreeAppId: process.env.CF_APP_ID,
    cashfreeSecret: process.env.CF_SECRET_KEY,
  }
};

module.exports = SECRET;


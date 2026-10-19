const mongoose = require("mongoose");
const SECRET = require("./env.config");
const logger = require("@src/utils/logger");

const IS_PROD = SECRET.ENVIRONMENT === "production";

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      readPreference: "primary",
      directConnection: !IS_PROD,
      serverSelectionTimeoutMS: IS_PROD ? 5000 : 15000,
      retryWrites: true,
      retryReads: true,
      bufferCommands: false,
      autoIndex: false,
      autoCreate: false
    };

    await mongoose.connect(SECRET.mongo.uri, options);
    logger.info("MongoDB connected successfully (finance)");
    await ensurePaymentGatewayIndexes();
  } catch (err) {
    logger.error("MongoDB connection error (finance)", { error: err?.message, stack: err?.stack });
    process.exit(1);
  }
};

async function ensurePaymentGatewayIndexes() {
  const collection = mongoose.connection.collection("payments");
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (err) {
    if (err?.codeName !== "NamespaceNotFound" && err?.code !== 26) {
      throw err;
    }
  }

  const legacyRazorpayIndex = indexes.find((idx) =>
    idx.name === "razorpayOrderId_1" && idx.unique && !idx.partialFilterExpression
  );
  if (legacyRazorpayIndex) {
    await collection.dropIndex("razorpayOrderId_1");
    logger.info("Replaced razorpayOrderId unique index with a partial index for multi-gateway payments");
  }

  await collection.createIndex(
    { gatewayOrderId: 1 },
    {
      name: "gatewayOrderId_partial_unique",
      unique: true,
      partialFilterExpression: { gatewayOrderId: { $type: "string" } },
    }
  );
  await collection.createIndex(
    { razorpayOrderId: 1 },
    {
      name: "razorpayOrderId_partial_unique",
      unique: true,
      partialFilterExpression: { razorpayOrderId: { $type: "string" } },
    }
  );
  await collection.createIndex(
    { cashfreeOrderId: 1 },
    {
      name: "cashfreeOrderId_partial_unique",
      unique: true,
      partialFilterExpression: { cashfreeOrderId: { $type: "string" } },
    }
  );
}

module.exports = { connectDB };


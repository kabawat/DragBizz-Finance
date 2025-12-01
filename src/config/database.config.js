const mongoose = require("mongoose");
const SECRET = require("./env.config");

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      bufferCommands: false,
      autoIndex: false,
      autoCreate: false
    };

    await mongoose.connect(SECRET.mongo.uri, options);
    console.log("✅ MongoDB connected successfully (subscription)");
  } catch (err) {
    console.log("❌ MongoDB connection error (subscription):", err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };


const mongoose = require("mongoose");
const SECRET = require("./env.config");

const connectDB = async () => {
  try {
    await mongoose.connect(SECRET.mongo.uri, {});
    console.log("✅ MongoDB connected successfully (subscription)");
  } catch (err) {
    console.error("❌ MongoDB connection error (subscription):", err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };


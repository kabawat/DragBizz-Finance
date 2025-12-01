// src/config/redis.config.js
const { createClient } = require("redis");
const SECRET = require("./env.config");

// Redis config
const redisConfig = {
    host: SECRET?.redis?.host || "127.0.0.1",
    port: SECRET?.redis?.port || 6379,
    password: SECRET?.redis?.password || undefined,
    db: SECRET?.redis?.db || 0,
};

// Redis v4 client instance
const redisClient = createClient({
    socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: (retries) => {
            const delay = Math.min(retries * 200, 30000);
            console.warn(`🔄 Redis reconnect attempt #${retries}, retrying in ${delay}ms`);
            return delay;
        },
        keepAlive: 5000,
    },
    password: redisConfig.password,
    database: redisConfig.db,
    name: "subscription-redis-client",
    pingInterval: 10000,
    disableOfflineQueue: false,
    maxRetriesPerRequest: null,
});

// Connection events
redisClient.on("connect", () => console.log("🟢 Redis socket connected"));
redisClient.on("ready", () => console.log("✅ Redis client ready"));
redisClient.on("reconnecting", () => console.warn("🔄 Redis reconnecting..."));
redisClient.on("end", () => console.warn("⚠️ Redis connection closed"));
redisClient.on("error", (err) => {
    console.log("🔴 Redis connection error:", err.message);
});

// Connect Redis
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log("🚀 Redis connection established");
        }
    } catch (error) {
        console.log("❌ Redis connection failed:", error.message);
        setTimeout(() => {
            console.log("🔄 Retrying Redis connection...");
            connectRedis();
        }, 5000);
    }
};

// Graceful shutdown
const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log("👋 Redis disconnected gracefully");
        }
    } catch (error) {
        console.log("⚠️ Redis disconnect error:", error.message);
    }
};

module.exports = {
    redisClient,
    connectRedis,
    disconnectRedis,
    redisConfig,
};


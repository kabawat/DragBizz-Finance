const { redisClient } = require("@config/redis.config");
const logger = require("@src/utils/logger");

const DEFAULT_TTL = 600; // 10 minutes

// Set cache with TTL (seconds)
async function setCache(key, value, ttl = DEFAULT_TTL) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return false;
        }
        const serialized = JSON.stringify(value);
        await redisClient.set(key, serialized, { EX: ttl });
        return true;
    } catch (error) {
        logger.error('[Cache] setCache error', { key, error: error?.message });
        return false;
    }
}

// Get cached value by key
async function getCache(key) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return null;
        }
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error('[Cache] getCache error', { key, error: error?.message });
        return null;
    }
}

module.exports = {
    setCache,
    getCache,
};

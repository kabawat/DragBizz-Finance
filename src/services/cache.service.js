const { redisClient } = require("@config/redis.config");

// Cache Service for Subscription Service - Simplified version for token verification and general caching

const DEFAULT_TTL = 600; // 10 minutes (max allowed)

// Set cache with TTL
async function setCache(key, value, ttl = DEFAULT_TTL) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping cache set');
            return false;
        }
        
        const serializedValue = JSON.stringify(value);
        await redisClient.set(key, serializedValue, { EX: ttl });
        
        return true;
    } catch (error) {
        console.error('Cache set error:', error);
        return false;
    }
}

// Get cache by key
async function getCache(key) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping cache get');
            return null;
        }
        
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

// Delete cache by key
async function deleteCache(key) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping cache delete');
            return false;
        }
        
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error('Cache delete error:', error);
        return false;
    }
}

// Batch get multiple keys - Performance optimization
async function getBatchCache(keys) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping batch cache get');
            return {};
        }
        
        if (!Array.isArray(keys) || keys.length === 0) return {};
        
        const pipeline = redisClient.multi();
        keys.forEach(key => pipeline.get(key));
        
        const results = await pipeline.exec();
        const data = {};
        
        keys.forEach((key, index) => {
            if (results[index] && results[index][1]) {
                try {
                    data[key] = JSON.parse(results[index][1]);
                } catch (e) {
                    data[key] = results[index][1];
                }
            }
        });
        
        return data;
    } catch (error) {
        console.error('Batch cache get error:', error);
        return {};
    }
}

// Batch set multiple keys - Performance optimization
async function setBatchCache(keyValuePairs, ttl = DEFAULT_TTL) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping batch cache set');
            return false;
        }
        
        if (!Array.isArray(keyValuePairs) || keyValuePairs.length === 0) return false;
        
        const pipeline = redisClient.multi();
        
        keyValuePairs.forEach(({ key, value }) => {
            const serializedValue = JSON.stringify(value);
            pipeline.set(key, serializedValue, { EX: ttl });
        });
        
        await pipeline.exec();
        return true;
    } catch (error) {
        console.error('Batch cache set error:', error);
        return false;
    }
}

// Delete multiple keys - Performance optimization
async function deleteBatchCache(keys) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping batch cache delete');
            return false;
        }
        
        if (!Array.isArray(keys) || keys.length === 0) return false;
        
        const pipeline = redisClient.multi();
        keys.forEach(key => pipeline.del(key));
        
        await pipeline.exec();
        return true;
    } catch (error) {
        console.error('Batch cache delete error:', error);
        return false;
    }
}

// Set expiry for an existing key
async function expireCache(key, ttl) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping cache expire');
            return 0;
        }
        
        return await redisClient.expire(key, ttl); // returns 0 or 1
    } catch (error) {
        console.error('Cache expire error:', error);
        return 0;
    }
}

// Increment with atomic operations
async function incrCache(key, step = 1) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping cache increment');
            return 0;
        }
        
        if (step === 1) {
            return await redisClient.incr(key);
        } else {
            return await redisClient.incrBy(key, step);
        }
    } catch (error) {
        console.error('Cache increment error:', error);
        return 0;
    }
}

// Decrement with atomic operations
async function decrCache(key, step = 1) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.warn('Redis client not connected, skipping cache decrement');
            return 0;
        }
        
        if (step === 1) {
            return await redisClient.decr(key);
        } else {
            return await redisClient.decrBy(key, step);
        }
    } catch (error) {
        console.error('Cache decrement error:', error);
        return 0;
    }
}

module.exports = {
    setCache,
    getCache,
    deleteCache,
    expireCache,
    incrCache,
    decrCache,
    getBatchCache,
    setBatchCache,
    deleteBatchCache,
};

